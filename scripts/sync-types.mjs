// Generates .d.ts files for the sync framework packages (a git dependency shipped as TypeScript source), so the app's
// stricter tsconfig type-checks against declarations instead of re-checking the framework's source files.
// Runs on postinstall and before `npm run build`. Output goes to .sync-types/ (gitignored).
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const fw = join(root, 'node_modules', 'sync-pwa-framework')
const out = join(root, '.sync-types')
if (!existsSync(fw)) {
  console.warn('sync-types: sync-pwa-framework is not installed; skipping')
  process.exit(0)
}
rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })
const cfg = join(out, 'tsconfig.json')
const pkgs = ['core', 'spaces', 'identity-invite', 'transport-websocket']
// Declarations are only emitted for files outside node_modules, so compile a copy of the sources.
const src = join(out, 'src')
for (const p of pkgs) cpSync(join(fw, 'packages', p, 'src'), join(src, p), { recursive: true })
const paths = Object.fromEntries(pkgs.map((p) => [`@sync/${p}`, [join(src, p, 'index.ts')]]))
writeFileSync(
  cfg,
  JSON.stringify({
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'Bundler',
      lib: ['ES2022', 'DOM', 'DOM.Iterable'],
      strict: true,
      skipLibCheck: true,
      esModuleInterop: true,
      isolatedModules: true,
      declaration: true,
      emitDeclarationOnly: true,
      outDir: join(out, 'dist'),
      rootDir: src,
      types: [],
      paths,
    },
    files: pkgs.map((p) => join(src, p, 'index.ts')),
  }),
)
try {
  execFileSync(join(root, 'node_modules', '.bin', 'tsc'), ['-p', cfg], { stdio: 'pipe' })
} catch {
  // The framework is written against an older TypeScript, so a newer one may report typing nits in its source
  // (which is not ours to fix here). Declarations are still emitted; only fail if nothing was.
  if (!existsSync(join(out, 'dist', 'core', 'index.d.ts'))) process.exit(1)
}
console.log('sync-types: generated declarations in .sync-types/')
