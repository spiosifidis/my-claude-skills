---
name: wordpress-router
description: "Use when the user asks about WordPress codebases (plugins, themes, block themes, Gutenberg blocks, WP core checkouts) and you need to quickly classify the repo and route to the correct workflow/skill (blocks, theme.json, REST API, WP-CLI, performance, security, testing, release packaging)."
compatibility: "Targets WordPress 7.0+ (PHP 7.4.0+). Filesystem-based agent with bash + node. Some workflows require WP-CLI."
---

# WordPress Router

## When to use

Use this skill at the start of most WordPress tasks to:

- identify what kind of WordPress codebase this is (plugin vs theme vs block theme vs WP core checkout vs full site),
- pick the right workflow and guardrails,
- delegate to the most relevant domain skill(s).

## Inputs required

- Repo root (current working directory).
- The user’s intent (what they want changed) and any constraints (WP version targets, WP.com specifics, release requirements).

## Procedure

1. Triage the project by inspecting the repo:
   - Look for `wp-content/`, a theme `style.css` header, `theme.json` (block theme signal), a plugin header comment, or `composer.json`/`wp-env.json`.
2. Read what you found and classify:
   - primary project kind(s),
   - tooling available (PHP/Composer, Node, @wordpress/scripts),
   - tests present (PHPUnit, Playwright, wp-env),
   - any version hints.
3. Route to domain workflows based on user intent + repo kind:
   - For the decision tree, read: `references/decision-tree.md`.
4. Apply guardrails before making changes:
   - Confirm any version constraints if unclear.
   - Prefer the repo’s existing tooling and conventions for builds/tests.

## Verification

- Re-run the triage inspection (step 1) if you create or restructure significant files.
- Run the repo’s lint/test/build commands that triage surfaced (if available).

## Failure modes / debugging

- If the project kind is still unclear after triage, inspect:
  - root `composer.json`, `package.json`, `style.css`, `block.json`, `theme.json`, `wp-content/`.
- If the repo is huge, narrow the scanning scope to the most signal-rich paths above.

## Escalation

- If routing is ambiguous, ask one question:
  - “Is this intended to be a WordPress plugin, a theme (classic/block), or a full site repo?”
