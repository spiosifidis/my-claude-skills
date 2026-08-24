#!/usr/bin/env bash
# Claude doctor — one machine's answer to "does everything still work?"
#
# Checks the health of this machine's Claude setup: skills installed and
# synced, the failure modes that have actually happened (broken skill
# symlinks, root-owned ~/.agents, stale sync), local-only skills that are
# not backed up to the repo, and external CLIs some skills depend on.
#
# Usage:
#   doctor.sh            run now, print the full report
#   doctor.sh --auto     for cron/shell hooks: at most one run per 7 days,
#                        silent unless problems are found (then a macOS
#                        notification points at the report file)
#
# Read-only apart from its own report/stamp files in ~/.claude.
set -u

REPO="spiosifidis/my-claude-skills"
SKILLS_DIR="${HOME}/.claude/skills"
AGENTS_DIR="${HOME}/.agents"
REPORT="${HOME}/.claude/doctor-report.txt"
STAMP="${HOME}/.claude/.doctor-last-run"
PASS=0; WARN=0; FAIL=0
QUIET=0

if [ "${1:-}" = "--auto" ]; then
  QUIET=1
  NOW=$(date +%s)
  LAST=$(cat "${STAMP}" 2>/dev/null || echo 0)
  [ $((NOW - LAST)) -lt 604800 ] && exit 0
fi

mkdir -p "${HOME}/.claude"
: > "${REPORT}"
log()  { printf '%s\n' "$1" >> "${REPORT}"; [ "${QUIET}" -eq 0 ] && printf '%s\n' "$1"; return 0; }
pass() { PASS=$((PASS+1)); log "  ok    $1"; }
warn() { WARN=$((WARN+1)); log "  WARN  $1"; }
fail() { FAIL=$((FAIL+1)); log "  FAIL  $1"; }

log "Claude doctor — $(date '+%Y-%m-%d %H:%M') on $(hostname -s 2>/dev/null || hostname)"

log ""
log "[1/6] Skills installation"
if ! command -v npx >/dev/null 2>&1; then
  fail "npx not found — install Node.js (https://nodejs.org); skills cannot sync without it"
fi
if [ -d "${SKILLS_DIR}" ] && [ -n "$(ls -A "${SKILLS_DIR}" 2>/dev/null)" ]; then
  pass "$(ls -1 "${SKILLS_DIR}" | wc -l | tr -d ' ') skills present in ~/.claude/skills"
else
  fail "no skills in ~/.claude/skills — re-run bootstrap: curl -fsSL https://raw.githubusercontent.com/${REPO}/main/bootstrap.sh | bash"
fi

# Broken symlinks: the skill exists in the list but silently never loads
# (this is exactly how using-superpowers failed on the iMac).
BROKEN=$(find -L "${SKILLS_DIR}" -maxdepth 1 -type l 2>/dev/null)
if [ -n "${BROKEN}" ]; then
  fail "broken skill symlinks (these skills silently never load):"
  printf '%s\n' "${BROKEN}" | while IFS= read -r l; do log "          ${l}"; done
  log "          fix: re-run bootstrap, or: npx skills add ${REPO} -s '*' -g -y"
else
  pass "no broken skill symlinks"
fi

# Local-only skills: a real directory (not a symlink into ~/.agents) means
# the sync does not manage it — and the repo does not back it up. This is
# how hand-made skills get lost when a machine dies or a sync misbehaves.
LOCAL_ONLY=""
for d in "${SKILLS_DIR}"/*/; do
  [ -d "${d}" ] || continue
  dd="${d%/}"
  [ -L "${dd}" ] && continue
  LOCAL_ONLY="${LOCAL_ONLY}${dd##*/} "
done
if [ -n "${LOCAL_ONLY}" ]; then
  warn "local-only skills NOT backed up to ${REPO}: ${LOCAL_ONLY}"
  log "          copy each into the repo so no sync or dead disk can lose them"
else
  pass "every installed skill is managed by the repo sync (backed up)"
fi

log ""
log "[2/6] Permissions"
PERM_BAD=0
for d in "${HOME}/.claude" "${AGENTS_DIR}"; do
  if [ -d "${d}" ] && [ ! -w "${d}" ]; then
    PERM_BAD=1
    fail "${d} is not writable by $(whoami) — fix: sudo chown -R \"\$(whoami)\" \"${d}\""
  fi
done
[ "${PERM_BAD}" -eq 0 ] && pass "~/.claude and ~/.agents writable (root-ownership bug not present)"

log ""
log "[3/6] Skill-invocation reminder"
MARKER="<!-- my-claude-skills:invoke-skills -->"
if grep -qF "${MARKER}" "${HOME}/.claude/CLAUDE.md" 2>/dev/null; then
  pass "reminder present in ~/.claude/CLAUDE.md"
else
  fail "reminder missing from ~/.claude/CLAUDE.md — sessions will not reliably check skills; re-run bootstrap"
fi

log ""
log "[4/6] Auto-update health"
UPDATER="${HOME}/.claude/skills-auto-update.sh"
if [ -x "${UPDATER}" ]; then
  pass "updater installed"
else
  fail "updater missing at ${UPDATER} — re-run bootstrap"
fi
LAST_UP=$(cat "${HOME}/.claude/.skills-last-update" 2>/dev/null || echo 0)
if [ "${LAST_UP}" -gt 0 ] 2>/dev/null; then
  AGE_D=$(( ( $(date +%s) - LAST_UP ) / 86400 ))
  if [ "${AGE_D}" -le 8 ]; then
    pass "last skills sync ${AGE_D} day(s) ago"
  else
    warn "last skills sync ${AGE_D} days ago — run: ${UPDATER} --force"
  fi
else
  warn "skills have never auto-synced on this machine — run: ${UPDATER} --force"
fi
REMOTE_SHA=$(git ls-remote "https://github.com/${REPO}" main 2>/dev/null | cut -f1)
LOCAL_SHA=$(cat "${HOME}/.claude/.skills-last-sha" 2>/dev/null || echo "")
if [ -z "${REMOTE_SHA}" ]; then
  warn "could not reach github.com/${REPO} — offline, or repo unreachable"
elif [ "${REMOTE_SHA}" = "${LOCAL_SHA}" ]; then
  pass "skills are in sync with the repo's latest main"
else
  warn "repo has newer skills than this machine — updater will catch up, or run: ${UPDATER} --force"
fi

log ""
log "[5/6] External CLIs some skills depend on"
if [ -e "${SKILLS_DIR}/playwright-cli" ]; then
  if command -v playwright-cli >/dev/null 2>&1; then
    pass "playwright-cli binary installed ($(playwright-cli --version 2>/dev/null | head -1))"
  else
    warn "playwright-cli skill installed but the CLI is missing — run: npm install -g @playwright/cli@latest"
  fi
fi
if [ -e "${SKILLS_DIR}/route" ]; then
  if command -v codex >/dev/null 2>&1; then
    pass "codex CLI installed (route skill has a working backend)"
  else
    warn "route skill installed but no codex CLI — run: npm install -g @openai/codex && codex login (or install the codex plugin)"
  fi
fi

log ""
log "[6/6] Conversations"
log "  info  Chat / Cowork / cloud Code (claude.ai/code) conversations sync via"
log "        your Claude account — visible on every machine, nothing to check here."
N_PROJ=$(ls -1 "${HOME}/.claude/projects" 2>/dev/null | wc -l | tr -d ' ')
log "  info  local terminal sessions on THIS machine: ${N_PROJ} project folder(s) in"
log "        ~/.claude/projects — these never leave this Mac. To reach them from"
log "        another device, run 'claude remote-control' here while the Mac is awake."

log ""
log "Result: ${PASS} ok, ${WARN} warnings, ${FAIL} problems. Full report: ${REPORT}"

date +%s > "${STAMP}"

# In --auto mode nobody is watching stdout — surface problems as a macOS
# notification instead (best-effort; silently skipped off-macOS or if blocked).
if [ $((FAIL + WARN)) -gt 0 ] && command -v osascript >/dev/null 2>&1; then
  osascript -e "display notification \"${FAIL} problems, ${WARN} warnings — open ~/.claude/doctor-report.txt\" with title \"Claude doctor\"" >/dev/null 2>&1 || true
fi

[ "${FAIL}" -eq 0 ]
