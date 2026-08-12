#!/usr/bin/env node
// Hardened wrapper for delegating tasks to Codex as a background worker.
//
// Two backends, auto-selected:
//   1. companion — the openai/codex-plugin-cc plugin's codex-companion.mjs
//      (preferred when installed): background jobs via `task --background`,
//      status/result/cancel via the plugin's job store.
//   2. exec — the bare `codex` CLI (fallback when the plugin is absent):
//      `codex exec` spawned detached with stdin from /dev/null (a broken
//      argument pass then fails fast instead of silently waiting on stdin —
//      see SKILL.md), output captured to a log file, job tracked in
//      ~/.claude/route-jobs/.
//
// Both encode the same discipline so it can't be improvised wrong:
// background-only launches, stdin closed everywhere, a hard timeout on every
// synchronous call, and a bounded watch loop that reports "still running"
// instead of blocking.
//
// Usage:
//   route.mjs launch [--read-only] [--model <m>] [--effort <e>] [--resume] <prompt...>
//   route.mjs watch  <jobId> [--ceiling-s 600] [--interval-s 20]
//   route.mjs run    [launch flags] [--ceiling-s 600] <prompt...>   (launch + watch)
//   route.mjs status [jobId] | result [jobId] | cancel <jobId>
//
// Exit codes: 0 success · 1 job failed/cancelled · 2 usage/setup error ·
//             3 ceiling reached, job still running (not an error)

import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PER_CALL_TIMEOUT_MS = 60_000;
const DEFAULT_CEILING_S = 600;
const DEFAULT_INTERVAL_S = 20;
const EXEC_JOBS_DIR = path.join(os.homedir(), ".claude", "route-jobs");
const EXEC_DONE_SENTINEL = "__ROUTE_EXEC_DONE__";

function fail(message, code = 2) {
  process.stderr.write(`route: ${message}\n`);
  process.exit(code);
}

// ---------------------------------------------------------------------------
// Backend resolution
// ---------------------------------------------------------------------------

function findCompanionScript() {
  if (process.env.ROUTE_COMPANION) {
    if (fs.existsSync(process.env.ROUTE_COMPANION)) return process.env.ROUTE_COMPANION;
    fail(`ROUTE_COMPANION points to a missing file: ${process.env.ROUTE_COMPANION}`);
  }
  const roots = [
    path.join(os.homedir(), ".claude"),
    path.join(os.homedir(), ".config", "claude"),
  ];
  const target = "codex-companion.mjs";
  const queue = roots.filter((r) => fs.existsSync(r)).map((dir) => ({ dir, depth: 0 }));
  while (queue.length) {
    const { dir, depth } = queue.shift();
    if (depth > 8) continue;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name.startsWith(".git")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isFile() && entry.name === target) return full;
      if (entry.isDirectory()) queue.push({ dir: full, depth: depth + 1 });
    }
  }
  return null;
}

function codexBinaryAvailable() {
  const probe = spawnSync(process.platform === "win32" ? "where" : "which", ["codex"], {
    encoding: "utf8",
    input: "",
    timeout: 5_000,
  });
  return probe.status === 0 && (probe.stdout || "").trim().length > 0;
}

// exec-backend job ids are prefixed so every subcommand can route to the
// right backend without guessing.
function isExecJobId(jobId) {
  return typeof jobId === "string" && jobId.startsWith("exec-");
}

function resolveBackend() {
  const script = findCompanionScript();
  if (script) return { kind: "companion", script };
  if (codexBinaryAvailable()) return { kind: "exec" };
  fail(
    "neither the codex plugin (codex-companion.mjs) nor the `codex` CLI was found.\n" +
      "  - plugin: /plugin marketplace add openai/codex-plugin-cc, then /plugin install codex@openai-codex, then /codex:setup\n" +
      "  - bare CLI: npm install -g @openai/codex, then `codex login`"
  );
}

// ---------------------------------------------------------------------------
// Companion backend (plugin)
// ---------------------------------------------------------------------------

// Every companion call: stdin closed (input: ""), hard timeout. Nothing here
// can wait on input or hang past its deadline.
function companion(script, args, { timeoutMs = PER_CALL_TIMEOUT_MS } = {}) {
  const out = spawnSync(process.execPath, [script, ...args], {
    encoding: "utf8",
    input: "",
    timeout: timeoutMs,
  });
  const timedOut = out.error?.code === "ETIMEDOUT" || out.signal === "SIGTERM";
  return {
    ok: out.status === 0 && !timedOut,
    timedOut,
    status: out.status,
    stdout: (out.stdout || "").trim(),
    stderr: (out.stderr || "").trim(),
  };
}

function companionJson(script, args, opts) {
  const out = companion(script, [...args, "--json"], opts);
  if (!out.ok) return { ...out, json: null };
  try {
    return { ...out, json: JSON.parse(out.stdout) };
  } catch {
    return { ...out, ok: false, json: null, stderr: `unparseable JSON from companion: ${out.stdout.slice(0, 400)}` };
  }
}

// ---------------------------------------------------------------------------
// Exec backend (bare codex CLI)
// ---------------------------------------------------------------------------

function execJobPaths(jobId) {
  return {
    meta: path.join(EXEC_JOBS_DIR, `${jobId}.json`),
    log: path.join(EXEC_JOBS_DIR, `${jobId}.log`),
  };
}

function execReadJob(jobId) {
  const { meta } = execJobPaths(jobId);
  if (!fs.existsSync(meta)) fail(`no such exec job: ${jobId} (looked in ${EXEC_JOBS_DIR})`);
  try {
    return JSON.parse(fs.readFileSync(meta, "utf8"));
  } catch {
    fail(`corrupt job file for ${jobId}: ${meta}`);
  }
}

function execPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function execLaunch(flags, prompt) {
  if (flags["--resume"]) {
    // The bare CLI has no equivalent of the plugin's resumable task threads
    // that we can target reliably from here; starting fresh is the honest
    // behavior, said out loud rather than silently.
    process.stderr.write("route: --resume needs the codex plugin; the bare-CLI backend starts a fresh run instead.\n");
  }
  fs.mkdirSync(EXEC_JOBS_DIR, { recursive: true });
  const jobId = `exec-${Date.now()}-${process.pid}`;
  const { meta, log } = execJobPaths(jobId);

  const args = ["exec"];
  if (flags["--model"]) args.push("--model", flags["--model"] === "spark" ? "gpt-5.3-codex-spark" : flags["--model"]);
  if (flags["--effort"]) args.push("-c", `model_reasoning_effort=${flags["--effort"]}`);
  if (flags["--read-only"]) args.push("--sandbox", "read-only");
  args.push(prompt);

  const logFd = fs.openSync(log, "a");
  // Two deliberate choices here:
  // - stdin "ignore" + the `< /dev/null` inside the shell line: a broken
  //   argument pass makes codex exec fail fast on EOF instead of silently
  //   waiting forever for terminal input (see SKILL.md for the incident).
  // - completion is signaled by a sentinel line the shell appends AFTER codex
  //   exits, not by pid-liveness: a watch loop in the same process (run =
  //   launch+watch) blocks the event loop, so an exited child lingers as a
  //   zombie and kill(pid, 0) keeps "succeeding" — pid checks read forever-
  //   running. The sentinel is unambiguous from any process, any time.
  const child = spawn(
    "bash",
    ["-c", `codex "$@" < /dev/null; echo "${EXEC_DONE_SENTINEL}:$?"`, "--", ...args],
    {
      detached: true,
      stdio: ["ignore", logFd, logFd],
    }
  );
  child.unref();
  fs.closeSync(logFd);

  fs.writeFileSync(
    meta,
    JSON.stringify({ jobId, pid: child.pid, log, promptPreview: prompt.slice(0, 200), startedAt: new Date().toISOString() }, null, 2)
  );
  process.stdout.write(`${JSON.stringify({ jobId, title: "codex exec (bare-CLI backend)" })}\n`);
  return jobId;
}

// Reads the log for the completion sentinel. Returns:
//   { done: true, exitCode, output }  — sentinel present (normal end)
//   { done: true, exitCode: null, output } — no sentinel but pid is gone
//                                            (killed/cancelled/crashed shell)
//   { done: false, output }           — still running
function execStatus(jobId) {
  const job = execReadJob(jobId);
  const { log } = execJobPaths(jobId);
  const raw = fs.existsSync(log) ? fs.readFileSync(log, "utf8") : "";
  const m = raw.match(new RegExp(`${EXEC_DONE_SENTINEL}:(\\d+)\\s*$`));
  const output = raw.replace(new RegExp(`${EXEC_DONE_SENTINEL}:\\d+\\s*$`), "").trim() || "(no output captured)";
  if (m) return { done: true, exitCode: Number(m[1]), output, job };
  if (!execPidAlive(job.pid)) return { done: true, exitCode: null, output, job };
  return { done: false, output, job };
}

// ---------------------------------------------------------------------------
// Shared flow
// ---------------------------------------------------------------------------

function parseFlags(argv, { valueFlags = [], boolFlags = [] } = {}) {
  const flags = {};
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (valueFlags.includes(arg)) {
      flags[arg] = argv[++i];
    } else if (boolFlags.includes(arg)) {
      flags[arg] = true;
    } else {
      rest.push(arg);
    }
  }
  return { flags, rest };
}

function doLaunch(argv) {
  const { flags, rest } = parseFlags(argv, {
    valueFlags: ["--model", "--effort", "--prompt-file"],
    boolFlags: ["--read-only", "--resume"],
  });
  let prompt = rest.join(" ").trim();
  if (flags["--prompt-file"]) {
    if (!fs.existsSync(flags["--prompt-file"])) fail(`prompt file not found: ${flags["--prompt-file"]}`);
    prompt = fs.readFileSync(flags["--prompt-file"], "utf8").trim();
  }
  if (!prompt) fail("no prompt given — pass the task text or --prompt-file <path>");

  const backend = resolveBackend();
  if (backend.kind === "exec") return execLaunch(flags, prompt);

  const args = ["task", "--background"];
  if (!flags["--read-only"]) args.push("--write");
  if (flags["--resume"]) args.push("--resume-last");
  if (flags["--model"]) args.push("--model", flags["--model"] === "spark" ? "gpt-5.3-codex-spark" : flags["--model"]);
  if (flags["--effort"]) args.push("--effort", flags["--effort"]);
  args.push(prompt);

  const out = companionJson(backend.script, args);
  if (!out.ok) fail(out.timedOut ? "launch call timed out after 60s" : out.stderr || out.stdout || "launch failed", 2);
  const jobId = out.json?.jobId;
  if (!jobId) fail(`launch succeeded but no jobId in response: ${JSON.stringify(out.json).slice(0, 300)}`);
  process.stdout.write(`${JSON.stringify({ jobId, title: out.json.title ?? null })}\n`);
  return jobId;
}

function sleepSync(ms) {
  // Deliberate bounded sleep between polls; Atomics.wait keeps it dependency-free.
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function stillRunningNotice(jobId, ceilingMs) {
  const followups = isExecJobId(jobId)
    ? [
        `  route.mjs status ${jobId}    to check progress`,
        `  route.mjs result ${jobId}    to see output so far`,
        `  route.mjs watch ${jobId} --ceiling-s 600    to keep waiting`,
        `  route.mjs cancel ${jobId}    to abort`,
      ]
    : [
        `  /codex:status ${jobId}    (or: route.mjs status ${jobId})`,
        `  /codex:result ${jobId}    (or: route.mjs watch ${jobId} --ceiling-s 600)`,
        `  /codex:cancel ${jobId}    to abort`,
      ];
  process.stdout.write(
    [
      `Job ${jobId} is still running after the ${Math.round(ceilingMs / 1000)}s ceiling.`,
      `It continues in the background. Follow up with:`,
      ...followups,
    ].join("\n") + "\n"
  );
  process.exit(3);
}

// async on purpose: the sleep must yield to the event loop. With a blocking
// sleep (Atomics.wait), Node can never reap a detached child that exits while
// we watch it from the same process (run = launch+watch) — the child lingers
// as a zombie, kill(pid, 0) keeps succeeding, and the pid-liveness fallback
// reads "running" forever. An event-loop-friendly sleep lets libuv reap
// exited children, so the fallback stays truthful.
async function doWatch(argv) {
  const { flags, rest } = parseFlags(argv, { valueFlags: ["--ceiling-s", "--interval-s"] });
  const jobId = rest[0];
  if (!jobId) fail("watch requires a jobId");
  const ceilingMs = Math.max(10, Number(flags["--ceiling-s"]) || DEFAULT_CEILING_S) * 1000;
  const intervalMs = Math.max(5, Number(flags["--interval-s"]) || DEFAULT_INTERVAL_S) * 1000;
  const deadline = Date.now() + ceilingMs;
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  if (isExecJobId(jobId)) {
    while (Date.now() < deadline) {
      const s = execStatus(jobId);
      if (s.done) {
        if (s.exitCode === null) {
          process.stdout.write(`Job ${jobId} ended without a completion marker (killed or cancelled). Output so far:\n${s.output}\n`);
          process.exit(1);
        }
        process.stdout.write(s.output + "\n");
        process.exit(s.exitCode === 0 ? 0 : 1);
      }
      await sleep(Math.min(intervalMs, Math.max(0, deadline - Date.now())));
    }
    stillRunningNotice(jobId, ceilingMs);
  }

  const backend = resolveBackend();
  if (backend.kind !== "companion") {
    fail(`job ${jobId} looks like a plugin job, but the codex plugin isn't installed on this machine.`);
  }
  let lastPhase = "";
  while (Date.now() < deadline) {
    const out = companionJson(backend.script, ["status", jobId]);
    if (out.ok) {
      const job = out.json?.job ?? {};
      if (job.phase && job.phase !== lastPhase) {
        lastPhase = job.phase;
        process.stderr.write(`route: ${jobId} → ${job.status ?? "?"} (${job.phase})\n`);
      }
      if (job.status === "completed") {
        const result = companion(backend.script, ["result", jobId], { timeoutMs: PER_CALL_TIMEOUT_MS });
        process.stdout.write((result.ok ? result.stdout : `completed, but result fetch failed: ${result.stderr}`) + "\n");
        process.exit(result.ok ? 0 : 1);
      }
      if (job.status === "failed" || job.status === "cancelled") {
        process.stdout.write(`Job ${jobId} ${job.status}: ${job.errorMessage ?? job.summary ?? "no error message stored"}\n`);
        process.exit(1);
      }
    }
    // Transient status failures are tolerated: keep polling until the ceiling.
    await sleep(Math.min(intervalMs, Math.max(0, deadline - Date.now())));
  }
  stillRunningNotice(jobId, ceilingMs);
}

function doPassthrough(cmd, argv) {
  const jobId = argv.find((a) => !a.startsWith("--"));
  if (jobId && isExecJobId(jobId)) {
    if (cmd === "status") {
      const s = execStatus(jobId);
      const state = s.done ? (s.exitCode === null ? "ended abnormally" : `finished (exit ${s.exitCode})`) : "running";
      process.stdout.write(`${jobId}: ${state} (pid ${s.job.pid}, started ${s.job.startedAt})\n`);
      process.exit(0);
    }
    if (cmd === "result") {
      const s = execStatus(jobId);
      process.stdout.write(s.output + "\n");
      process.exit(0);
    }
    if (cmd === "cancel") {
      const s = execStatus(jobId);
      if (!s.done) {
        try {
          // Negative pid = the whole process group (detached made the shell
          // wrapper a group leader), so codex itself dies too, not just bash.
          process.kill(-s.job.pid, "SIGTERM");
        } catch (e) {
          fail(`could not signal process group ${s.job.pid}: ${e.message}`, 1);
        }
        // Teardown is asynchronous — confirm rather than report a stale state.
        sleepSync(1500);
        const after = execStatus(jobId);
        process.stdout.write(
          after.done
            ? `Cancelled ${jobId} (process group ${s.job.pid}).\n`
            : `Sent SIGTERM to ${jobId}; it hasn't exited yet — re-check with: route.mjs status ${jobId}\n`
        );
      } else {
        process.stdout.write(`${jobId} already finished.\n`);
      }
      process.exit(0);
    }
  }
  const backend = resolveBackend();
  if (backend.kind !== "companion") {
    fail(`'${cmd}' without an exec- job id needs the codex plugin, which isn't installed on this machine.`);
  }
  const out = companion(backend.script, [cmd, ...argv]);
  process.stdout.write(out.stdout + "\n");
  if (out.stderr) process.stderr.write(out.stderr + "\n");
  process.exit(out.ok ? 0 : 1);
}

const [cmd, ...argv] = process.argv.slice(2);
switch (cmd) {
  case "launch":
    doLaunch(argv);
    break;
  case "watch":
    await doWatch(argv);
    break;
  case "run": {
    // Split watch-only flags (WITH their values) from launch args. Filtering
    // only the flag tokens left their values behind, which got glued onto the
    // prompt — the worker received "600 20 <actual task>". Value-bearing
    // flags must always travel as pairs.
    const launchArgs = [];
    const watchArgs = [];
    for (let i = 0; i < argv.length; i++) {
      if (argv[i] === "--ceiling-s" || argv[i] === "--interval-s") {
        watchArgs.push(argv[i], argv[++i]);
      } else {
        launchArgs.push(argv[i]);
      }
    }
    const jobId = doLaunch(launchArgs);
    await doWatch([jobId, ...watchArgs]);
    break;
  }
  case "status":
  case "result":
  case "cancel":
    doPassthrough(cmd, argv);
    break;
  default:
    fail("usage: route.mjs <launch|watch|run|status|result|cancel> ...");
}
