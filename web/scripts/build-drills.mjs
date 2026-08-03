import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { dirname, resolve, basename, extname } from 'node:path';

import { dataRows, parseCsv } from './lib/csv.mjs';
import { splitLines } from './lib/sentences.mjs';
import { buildHeadwordMap } from './lib/vocab.mjs';
import { pairPaths, resolvePairs } from './lib/pairs.mjs';

const STOP_WORDS = new Set(['of', 'the', 'in', 'a', 'and', 'an', 'on', 'at', 'to', 'for']);

function deriveTitle(slug) {
  return slug
    .split('-')
    .map((word, i) => {
      if (i > 0 && STOP_WORDS.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

async function discoverDrills(rootDir) {
  const found = [];
  let entries;
  try {
    entries = await readdir(rootDir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const dirPath = resolve(rootDir, ent.name);
    const files = await readdir(dirPath, { withFileTypes: true });
    const csvs = files.filter((f) => f.isFile() && /\.csv$/i.test(f.name));
    if (csvs.length === 0) continue;
    if (csvs.length > 1) {
      throw new Error(`Multiple CSV files in ${dirPath}: ${csvs.map((c) => c.name).join(', ')}`);
    }
    const csvPath = resolve(dirPath, csvs[0].name);
    const slug = basename(csvs[0].name, extname(csvs[0].name));
    found.push({ slug, folder: ent.name, csvPath });
  }
  found.sort((a, b) => a.folder.localeCompare(b.folder));
  return found;
}

function buildDrill(slug, csvText, headwordMap) {
  const rows = dataRows(parseCsv(csvText), headwordMap, `drill "${slug}"`);
  const title = deriveTitle(slug);
  const wordOrder = [];
  const patterns = [];
  const missingWords = [];

  for (const { cells, target, rowNumber } of rows) {
    if (cells.length < 5) {
      throw new Error(`Row ${rowNumber} in drill "${slug}" has ${cells.length} cells (expected 5)`);
    }
    const [, , , targetExamplesRaw, nativeExamplesRaw] = cells;

    const hit = headwordMap.get(target.toLowerCase());
    if (hit) {
      wordOrder.push({ category: hit.categoryKey, n: hit.n });
    } else {
      missingWords.push(target);
    }

    const targetLines = splitLines(targetExamplesRaw);
    const nativeLines = splitLines(nativeExamplesRaw);
    if (targetLines.length !== nativeLines.length) {
      throw new Error(
        `Row ${rowNumber} (${target}) in drill "${slug}": target/native example line counts differ (${targetLines.length} vs ${nativeLines.length})`,
      );
    }
    for (let i = 0; i < targetLines.length; i++) {
      patterns.push({ target: targetLines[i], native: nativeLines[i] });
    }
  }

  return { drill: { slug, title, wordOrder, patterns }, missingWords };
}

async function buildPair(paths) {
  const { pair, drillsSrc, vocabFile, drillsOut, drillsIndex } = paths;
  console.log(`\n=== ${pair} ===`);

  const vocab = JSON.parse(await readFile(vocabFile, 'utf8'));
  const headwordMap = buildHeadwordMap(vocab);

  const drills = await discoverDrills(drillsSrc);

  await mkdir(dirname(drillsIndex), { recursive: true });

  if (drills.length === 0) {
    console.log(`No drill CSVs under ${drillsSrc} — nothing to build.`);
    await writeFile(drillsIndex, JSON.stringify({ drills: [] }, null, 2) + '\n', 'utf8');
    return;
  }

  const seen = new Map();
  for (const d of drills) {
    if (seen.has(d.slug)) {
      throw new Error(`Duplicate drill slug "${d.slug}": ${seen.get(d.slug)} and ${d.csvPath}`);
    }
    seen.set(d.slug, d.csvPath);
  }

  await mkdir(drillsOut, { recursive: true });

  const existingOut = await readdir(drillsOut, { withFileTypes: true });
  for (const ent of existingOut) {
    if (ent.isFile() && /\.json$/i.test(ent.name)) {
      await rm(resolve(drillsOut, ent.name));
    }
  }

  const indexEntries = [];
  const skipped = [];
  for (const { slug, csvPath } of drills) {
    const csvText = await readFile(csvPath, 'utf8');
    const { drill, missingWords } = buildDrill(slug, csvText, headwordMap);
    if (missingWords.length > 0) {
      skipped.push({ slug, missingWords });
      console.warn(
        `${slug.padEnd(28)} SKIPPED — ${missingWords.length} word(s) not in vocabulary.json: ${missingWords.join(', ')}`,
      );
      continue;
    }
    await writeFile(
      resolve(drillsOut, `${slug}.json`),
      JSON.stringify(drill, null, 2) + '\n',
      'utf8',
    );
    const wordCount = drill.wordOrder.length;
    indexEntries.push({
      slug,
      title: drill.title,
      wordCount,
      patternCount: drill.patterns.length,
    });
    console.log(
      `${slug.padEnd(28)} ${String(wordCount).padStart(3)} words  ${String(drill.patterns.length).padStart(4)} patterns`,
    );
  }
  if (skipped.length > 0) {
    console.warn(
      `\n${skipped.length} drill(s) skipped — run merge-csv-words.mjs + append-words.mjs first.`,
    );
  }

  await writeFile(drillsIndex, JSON.stringify({ drills: indexEntries }, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${drillsIndex}`);
}

async function main() {
  const pairs = await resolvePairs(process.argv[2]);
  for (const pair of pairs) {
    await buildPair(pairPaths(pair));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
