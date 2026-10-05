import { execFileSync } from 'node:child_process';
import { rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../', import.meta.url));
rmSync(new URL('../dist/', import.meta.url), { recursive: true, force: true });
for (const project of ['tsconfig.json', 'tsconfig.cjs.json']) {
  execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '-p', project], { cwd: root, stdio: 'inherit' });
}
writeFileSync(new URL('../dist/cjs/package.json', import.meta.url), '{"type":"commonjs"}\n');
