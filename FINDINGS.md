# Findings log (running)

Working notes; restructured at the end of the run.

- Setup: Bun 1.4.5 absent on the machine. Omar chose a local devDependency (`bun@1.4.5` in `node_modules/.bin`), bootstrapped with `npm install --no-package-lock bun@1.4.5`, then `bun install`.
- `gh gist view --raw` prepends the gist description line; PROMPT.md is the gist file content from the API instead.
- All five plugins built first try, added one at a time (CHAIN=1..5), for both renderers. No build errors.
- `redact()` registers with `enforce: 'pre'`, so its position in the prompt's ordered list is not what orders it.
- `bun lint` is not a Bun subcommand (`error: Script not found "lint"`); prompt names no linter.
- Vite 8.3.8 warns that extension-less imports in vite.config.ts are unsupported by `configLoader: 'native'`.

## Ship rule, fixed before the timing run (2026-11-25)

PROMPT.md says "Ship Redact when cold entry improves and those interactions hold their baseline", with no tolerance. Rule used here, written before any full benchmark run:

- Baseline = React DOM build of the same commit. Noise floor per metric and browser = relative difference between the medians of two identical React DOM previews (A/A).
- Tolerance per metric and browser = max(A/A noise floor, 5%).
- "Cold entry improves": Redact's median cold-entry time to usable content (list route, navigation start to 5,000 rows painted) is lower than React DOM's by more than the tolerance, in all three browsers.
- "Interactions hold their baseline": Redact's median is not above React DOM's by more than the tolerance for Suspense navigation (click to required content painted) and for input latency (keystroke to filtered rows painted, plain state variant), in all three browsers.
- "Breaks a required flow": any failure in tests/flows.pw.ts on the Redact build in any browser.
- Redact ships only if all three hold. Bytes are reported but are not part of the prompt's gate.
