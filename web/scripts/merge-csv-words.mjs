/**
 * Merges a words CSV into a pair's `vocabulary.json`.
 *
 * Stories and drills ship the same CSV in two dialects — a story's `*-words.csv` has 4 columns and
 * puts several example sentences in one cell, a drill's `*.csv` has 5 and puts one example per
 * line — so the only differences are the column count and how the example cell is split.
 *
 * Existing pronunciation and translation are never overwritten; only unique new examples are
 * appended, up to MAX_EXAMPLES per word. Words with no match are written to `unmatched.json`
 * next to the CSV for the caller to categorise and append.
 *
 * Usage: node web/scripts/merge-csv-words.mjs <story|drill> <pair> <folder>
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

import { dataRows, parseCsv } from './lib/csv.mjs';
import { splitLines, splitSentences, dedupKey, joinExamples } from './lib/sentences.mjs';
import { buildHeadwordMap, findWord } from './lib/vocab.mjs';
import { pairPaths, resolvePairs } from './lib/pairs.mjs';

const MAX_EXAMPLES = 10;

const FORMATS = {
  story: {
    /** Only the `*-words.csv` beside a story, so the story's own text file is never picked up. */
    match: /-words\.csv$/i,
    columns: 4,
    splitExamples: splitSentences,
  },
  drill: {
    match: /\.csv$/i,
    columns: 5,
    splitExamples: splitLines,
  },
};

async function discoverCsv(dir, format) {
  const entries = await readdir(dir, { withFileTypes: true });
  const csvs = entries
    .filter((e) => e.isFile() && format.match.test(e.name))
    .map((e) => resolve(dir, e.name));
  if (csvs.length === 0) throw new Error(`No CSV matching ${format.match} in ${dir}`);
  if (csvs.length > 1) throw new Error(`Multiple CSVs in ${dir}: ${csvs.join(', ')}`);
  return csvs[0];
}

async function main() {
  const [formatArg, pairArg, folderArg] = process.argv.slice(2);
  const format = FORMATS[formatArg];
  if (!format || !pairArg || !folderArg) {
    console.error('Usage: node web/scripts/merge-csv-words.mjs <story|drill> <pair> <folder>');
    process.exit(2);
  }

  const [pair] = await resolvePairs(pairArg);
  const { vocabFile } = pairPaths(pair);

  const dir = resolve(process.cwd(), folderArg);
  const csvPath = await discoverCsv(dir, format);

  const vocab = JSON.parse(await readFile(vocabFile, 'utf8'));
  const headwordIndex = buildHeadwordMap(vocab);
  const rows = dataRows(parseCsv(await readFile(csvPath, 'utf8')), headwordIndex, csvPath);

  let matched = 0;
  let examplesAdded = 0;
  let examplesSkippedCap = 0;
  const unmatched = [];

  for (const { cells, target, rowNumber } of rows) {
    if (cells.length < format.columns) {
      throw new Error(
        `Row ${rowNumber} in ${csvPath} has ${cells.length} cells (expected ${format.columns}): ` +
          JSON.stringify(cells),
      );
    }
    const [, pronunciation, translation, examplesRaw] = cells;
    const incoming = format.splitExamples(examplesRaw);
    const hit = headwordIndex.get(target.toLowerCase());

    if (!hit) {
      unmatched.push({
        target,
        pronunciation: pronunciation.normalize('NFC').trim(),
        translation: translation.normalize('NFC').trim(),
        examples: joinExamples(incoming),
      });
      continue;
    }

    const word = findWord(vocab, hit.categoryKey, hit.n);
    if (!word) {
      throw new Error(`Headword index referenced missing word ${hit.categoryKey}#${hit.n}`);
    }

    const existing = splitSentences(word.examples ?? '');
    const seen = new Set(existing.map(dedupKey));
    let space = MAX_EXAMPLES - existing.length;
    const additions = [];
    for (const s of incoming) {
      const k = dedupKey(s);
      if (seen.has(k)) continue;
      seen.add(k);
      if (space <= 0) {
        examplesSkippedCap += 1;
        continue;
      }
      additions.push(s);
      space -= 1;
      examplesAdded += 1;
    }
    if (additions.length > 0) word.examples = joinExamples([...existing, ...additions]);
    matched += 1;
  }

  await writeFile(vocabFile, JSON.stringify(vocab, null, 2) + '\n', 'utf8');

  const unmatchedPath = resolve(dir, 'unmatched.json');
  if (unmatched.length > 0) {
    await writeFile(unmatchedPath, JSON.stringify(unmatched, null, 2) + '\n', 'utf8');
  }

  console.log(`Format:            ${formatArg}`);
  console.log(`Pair:              ${pair}`);
  console.log(`CSV:               ${csvPath}`);
  console.log(`Data rows:         ${matched + unmatched.length}`);
  console.log(`Matched:           ${matched}`);
  console.log(`Examples added:    ${examplesAdded}`);
  console.log(`Examples capped:   ${examplesSkippedCap}`);
  console.log(`Unmatched (new):   ${unmatched.length}`);
  if (unmatched.length > 0) {
    console.log(`Unmatched file:    ${unmatchedPath}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
