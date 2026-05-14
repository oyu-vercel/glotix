import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, basename, extname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');
const drillsDir = resolve(repoRoot, 'docs', 'drills');
const vocabFile = resolve(repoRoot, 'web', 'public', 'assets', 'vocabulary.json');
const outDir = resolve(repoRoot, 'web', 'public', 'assets', 'drills');
const indexFile = resolve(repoRoot, 'web', 'public', 'assets', 'drills-index.json');

const CSV_HEADER_FIRST_CELL = 'italian phrase';
const STOP_WORDS = new Set(['of', 'the', 'in', 'a', 'and', 'an', 'on', 'at', 'to', 'for']);

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  let i = 0;
  const n = text.length;
  while (i < n) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      cell += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ',') {
      row.push(cell);
      cell = '';
      i += 1;
      continue;
    }
    if (ch === '\r') {
      i += 1;
      continue;
    }
    if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      i += 1;
      continue;
    }
    cell += ch;
    i += 1;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function splitLines(s) {
  if (!s) return [];
  return s
    .normalize('NFC')
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
}

function buildHeadwordMap(vocab) {
  const map = new Map();
  for (const cat of vocab.categories) {
    for (const w of cat.words) {
      const variants = w.italian.split('/').map((s) => s.normalize('NFC').trim().toLowerCase());
      for (const v of variants) {
        if (v && !map.has(v)) map.set(v, { categoryKey: cat.key, n: w.n });
      }
    }
  }
  return map;
}

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
  const rows = parseCsv(csvText);
  const title = deriveTitle(slug);
  const wordOrder = [];
  const patterns = [];
  const missingWords = [];

  for (let rIdx = 0; rIdx < rows.length; rIdx++) {
    const r = rows[rIdx];
    if (r.length === 0 || (r.length === 1 && r[0] === '')) continue;
    if (r.length < 5) {
      throw new Error(`Row ${rIdx + 1} in drill "${slug}" has ${r.length} cells (expected 5)`);
    }
    const [italianRaw, , , italianExamplesRaw, russianExamplesRaw] = r;
    const italian = italianRaw.normalize('NFC').trim();
    if (italian.toLowerCase() === CSV_HEADER_FIRST_CELL) continue;
    if (!italian) continue;

    const hit = headwordMap.get(italian.toLowerCase());
    if (hit) {
      wordOrder.push({ category: hit.categoryKey, n: hit.n });
    } else {
      missingWords.push(italian);
    }

    const italianLines = splitLines(italianExamplesRaw);
    const russianLines = splitLines(russianExamplesRaw);
    if (italianLines.length !== russianLines.length) {
      throw new Error(
        `Row ${rIdx + 1} (${italian}) in drill "${slug}": italian/russian example line counts differ (${italianLines.length} vs ${russianLines.length})`,
      );
    }
    for (let i = 0; i < italianLines.length; i++) {
      patterns.push({ italian: italianLines[i], russian: russianLines[i] });
    }
  }

  return { drill: { slug, title, wordOrder, patterns }, missingWords };
}

async function main() {
  const vocab = JSON.parse(await readFile(vocabFile, 'utf8'));
  const headwordMap = buildHeadwordMap(vocab);

  const drills = await discoverDrills(drillsDir);

  await mkdir(dirname(indexFile), { recursive: true });

  if (drills.length === 0) {
    console.log(`No drill CSVs under ${drillsDir} — nothing to build.`);
    await writeFile(
      indexFile,
      JSON.stringify({ language: vocab.language, level: vocab.level, drills: [] }, null, 2) + '\n',
      'utf8',
    );
    return;
  }

  const seen = new Map();
  for (const d of drills) {
    if (seen.has(d.slug)) {
      throw new Error(`Duplicate drill slug "${d.slug}": ${seen.get(d.slug)} and ${d.csvPath}`);
    }
    seen.set(d.slug, d.csvPath);
  }

  await mkdir(outDir, { recursive: true });

  const existingOut = await readdir(outDir, { withFileTypes: true });
  for (const ent of existingOut) {
    if (ent.isFile() && /\.json$/i.test(ent.name)) {
      await rm(resolve(outDir, ent.name));
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
    const outPath = resolve(outDir, `${slug}.json`);
    await writeFile(outPath, JSON.stringify(drill, null, 2) + '\n', 'utf8');
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
      `\n${skipped.length} drill(s) skipped — run merge-drill-words.mjs + append-words.mjs first.`,
    );
  }

  const index = { language: vocab.language, level: vocab.level, drills: indexEntries };
  await writeFile(indexFile, JSON.stringify(index, null, 2) + '\n', 'utf8');
  console.log(`\nWrote ${indexFile}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
