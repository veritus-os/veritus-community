import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

// Unique id per build — stamped into the bundle as __BUILD_ID__ and written to
// dist/version.json, so long-lived tabs can detect a new deploy and refresh
// themselves (see src/core/config/appUpdate.js).
const BUILD_ID = String(Date.now())

// https://vite.dev/config/
export default defineConfig({
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'veritus-emit-version',
      apply: 'build',
      writeBundle(options) {
        writeFileSync(join(options.dir || 'dist', 'version.json'), JSON.stringify({ buildId: BUILD_ID }))
      },
    },
  ],
})
