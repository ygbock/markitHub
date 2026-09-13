import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function findTests(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory()
      ? findTests(fullPath)
      : (entry.name.endsWith('.test.ts') ? [fullPath] : []);
  });
}

const testFiles = findTests('src');
if (testFiles.length === 0) {
  console.log('No test files found.');
  process.exit(0);
}

const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', ...testFiles], {
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status ?? 1);
