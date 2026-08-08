# Router decision tree (v1)

This is a lightweight routing guide. It assumes you have already identified the project type manually (per the router procedure: inspect for `wp-content/`, a theme `style.css` header, `theme.json`, a plugin header comment, or `composer.json`/`wp-env.json`).

## Step 1: classify repo kind (from your triage)

Assign the kind with the strongest signals from your inspection:

- `wp-core` → treat as WordPress core checkout work (core patches, PHPUnit, build tools).
- `wp-site` → treat as a full site repo (wp-content present; changes might be theme + plugins).
- `wp-block-theme` → theme.json/templates/patterns workflows.
- `wp-theme` → classic theme workflows (templates PHP, `functions.php`, `style.css`).
- `wp-block-plugin` → Gutenberg block development in a plugin (block.json, build pipeline).
- `wp-plugin` / `wp-mu-plugin` → plugin workflows (hooks, admin, settings, cron, REST, security).
- `gutenberg` → Gutenberg monorepo workflows (packages, tooling, docs).

If multiple kinds match, prefer the most specific:
`gutenberg` > `wp-core` > `wp-site` > `wp-block-theme` > `wp-block-plugin` > `wp-theme` > `wp-plugin`.

## Step 2: route by user intent (keywords)

Route by intent even if repo kind is broad (like `wp-site`).

**Routing rule — never stall:** only invoke a route target that actually appears in your installed skills list. If the matching skill below is marked *(no local skill)* or the invocation fails, do NOT retry, search, or wait — handle the task directly with general WordPress knowledge and move on. A missing skill is a normal outcome, not an error to resolve.

Installed skills in this collection:

- **theme.json / Global Styles / templates/*.html / patterns/**
  - Route → `wp-block-themes`.
- **WP-CLI / wp-cli.yml / commands / db export/import / search-replace**
  - Route → `wp-wpcli-and-ops`.
- **Performance / caching / query profiling / editor slowness**
  - Route → `wp-performance`.

Topics with *(no local skill)* — handle directly, optionally check the marketplace with `npx skills find <topic>` first:

- **Interactivity API / data-wp-* directives / @wordpress/interactivity** *(no local skill)*
- **Abilities API / wp_register_ability / @wordpress/abilities** *(no local skill)*
- **Playground / run-blueprint / @wp-playground/cli** *(no local skill)*
- **Blocks / block.json / registerBlockType / save serialization** *(no local skill)*
- **Plugins / hooks / activation hook / Settings API / admin pages** *(no local skill)*
- **REST endpoint / register_rest_route / permission_callback** *(no local skill)*
- **Build tooling / @wordpress/scripts / webpack / Vite** *(no local skill)*
- **Testing / PHPUnit / wp-env / Playwright** *(no local skill)*
- **PHPStan / static analysis / phpstan.neon** *(no local skill)*
- **Security / nonces / capabilities / sanitization/escaping** *(no local skill)*

## Step 3: guardrails checklist (always)

- Verify detected tooling before suggesting commands (Composer vs npm/yarn/pnpm).
- Prefer existing lint/test scripts if present.
- If version constraints aren’t detectable, ask for target WP core and PHP versions.
