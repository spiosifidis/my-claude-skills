---
name: claude-doctor
description: Health-check this machine's Claude setup — skills installed and synced, broken skill symlinks, permission problems, stale auto-updates, local-only skills not backed up, missing external CLIs (playwright-cli, codex), and conversation-sync status. Use when the user asks whether everything is working, to check/verify/audit their Claude or skills setup, why a skill isn't loading or triggering, or to run the doctor.
---

# Claude doctor

Runs a scripted health check of this machine's Claude setup and turns the
findings into fixes. The same script also runs automatically once a week on
machines set up via this repo's `bootstrap.sh` (cron Monday 09:30 plus a
shell-startup catch-up), notifying via macOS notification only when something
is wrong.

## Procedure

1. Run the check:
   ```bash
   bash ~/.claude/skills/claude-doctor/scripts/doctor.sh
   ```
   (From this repo checkout: `bash claude-doctor/scripts/doctor.sh`.)

2. Read the report it prints (also saved to `~/.claude/doctor-report.txt`).
   Every FAIL/WARN line includes its own fix command — relay or run those,
   don't invent alternatives. Meanings:
   - **FAIL** — something is broken right now (skills missing, broken
     symlinks, unwritable `~/.claude`/`~/.agents`, missing CLAUDE.md
     reminder, missing updater). Fix before anything else.
   - **WARN** — works today but will bite later: local-only skills not
     backed up to the repo, sync more than 8 days stale, a skill's external
     CLI missing.
   - **info** — context, not a problem (conversation-sync facts, local
     session counts).

3. For the "local-only skills NOT backed up" warning specifically: offer to
   copy each named skill into the `spiosifidis/my-claude-skills` repo so the
   sync manages it everywhere and it can never be lost. That warning is how
   hand-made skills stop disappearing.

4. Exit code: `0` = no FAILs (warnings may still exist — read the report),
   `1` = at least one FAIL.

## What it deliberately does NOT do

- It never modifies anything except its own report/stamp files — all fixes
  are explicit commands for the user (or you) to run.
- It does not check conversation content. Chat/Cowork/cloud-Code
  conversations sync via the Claude account; local terminal sessions are
  machine-local by design (Remote Control is the way to reach them
  remotely). The doctor reports this rather than pretending to fix it.
