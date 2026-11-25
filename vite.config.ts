import babel from '@rolldown/plugin-babel'
import stylex from '@stylexjs/unplugin'
import { redact } from '@tanstack/redact/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { type Plugin, defineConfig } from 'vite'
import { mockApi } from './mock/api-plugin.ts'

// RENDERER=react-dom omits redact() so the same commit builds on React DOM.
const renderer = process.env.RENDERER === 'react-dom' ? 'react-dom' : 'redact'
// CHAIN=n keeps only the first n plugins of the prompt's chain (build-debugging aid).
const chain = Number(process.env.CHAIN ?? 5)
// COMPILER=off drops the React Compiler pass (diagnostic builds only; see FINDINGS.md).
const compiler = process.env.COMPILER !== 'off'
// PLAIN_LINKS=1 renders list rows with <a> instead of the router <Link> (diagnostic builds only).
const plainLinks = process.env.PLAIN_LINKS === '1'
// VIRTUAL=1 builds the virtualised-list variant; STALE=0 builds with Query's default staleTime.
const virtual = process.env.VIRTUAL === '1'
const staleMs = Number(process.env.STALE ?? 30_000)
// VITE_CACHE=shared puts both renderers' dev servers on one dep cache (diagnostic, FINDINGS.md V-3).
const cacheName = process.env.VITE_CACHE === 'shared' ? 'shared' : renderer

// Swaps the list route's source for the virtualised copy. A module swap, not an inline
// `if (__VIRTUAL__)`, so the default build stays byte-identical to the one measured in run 1.
function virtualVariant(): Plugin {
  const route = fileURLToPath(new URL('./src/routes/index.tsx', import.meta.url))
  const variant = fileURLToPath(new URL('./src/variants/index.virtual.tsx', import.meta.url))
  return {
    name: 'virtual-variant',
    enforce: 'pre',
    load(id) {
      if (id.split('?')[0] === route) return readFileSync(variant, 'utf8')
    },
  }
}

export default defineConfig({
  define: {
    __RENDERER__: JSON.stringify(renderer),
    __PLAIN_LINKS__: JSON.stringify(plainLinks),
    __STALE_MS__: JSON.stringify(staleMs),
  },
  plugins: [
    ...[
      tanstackRouter({ autoCodeSplitting: true }),
      stylex.vite({ runtimeInjection: false }),
      react(),
      compiler ? babel({ presets: [reactCompilerPreset()] }) : null,
      renderer === 'redact' ? redact() : null,
    ].slice(0, chain),
    mockApi(),
    virtual ? virtualVariant() : null,
  ],
  // Per-renderer dep cache: two dev servers sharing node_modules/.vite load two copies of React.
  cacheDir: `node_modules/.vite-${cacheName}`,
  build: { manifest: true },
  preview: { strictPort: true },
})
