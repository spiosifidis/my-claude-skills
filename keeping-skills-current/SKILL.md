---
name: keeping-skills-current
description: Use when a session reveals that an existing skill is wrong, outdated, incomplete, or slower than what actually worked — or when the user corrects behavior that a skill drove, or a better technique emerges mid-task that should become the skill's default.
---

# Keeping Skills Current

## Overview

Skills go stale the moment reality diverges from what's written. The person best placed to fix that is whoever notices the divergence, at the moment they notice it — not a scheduled review weeks later. This is a lightweight, Claude-Code-native alternative to heavyweight "observation log + periodic review" systems: no log file, no staging directory, no scheduler. Skills here are plain writable files, so the fix is just... making the fix.

## When to Use

- A skill's documented approach turns out wrong, incomplete, or slower than what actually worked in practice
- The user corrects output that a skill's instructions drove
- A skill references a tool, path, or command that doesn't work as described (e.g. discovering `sips` has no brightness/exposure controls despite assuming it did)
- A better technique emerges mid-task and should become the skill's stated default, not stay a one-off workaround

**Not for:** a one-off personal preference with no reusable pattern — save that as a `feedback` memory instead (see Skill vs. Memory below).

## Core Rule

**If you notice you can improve a skill, edit it before moving on — don't just make a mental note or tell the user about it in passing.** Skills live at `~/.claude/skills/<name>/SKILL.md`, symlinked from `my-claude-skills/<name>/` — directly editable, no approval workflow required for personal skills in this setup.

## How to Update

1. Read the live `SKILL.md` first. Never edit from a remembered summary of what it says.
2. Make the fix inline, in the section it belongs to — don't bolt a changelog note onto the bottom.
3. Match the skill's existing voice and structure.
4. Tell the user, in one line, what changed and why. Small, clearly-correct fixes don't need pre-approval; restructuring a skill's core approach does — ask first.

## Skill vs. Memory

| Situation | Where it goes |
|---|---|
| Reusable technique, correct tool usage, or process fix | Edit the skill file |
| One-off preference specific to this user's taste, with no pattern beyond it | `feedback` memory (`~/Desktop/Claude Sync/memory/`) |
| Unsure which | Skill if it would help on a *different* project too; memory if it's this user's workflow only |

## Common Mistakes

- Noticing the gap, saying so, and never actually editing the file — the fix isn't done until the file changes
- Editing a skill from memory instead of re-reading the live version first (silently drops content added since you last read it)
- Promoting a single one-off correction into a permanent rule before it's recurred even once
