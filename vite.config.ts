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

export default defineConfig({
  define: { __RENDERER__: JSON.stringify(renderer) },
  plugins: [
    ...[
      tanstackRouter({ autoCodeSplitting: true }),
      stylex.vite({ runtimeInjection: false }),
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      renderer === 'redact' ? redact() : null,
    ].slice(0, chain),
    mockApi(),
  ],
  build: { manifest: true },
  preview: { strictPort: true },
})
