#!/usr/bin/env node
// Hardened wrapper around openai/codex-plugin-cc's codex-companion.mjs.
//
// Encodes the delegation discipline from route/SKILL.md so it cannot be
// improvised wrong: background-only launches, stdin always closed, a hard
// per-call timeout on every companion invocation, and a bounded watch loop
// that reports "still running" instead of blocking forever.
//
// Usage:
//   route.mjs launch [--read-only] [--model <m>] [--effort <e>] [--resume] <prompt...>
//   route.mjs watch  <jobId> [--ceiling-s 600] [--interval-s 20]
//   route.mjs run    [launch flags] [--ceiling-s 600] <prompt...>   (launch + watch)
//   route.mjs status [jobId] | result [jobId] | cancel <jobId>
//
// Exit codes: 0 success · 1 job failed/cancelled · 2 usage/setup error ·
//             3 ceiling reached, job still running (not an error)

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PER_CALL_TIMEOUT_MS = 60_000;
const DEFAULT_CEILING_S = 600;
const DEFAULT_INTERVAL_S = 20;

function fail(message, code = 2) {
  process.stderr.write(`route: ${message}\n`);
  process.exit(code);
}

function findCompanion() {
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
  fail("codex-companion.mjs not found — is the codex plugin installed? Run /codex:setup first.");
}

// Every companion call: stdin closed (input: ""), hard timeout. Nothing here
// can wait on input or hang past its deadline.
function companion(args, { timeoutMs = PER_CALL_TIMEOUT_MS } = {}) {
  const script = findCompanion();
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

function companionJson(args, opts) {
  const out = companion([...args, "--json"], opts);
  if (!out.ok) return { ...out, json: null };
  try {
    return { ...out, json: JSON.parse(out.stdout) };
  } catch {
    return { ...out, ok: false, json: null, stderr: `unparseable JSON from companion: ${out.stdout.slice(0, 400)}` };
  }
}

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

  const args = ["task", "--background"];
  if (!flags["--read-only"]) args.push("--write");
  if (flags["--resume"]) args.push("--resume-last");
  if (flags["--model"]) args.push("--model", flags["--model"] === "spark" ? "gpt-5.3-codex-spark" : flags["--model"]);
  if (flags["--effort"]) args.push("--effort", flags["--effort"]);
  args.push(prompt);

  const out = companionJson(args);
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

function doWatch(argv) {
  const { flags, rest } = parseFlags(argv, { valueFlags: ["--ceiling-s", "--interval-s"] });
  const jobId = rest[0];
  if (!jobId) fail("watch requires a jobId");
  const ceilingMs = Math.max(10, Number(flags["--ceiling-s"]) || DEFAULT_CEILING_S) * 1000;
  const intervalMs = Math.max(5, Number(flags["--interval-s"]) || DEFAULT_INTERVAL_S) * 1000;
  const deadline = Date.now() + ceilingMs;

  let lastPhase = "";
  while (Date.now() < deadline) {
    const out = companionJson(["status", jobId]);
    if (out.ok) {
      const job = out.json?.job ?? {};
      if (job.phase && job.phase !== lastPhase) {
        lastPhase = job.phase;
        process.stderr.write(`route: ${jobId} → ${job.status ?? "?"} (${job.phase})\n`);
      }
      if (job.status === "completed") {
        const result = companion(["result", jobId], { timeoutMs: PER_CALL_TIMEOUT_MS });
        process.stdout.write((result.ok ? result.stdout : `completed, but result fetch failed: ${result.stderr}`) + "\n");
        process.exit(result.ok ? 0 : 1);
      }
      if (job.status === "failed" || job.status === "cancelled") {
        process.stdout.write(`Job ${jobId} ${job.status}: ${job.errorMessage ?? job.summary ?? "no error message stored"}\n`);
        process.exit(1);
      }
    }
    // Transient status failures are tolerated: keep polling until the ceiling.
    sleepSync(Math.min(intervalMs, Math.max(0, deadline - Date.now())));
  }

  process.stdout.write(
    [
      `Job ${jobId} is still running after the ${Math.round(ceilingMs / 1000)}s ceiling.`,
      `It continues in the background. Follow up with:`,
      `  /codex:status ${jobId}    (or: route.mjs status ${jobId})`,
      `  /codex:result ${jobId}    (or: route.mjs watch ${jobId} --ceiling-s 600)`,
      `  /codex:cancel ${jobId}    to abort`,
    ].join("\n") + "\n"
  );
  process.exit(3);
}

function passthrough(cmd, argv) {
  const out = companion([cmd, ...argv]);
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
    doWatch(argv);
    break;
  case "run": {
    const jobId = doLaunch(argv.filter((a) => !a.startsWith("--ceiling-s") && !a.startsWith("--interval-s")));
    const keep = [];
    for (let i = 0; i < argv.length; i++) {
      if (argv[i] === "--ceiling-s" || argv[i] === "--interval-s") keep.push(argv[i], argv[++i]);
    }
    doWatch([jobId, ...keep]);
    break;
  }
  case "status":
  case "result":
  case "cancel":
    passthrough(cmd, argv);
    break;
  default:
    fail("usage: route.mjs <launch|watch|run|status|result|cancel> ...");
}
