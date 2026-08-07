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
| playwright-cli | Navigate sites, fill forms, screenshots, test UI, scrape data |

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

### Document Handling
| Skill | When to use |
|---|---|

### Writing & Content
| Skill | When to use |
|---|---|
| avoid-ai-writing | Remove AI-isms from written content |
| invoice-organizer | Organize invoices/receipts for tax prep |

### Health / Athlisis
| Skill | When to use |
|---|---|
| goal-analyzer | Analyze health goals and progress data |

### Skill Management
| Skill | When to use |
|---|---|
| skill-creator | Build new custom skills |
