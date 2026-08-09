---
name: route
description: Delegate a substantial coding task to Codex (OpenAI's coding agent, e.g. GPT-5.x-Codex / "spark") as a background worker while you keep working. Use when the user asks to route, delegate, hand off, or offload work to Codex/ChatGPT, or when a task is large/open-ended enough that a second agent working in parallel helps. Always runs the worker in the background with a bounded check-in loop — never blocks the session indefinitely.
---

# Route — delegate to Codex as a background worker

You are the administrator: you scope the task, launch the worker, review what comes back, and decide whether to iterate. Codex is the worker: it does the actual investigation/implementation, out of process, on its own turn.

## Why this skill exists — the hang bugs it guards against

The underlying plugin (`openai/codex-plugin-cc`) has a confirmed bug in its **foreground** task path: `codex-companion.mjs` → `runTrackedJob` → `codex.mjs`'s `await state.completion` has **no timeout anywhere in that call chain**. A dropped completion notification (network hiccup, stalled OpenAI call, lost subagent-turn event) blocks that await forever and hangs the entire session. The plugin's own `codex-rescue` subagent defaults to that path — never invoke it directly, and never add `--wait` to a foreground `task` call.

This skill's bundled wrapper, `scripts/route.mjs`, encodes the safe discipline so it can't be improvised wrong: background-only launches, stdin closed on every call, a 60s hard timeout on every companion invocation, and a bounded watch loop that reports "still running" instead of blocking.

## Prerequisites

- The `openai/codex-plugin-cc` plugin installed: `/plugin marketplace add openai/codex-plugin-cc` then `/plugin install codex@openai-codex`.
- Codex authenticated (ChatGPT login or an OpenAI API key). If the wrapper reports the companion script missing, run `/codex:setup` — do not guess paths or retry blindly.

## Procedure

All commands run from this skill's directory (`scripts/route.mjs` resolves the plugin's companion script automatically; set `ROUTE_COMPANION=/path/to/codex-companion.mjs` only if auto-discovery fails).

1. **Scope the task first.** The worker starts with no memory of this conversation. Write a self-contained prompt: the goal, the relevant files/paths, constraints, and what "done" looks like. For long prompts, write them to a file and pass `--prompt-file` — never rely on shell substitution of large strings into arguments.

2. **Launch and watch in one bounded step:**
   ```bash
   node scripts/route.mjs run --ceiling-s 600 "<self-contained prompt>"
   ```
   - Writes are enabled by default; add `--read-only` for pure investigation/diagnosis.
   - `--model spark` maps to `gpt-5.3-codex-spark` (the fast variant); otherwise leave model unset.
   - `--effort <none|minimal|low|medium|high|xhigh>` only when the user explicitly asks.
   - `--ceiling-s` defaults to 600 (10 min). Raise it only for jobs the user expects to run long — and say so upfront.
   - Or split the phases: `launch` returns a `jobId` immediately so you can do other work, then `watch <jobId>` later.

3. **Interpret the exit code — each one has a defined next step:**
   - `0` — worker finished; stdout is the result. Present it substantively (keep file paths, error messages, diffs — don't paraphrase them away).
   - `1` — job failed or was cancelled; stdout carries the stored error verbatim. Surface it as-is.
   - `3` — ceiling reached, job **still running in the background**. Not an error. Relay the printed follow-up commands to the user (`/codex:status`, `/codex:result`, `/codex:cancel` with the jobId) or keep working on something else and re-run `watch <jobId>` later.
   - `2` — setup/usage problem (companion not found, no prompt). Fix the stated cause; if Codex is missing or unauthenticated, tell the user to run `/codex:setup`.

## Administrator review loop

Delegation isn't fire-and-forget — review the worker's output before accepting it:

1. When a run completes, **verify the claims**: if it says it changed files, look at the diff (`git diff`/`git status`); if it says tests pass, run them yourself. Codex's summary is a report, not proof.
2. If the result is incomplete or off-target, **iterate on the same thread** rather than starting over — the worker keeps its context:
   ```bash
   node scripts/route.mjs run --resume --ceiling-s 600 "<specific follow-up: what's wrong, what to do next>"
   ```
3. Bound the loop: **at most 3 rounds** unless the user asks for more. If it's not converging by then, stop delegating and either do the work directly or bring the findings back to the user.
4. Only start a fresh thread (omit `--resume`) when the follow-up is genuinely a different task.

## If anything ever calls `codex exec` directly

This skill's path never does — the companion talks JSON-RPC to a persistent `codex app-server`, immune to the bug below. But delegated tasks or ad-hoc commands sometimes shell out to `codex exec`, and this bites hard: if argument passing breaks (typically shell-quoting a long prompt via `"$(cat file)"`), `codex exec` doesn't error — it silently drops into interactive mode (`Reading additional input from stdin...`) and waits forever for keyboard input that never comes. Backgrounded, that's invisible for however long you let it sit.

Rule, no exceptions: **always close stdin on `codex exec`** —
```bash
codex exec "<prompt>" < /dev/null
```
A broken argument pass then fails fast with a clear error instead of hanging. (The wrapper already does the equivalent for every companion call.)
