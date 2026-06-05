import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

async function collectJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectJavaScriptFiles(path)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(path);
    }
  }

  return files;
}

const files = [
  ...(await collectJavaScriptFiles('commands')),
  ...(await collectJavaScriptFiles('events')),
  ...(await collectJavaScriptFiles('scripts')),
  ...(await collectJavaScriptFiles('utils')),
  'deploy-commands.js',
  'index.js',
].sort();

let failed = false;

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], {
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    failed = true;
    console.error(result.stderr || result.stdout);
    continue;
  }

  console.log(`ok ${file}`);
}

if (failed) {
  process.exit(1);
}
