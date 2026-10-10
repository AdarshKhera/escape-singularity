import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const SW_FILE = 'sw.js'
const BUILD_ID_TOKEN = '__BUILD_ID__'

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? listFiles(path) : [path]
  })
}

// Gives the service worker what it needs for offline play after one visit:
// precache.json lists every emitted bundle plus the public sprites, and the
// build id stamped into sw.js changes on every deploy, so the browser installs
// the new worker, which precaches the new list and drops the old cache.
function precacheManifest(): Plugin {
  let outDir = 'dist'
  let publicDir = 'public'
  const bundleFiles: string[] = []

  return {
    name: 'escape-precache-manifest',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir
      publicDir = config.publicDir
    },
    generateBundle(_options, bundle) {
      bundleFiles.push(...Object.keys(bundle).filter((file) => !file.endsWith('.map')))
    },
    closeBundle() {
      const swPath = join(outDir, SW_FILE)
      if (!existsSync(swPath)) return

      const publicFiles = existsSync(publicDir)
        ? listFiles(publicDir)
            .map((file) => relative(publicDir, file).split(sep).join('/'))
            .filter((file) => file !== SW_FILE && !file.startsWith('.'))
        : []
      const files = [...new Set([...bundleFiles, ...publicFiles])].sort()
      const buildId = Date.now().toString(36)

      writeFileSync(join(outDir, 'precache.json'), JSON.stringify({ buildId, files }))
      writeFileSync(swPath, readFileSync(swPath, 'utf8').split(BUILD_ID_TOKEN).join(buildId))
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: '/escape-singularity/',
  plugins: [react(), precacheManifest()],
})
