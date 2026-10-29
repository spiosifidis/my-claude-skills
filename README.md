# My Claude Skills

Personal collection of Claude Code skills — backed up from all machines.

## Set up a machine (recommended)

Run the bootstrap on any new or existing machine — it installs all skills
globally (`~/.claude/skills`, available in every project), updates ones already
installed, adds a one-line reminder to `~/.claude/CLAUDE.md` so sessions check
for applicable skills before responding, and sets up weekly auto-updates with
catch-up: a Monday 09:00 cron for machines that are on, plus a shell-startup
hook so a machine that was off catches up the next time a terminal opens (a
7-day timestamp guard keeps it to at most one real update per week).
Idempotent — re-run any time:

```bash
curl -fsSL https://raw.githubusercontent.com/spiosifidis/my-claude-skills/main/bootstrap.sh | bash
```

## Sessions opened on this repo need no install

`.claude/skills/` holds a relative symlink to every skill folder, so Claude Code
treats all of them as project skills whenever the working directory is this
repo — including claude.ai/code cloud sessions, which start from a fresh
container. After adding or removing a skill, regenerate the links:

```bash
for d in */; do d="${d%/}"; [ -f "$d/SKILL.md" ] && ln -sfn "../../$d" ".claude/skills/$d"; done
```

## Install one skill

```bash
npx skills add spiosifidis/my-claude-skills -s skill-name
```

## Install all skills (project scope)

```bash
npx skills add spiosifidis/my-claude-skills -s '*'
```

---

## Skills

### Token & Context Management
| Skill | When to use |
|---|---|
| caveman | Simple/repetitive tasks — cuts output ~75%. Say "caveman mode" |
| caveman-commit | Writing git commit messages |
| caveman-review | Code review / PR feedback |
| caveman-compress | Compress CLAUDE.md or memory files to save input tokens |
| caveman-help | Reference card for all caveman commands |
| savethetokens | Large codebases, long debug sessions, multi-file features |
| sequential-thinking | Complex schema changes, elusive bugs, large refactors |

### Browser Automation
| Skill | When to use |
|---|---|
| playwright-cli | Navigate sites, fill forms, screenshots, test UI, scrape data. Requires `npm install -g @playwright/cli@latest` first — this skill wraps that CLI, it doesn't bundle it |

### Design & UI
| Skill | When to use |
|---|---|
| frontend-design | Before building any UI — creates distinctive design plan |
| impeccable | After building UI — audit anti-patterns, polish |
| web-design-guidelines | Check code against Vercel web standards |
| shadcn-ui | Building components with Radix/Shadcn primitives |
| tailwind-v4-shadcn | Tailwind v4 + Shadcn setup, dark mode, CSS variables |
| motion | Framer Motion animations — scroll, drag, page transitions |

### React & Next.js
| Skill | When to use |
|---|---|
| nextjs | Any Next.js work — App Router, Server Actions, caching |
| react-hook-form-zod | Building forms with validation |
| zod | Schema validation — APIs, env vars, form data |
| access-control-rbac | Role-based access control, multi-role systems |

### Database & Backend
| Skill | When to use |
|---|---|
| supabase | Any Supabase work — auth, DB, RLS, Edge Functions, storage |
| supabase-postgres-best-practices | Writing/reviewing SQL, schema design, query optimization |

### Code Quality
| Skill | When to use |
|---|---|
| systematic-debugging | Any bug — always before proposing a fix |
| verification-before-completion | Always before saying "done" or committing |
| github-workflow | Task-to-PR workflow — branch, commit, create PR |

### Writing & Content
| Skill | When to use |
|---|---|
| avoid-ai-writing | Remove AI-isms from written content |
| clean-user-facing-text | Final polish for prose you own: strip invisible Unicode, measure stylometry, rewrite once while keeping facts, voice and required disclosures. Needs `python3` on the machine (stdlib only). From guillaumemeyer/watermarks-remover (MIT) |
| invoice-organizer | Organize invoices/receipts for tax prep |

### Health / Athlisis
| Skill | When to use |
|---|---|
| goal-analyzer | Analyze health goals and progress data |

### Skill Management
| Skill | When to use |
|---|---|
| skill-creator | Build new custom skills |
| claude-doctor | Health-check a machine's Claude setup — skills, sync, permissions, missing CLIs. Runs weekly via bootstrap (Mon 09:30 + shell catch-up); run manually with `bash ~/.claude/skills/claude-doctor/scripts/doctor.sh` |

### Multi-Agent Delegation
| Skill | When to use |
|---|---|
| route | Delegate a substantial task to Codex (ChatGPT) as a background worker |
