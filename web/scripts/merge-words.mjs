import { readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

import { parseCsv } from './lib/csv.mjs';
import { splitSentences, dedupKey } from './lib/sentences.mjs';
import { buildHeadwordMap, findWord } from './lib/vocab.mjs';
import { pairPaths, resolvePairs } from './lib/pairs.mjs';

const MAX_EXAMPLES = 10;
const CSV_HEADER_FIRST_CELL_PREFIX = 'Итальянская';

async function discoverWordsCsv(storyDir) {
  const entries = await readdir(storyDir, { withFileTypes: true });
  const csvs = entries
    .filter((e) => e.isFile() && /-words\.csv$/i.test(e.name))
    .map((e) => resolve(storyDir, e.name));
  if (csvs.length === 0) {
    throw new Error(`No *-words.csv found in ${storyDir}`);
  }
  if (csvs.length > 1) {
    throw new Error(`Multiple *-words.csv found in ${storyDir}: ${csvs.join(', ')}`);
  }
  return csvs[0];
}

async function main() {
  const [pairArg, folderArg] = process.argv.slice(2);
  if (!pairArg || !folderArg) {
    console.error('Usage: node web/scripts/merge-words.mjs <pair> <storyFolder>');
    process.exit(2);
  }
  const [pair] = await resolvePairs(pairArg);
  const { vocabFile } = pairPaths(pair);

  const storyDir = resolve(process.cwd(), folderArg);
  const csvPath = await discoverWordsCsv(storyDir);

  const csvText = await readFile(csvPath, 'utf8');
  const rows = parseCsv(csvText);

  const vocab = JSON.parse(await readFile(vocabFile, 'utf8'));
  const headwordIndex = buildHeadwordMap(vocab);

  let matched = 0;
  let examplesAdded = 0;
  let examplesSkippedCap = 0;
  const unmatched = [];

  for (let rIdx = 0; rIdx < rows.length; rIdx++) {
    const r = rows[rIdx];
    if (r.length === 0 || (r.length === 1 && r[0] === '')) continue;
    if (r.length < 4) {
      throw new Error(
        `Row ${rIdx + 1} in ${csvPath} has ${r.length} cells (expected 4): ${JSON.stringify(r)}`,
      );
    }
    const [targetRaw, pronunciation, translation, examplesRaw] = r;
    const target = targetRaw.normalize('NFC').trim();
    if (target.startsWith(CSV_HEADER_FIRST_CELL_PREFIX)) continue;
    if (!target) continue;

    const hit = headwordIndex.get(target.toLowerCase());

    if (hit) {
      const word = findWord(vocab, hit.categoryKey, hit.n);
      if (!word) {
        throw new Error(`Headword index referenced missing word ${hit.categoryKey}#${hit.n}`);
      }
      const incoming = splitSentences(examplesRaw);
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
      if (additions.length > 0) {
        const all = [...existing, ...additions];
        const joined = all.join(' ');
        word.examples = /[.!?]$/.test(joined) ? joined : joined + '.';
      }
      matched += 1;
    } else {
      unmatched.push({
        target,
        pronunciation: pronunciation.normalize('NFC').trim(),
        translation: translation.normalize('NFC').trim(),
        examples: examplesRaw.normalize('NFC').trim(),
      });
    }
  }

  await writeFile(vocabFile, JSON.stringify(vocab, null, 2) + '\n', 'utf8');

  const unmatchedPath = resolve(storyDir, 'unmatched.json');
  if (unmatched.length > 0) {
    await writeFile(unmatchedPath, JSON.stringify(unmatched, null, 2) + '\n', 'utf8');
  }

  const dataRowCount = matched + unmatched.length;
  console.log(`Pair:              ${pair}`);
  console.log(`CSV:               ${csvPath}`);
  console.log(`Data rows:         ${dataRowCount}`);
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
