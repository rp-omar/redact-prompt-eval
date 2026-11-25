# Findings log (running)

Working notes; restructured at the end of the run.

- Setup: Bun 1.4.5 absent on the machine. Omar chose a local devDependency (`bun@1.4.5` in `node_modules/.bin`), bootstrapped with `npm install --no-package-lock bun@1.4.5`, then `bun install`.
- `gh gist view --raw` prepends the gist description line; PROMPT.md is the gist file content from the API instead.
- All five plugins built first try, added one at a time (CHAIN=1..5), for both renderers. No build errors.
- `redact()` registers with `enforce: 'pre'`, so its position in the prompt's ordered list is not what orders it.
- `bun lint` is not a Bun subcommand (`error: Script not found "lint"`); prompt names no linter.
- Vite 8.3.8 warns that extension-less imports in vite.config.ts are unsupported by `configLoader: 'native'`.
