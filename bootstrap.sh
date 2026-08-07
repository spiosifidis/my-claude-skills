#!/usr/bin/env bash
# Bootstrap this machine with all skills from spiosifidis/my-claude-skills.
#
# Usage (run on any new or existing machine):
#   curl -fsSL https://raw.githubusercontent.com/spiosifidis/my-claude-skills/main/bootstrap.sh | bash
# or, from a local clone:
#   ./bootstrap.sh
#
# Idempotent: safe to re-run any time; re-running also picks up new/updated skills.
set -euo pipefail

REPO="spiosifidis/my-claude-skills"

if ! command -v npx >/dev/null 2>&1; then
  echo "error: npx not found — install Node.js first (https://nodejs.org)" >&2
  exit 1
fi

echo "==> Installing all skills from ${REPO} into user scope (~/.claude/skills)..."
npx --yes skills add "${REPO}" -s '*' -g -y

echo "==> Updating any previously installed global skills..."
npx --yes skills update -g -y || true

# Make skill invocation reliable: a one-line nudge in the global CLAUDE.md so
# every session checks installed skills before answering. Guarded so re-runs
# never duplicate it.
CLAUDE_MD="${HOME}/.claude/CLAUDE.md"
MARKER="<!-- my-claude-skills:invoke-skills -->"
if ! grep -qF "${MARKER}" "${CLAUDE_MD}" 2>/dev/null; then
  mkdir -p "${HOME}/.claude"
  {
    echo ""
    echo "${MARKER}"
    echo "Before responding to any request, check whether an installed skill in ~/.claude/skills applies (see the using-superpowers skill). If one plausibly applies, invoke it with the Skill tool before doing anything else."
  } >> "${CLAUDE_MD}"
  echo "==> Added skill-invocation reminder to ${CLAUDE_MD}"
else
  echo "==> Skill-invocation reminder already present in ${CLAUDE_MD}"
fi

# Keep this machine in sync automatically: a weekly cron that re-runs the
# global skills update (Mondays 09:00 local). Guarded so re-runs never add
# duplicate entries. Skipped quietly where cron isn't available (e.g. Windows).
NPX_BIN="$(command -v npx)"
if command -v crontab >/dev/null 2>&1; then
  CRON_TAG="# my-claude-skills-auto-update"
  if ! crontab -l 2>/dev/null | grep -qF "${CRON_TAG}"; then
    (crontab -l 2>/dev/null; echo "0 9 * * 1 ${NPX_BIN} --yes skills update -g -y >/dev/null 2>&1 ${CRON_TAG}") | crontab -
    echo "==> Added weekly auto-update cron (Mondays 09:00)"
  else
    echo "==> Weekly auto-update cron already present"
  fi
else
  echo "==> crontab not available — skipping auto-update schedule (re-run this script to update manually)"
fi

echo ""
echo "Done. $(ls -1 "${HOME}/.claude/skills" 2>/dev/null | wc -l | tr -d ' ') entries now in ~/.claude/skills."
echo "New skills are picked up the next time you start a Claude Code session."
