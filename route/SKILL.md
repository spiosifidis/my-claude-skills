---
name: route
description: Delegate a substantial coding task to Codex (OpenAI's coding agent, e.g. GPT-5.x-Codex / "spark") as a background worker while you keep working. Use when the user asks to route, delegate, hand off, or offload work to Codex/ChatGPT, or when a task is large/open-ended enough that a second agent working in parallel helps. Always runs the worker in the background with a bounded check-in loop — never blocks the session indefinitely.
---

# Route — delegate to Codex as a background worker

You are the administrator: you scope the task, launch the worker, check in on a bounded schedule, and report back. Codex is the worker: it does the actual investigation/implementation, out of process, on its own turn.

## Why background-only — read this before invoking anything

The underlying delegation mechanism (the `openai/codex-plugin-cc` Claude Code plugin's `codex-companion.mjs task` command) has a confirmed bug in its **foreground** path: `codex-companion.mjs` → `runTrackedJob` → `codex.mjs`'s `await state.completion` has **no timeout anywhere in that call chain**. If Codex's app-server ever drops a completion notification for a nested turn (network hiccup, a stalled call to OpenAI, a lost subagent-turn event), that `await` blocks forever with no recovery — and because it runs in the foreground, it hangs your entire session, not just the delegated task.

The plugin's own `codex-rescue` subagent defaults to this unbounded foreground path for anything it judges "small, clearly bounded." Do not trust that judgment call. **This skill only ever uses `--background`.** The background path writes progress to a job file you poll yourself, so a stall is visible and recoverable instead of an invisible hang.

## Prerequisites

- The `openai/codex-plugin-cc` plugin installed: `/plugin marketplace add openai/codex-plugin-cc` then `/plugin install codex@openai-codex`.
- Codex authenticated (ChatGPT login or an OpenAI API key). If unsure, run `/codex:setup` first — do not guess or retry blindly if it reports Codex missing/unauthenticated.

## Procedure

1. **Locate the companion script** (its path varies by how the plugin was installed — don't hardcode it):
   ```bash
   find ~/.claude ~/.config -maxdepth 8 -iname "codex-companion.mjs" 2>/dev/null | head -1
   ```
   If nothing is found, stop and tell the user to run `/codex:setup` — do not fabricate a path.

2. **Scope the task before launching.** The worker starts with no memory of this conversation. Write a self-contained prompt: the goal, the relevant files/context, and what "done" looks like. Vague prompts produce vague results and waste a full round-trip.

3. **Launch in the background, always:**
   ```bash
   node "<companion-script-path>" task --background --write "<self-contained prompt>"
   ```
   - Drop `--write` for read-only investigation/diagnosis only — keep it for anything that should actually change files.
   - Add `--model gpt-5.3-codex-spark` if the user asks for the fast/"spark" variant; otherwise leave `--model` unset and let Codex use its default.
   - This returns immediately with a `jobId`. It does not block — if it appears to hang here, that itself is the bug above; kill it and fall back to reporting the problem rather than waiting.

4. **Poll on a bounded schedule you control — do not chain an unbounded `--wait`:**
   ```bash
   node "<companion-script-path>" status <jobId> --json
   ```
   Check every 15-30s. Set a total ceiling appropriate to the task (default 10 minutes for routine delegation; only go longer if the user explicitly expects a long-running job, and say so upfront).

5. **If the ceiling is reached before completion:** stop polling. Tell the user the job is still running in the background as `<jobId>`, and give them the exact follow-up commands: `/codex:status <jobId>` to check progress, `/codex:result <jobId>` to fetch the result once done, `/codex:cancel <jobId>` to abort. Never let this turn block indefinitely on someone else's process.

6. **On completion**, fetch and present the result:
   ```bash
   node "<companion-script-path>" result <jobId>
   ```
   Return Codex's output substantively — don't paraphrase away specifics like file paths, error messages, or exact diffs.

## Failure modes

- **Codex missing or unauthenticated** → tell the user to run `/codex:setup`. Do not retry silently or attempt a workaround.
- **Job status is `failed`** → surface the stored error message verbatim so the user can act on it, not a summary that drops the detail.
- **You catch yourself about to invoke the `codex-rescue` subagent directly, or add `--wait` to a foreground `task` call** → stop. That's the unbounded path this skill exists to avoid. Use the background-and-poll procedure above instead, every time, even for tasks that feel small.
