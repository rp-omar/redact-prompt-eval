import babel from '@rolldown/plugin-babel'
import stylex from '@stylexjs/unplugin'
import { redact } from '@tanstack/redact/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { mockApi } from './mock/api-plugin.ts'

// RENDERER=react-dom omits redact() so the same commit builds on React DOM.
const renderer = process.env.RENDERER === 'react-dom' ? 'react-dom' : 'redact'
// CHAIN=n keeps only the first n plugins of the prompt's chain (build-debugging aid).
const chain = Number(process.env.CHAIN ?? 5)
// COMPILER=off drops the React Compiler pass (diagnostic builds only; see FINDINGS.md).
const compiler = process.env.COMPILER !== 'off'
// PLAIN_LINKS=1 renders list rows with <a> instead of the router <Link> (diagnostic builds only).
const plainLinks = process.env.PLAIN_LINKS === '1'

export default defineConfig({
  define: { __RENDERER__: JSON.stringify(renderer), __PLAIN_LINKS__: JSON.stringify(plainLinks) },
  plugins: [
    ...[
      tanstackRouter({ autoCodeSplitting: true }),
      stylex.vite({ runtimeInjection: false }),
      react(),
      compiler ? babel({ presets: [reactCompilerPreset()] }) : null,
      renderer === 'redact' ? redact() : null,
    ].slice(0, chain),
    mockApi(),
  ],
  build: { manifest: true },
  preview: { strictPort: true },
})
