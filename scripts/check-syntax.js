const { readdirSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const { join } = require('node:path');

function collectJavaScriptFiles(directory) {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectJavaScriptFiles(path));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(path);
    }
  }

  return files;
}

const files = [
  ...collectJavaScriptFiles('commands'),
  ...collectJavaScriptFiles('dashboard'),
  ...collectJavaScriptFiles('events'),
  ...collectJavaScriptFiles('scripts'),
  ...collectJavaScriptFiles('utils'),
  'bot.js',
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
