import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const repoRoot = resolve(__dirname, '..', '..', '..');
export const assetsRoot = resolve(repoRoot, 'web', 'public', 'assets');

/** Every language pair we ship, in `languages.json` order. */
export async function listPairs() {
  const raw = await readFile(resolve(assetsRoot, 'languages.json'), 'utf8');
  return JSON.parse(raw).languages.map((l) => l.pair);
}

/**
 * The pairs a build should run over: the one named on the command line, or all of them.
 * Throws on an unknown pair so a typo fails loudly instead of writing to a new folder.
 */
export async function resolvePairs(arg) {
  const pairs = await listPairs();
  if (!arg) return pairs;
  if (!pairs.includes(arg)) {
    throw new Error(`Unknown language pair "${arg}". Known pairs: ${pairs.join(', ')}`);
  }
  return [arg];
}

export function pairPaths(pair) {
  return {
    pair,
    docsRoot: resolve(repoRoot, 'docs', pair),
    storiesSrc: resolve(repoRoot, 'docs', pair, 'stories'),
    drillsSrc: resolve(repoRoot, 'docs', pair, 'drills'),
    transcriptsSrc: resolve(repoRoot, 'docs', pair, 'transcripts'),
    vocabFile: resolve(assetsRoot, pair, 'vocabulary.json'),
    storiesOut: resolve(assetsRoot, pair, 'stories'),
    storiesIndex: resolve(assetsRoot, pair, 'stories-index.json'),
    drillsOut: resolve(assetsRoot, pair, 'drills'),
    drillsIndex: resolve(assetsRoot, pair, 'drills-index.json'),
    lessonsOut: resolve(assetsRoot, pair, 'lessons'),
    lessonsIndex: resolve(assetsRoot, pair, 'lessons-index.json'),
  };
}
