/**
 * Golden-file check for the asset builders.
 *
 * The generated JSON under `web/public/assets/<pair>/` is committed, so "the build is
 * reproducible" is checkable without any stored fixtures: snapshot what is on disk, re-run the
 * builders, and compare. Anything that differs is printed and then restored, so a failing run
 * leaves the working tree exactly as it found it.
 *
 * Usage: node web/scripts/verify-generated.mjs
 */
import { readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

import { listPairs, pairPaths } from './lib/pairs.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Every file the two builders may write, per pair. */
async function generatedFiles(paths) {
  const files = [paths.storiesIndex, paths.drillsIndex];
  for (const dir of [paths.storiesOut, paths.drillsOut]) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      if (ent.isFile() && /\.json$/i.test(ent.name)) files.push(resolve(dir, ent.name));
    }
  }
  return files;
}

async function snapshot(files) {
  const snap = new Map();
  for (const file of files) {
    try {
      snap.set(file, await readFile(file, 'utf8'));
    } catch {
      snap.set(file, null); // absent
    }
  }
  return snap;
}

function run(script) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, [resolve(__dirname, script)], { stdio: 'ignore' });
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0 ? resolveRun() : reject(new Error(`${script} exited ${code}`)),
    );
  });
}

async function restore(snap) {
  for (const [file, content] of snap) {
    if (content === null) {
      await rm(file, { force: true });
    } else {
      await writeFile(file, content, 'utf8');
    }
  }
}

async function main() {
  const pairs = await listPairs();

  let before = new Map();
  for (const pair of pairs) {
    const paths = pairPaths(pair);
    const files = await generatedFiles(paths);
    before = new Map([...before, ...(await snapshot(files))]);
  }
  console.log(`Snapshotted ${before.size} generated file(s) across ${pairs.length} pair(s).`);

  await run('build-stories.mjs');
  await run('build-drills.mjs');

  // Re-scan, so a file the build newly created or dropped is caught too.
  let afterFiles = [];
  for (const pair of pairs) {
    afterFiles = [...afterFiles, ...(await generatedFiles(pairPaths(pair)))];
  }
  const allFiles = new Set([...before.keys(), ...afterFiles]);
  const after = await snapshot([...allFiles]);

  const differences = [];
  for (const file of allFiles) {
    const a = before.get(file) ?? null;
    const b = after.get(file) ?? null;
    if (a === b) continue;
    if (a === null) differences.push(`ADDED    ${file}`);
    else if (b === null) differences.push(`REMOVED  ${file}`);
    else differences.push(`CHANGED  ${file}`);
  }

  if (differences.length === 0) {
    console.log('OK — the builders reproduce the committed assets byte-for-byte.');
    return;
  }

  await restore(before);
  console.error(`\n${differences.length} file(s) differ after rebuilding:\n`);
  for (const line of differences) console.error(`  ${line}`);
  console.error('\nThe snapshot has been restored — the working tree is unchanged.');
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
