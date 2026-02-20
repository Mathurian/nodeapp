import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const indexPath = join(process.cwd(), 'dist', 'index.html')
const original = readFileSync(indexPath, 'utf8')

if (!original.includes('tenant-manifest-link') || !original.includes('/api/v1/settings/pwa-manifest')) {
  throw new Error('tenant manifest bootstrap marker missing from dist/index.html')
}

const staticManifestPattern = /<link rel="manifest" href="\/manifest\.webmanifest">/g
const cleaned = original.replace(staticManifestPattern, '')

if (cleaned !== original) {
  writeFileSync(indexPath, cleaned, 'utf8')
}
