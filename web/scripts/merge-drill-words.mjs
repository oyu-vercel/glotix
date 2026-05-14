import { readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');
const vocabFile = resolve(repoRoot, 'web', 'public', 'assets', 'vocabulary.json');

const MAX_EXAMPLES = 10;
const CSV_HEADER_FIRST_CELL = 'italian phrase';

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

function splitSentencesByPeriod(s) {
  if (!s) return [];
  return s
    .normalize('NFC')
    .split(/(?<=[.!?])\s+/)
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
}

function dedupKey(sentence) {
  return sentence
    .normalize('NFC')
    .toLowerCase()
    .replace(/[.!?]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildHeadwordIndex(vocab) {
  const map = new Map();
  for (const cat of vocab.categories) {
    for (const w of cat.words) {
      const variants = w.italian.split('/').map((s) => s.normalize('NFC').trim().toLowerCase());
      for (const v of variants) {
        if (v && !map.has(v)) {
          map.set(v, { categoryKey: cat.key, n: w.n });
        }
      }
    }
  }
  return map;
}

function findWord(vocab, categoryKey, n) {
  const cat = vocab.categories.find((c) => c.key === categoryKey);
  if (!cat) return null;
  return cat.words.find((w) => w.n === n) ?? null;
}

async function discoverCsv(drillDir) {
  const entries = await readdir(drillDir, { withFileTypes: true });
  const csvs = entries
    .filter((e) => e.isFile() && /\.csv$/i.test(e.name))
    .map((e) => resolve(drillDir, e.name));
  if (csvs.length === 0) {
    throw new Error(`No *.csv found in ${drillDir}`);
  }
  if (csvs.length > 1) {
    throw new Error(`Multiple *.csv found in ${drillDir}: ${csvs.join(', ')}`);
  }
  return csvs[0];
}

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: node web/scripts/merge-drill-words.mjs <drillFolder>');
    process.exit(2);
  }
  const drillDir = resolve(process.cwd(), arg);
  const csvPath = await discoverCsv(drillDir);

  const csvText = await readFile(csvPath, 'utf8');
  const rows = parseCsv(csvText);

  const vocab = JSON.parse(await readFile(vocabFile, 'utf8'));
  const headwordIndex = buildHeadwordIndex(vocab);

  let matched = 0;
  let examplesAdded = 0;
  let examplesSkippedCap = 0;
  const unmatched = [];

  for (let rIdx = 0; rIdx < rows.length; rIdx++) {
    const r = rows[rIdx];
    if (r.length === 0 || (r.length === 1 && r[0] === '')) continue;
    if (r.length < 5) {
      throw new Error(
        `Row ${rIdx + 1} in ${csvPath} has ${r.length} cells (expected 5): ${JSON.stringify(r)}`,
      );
    }
    const [italianRaw, pronunciation, translation, examplesRaw] = r;
    const italian = italianRaw.normalize('NFC').trim();
    if (italian.toLowerCase() === CSV_HEADER_FIRST_CELL) continue;
    if (!italian) continue;

    const key = italian.toLowerCase();
    const hit = headwordIndex.get(key);

    if (hit) {
      const word = findWord(vocab, hit.categoryKey, hit.n);
      if (!word) {
        throw new Error(`Headword index referenced missing word ${hit.categoryKey}#${hit.n}`);
      }
      const incoming = splitLines(examplesRaw);
      const existing = splitSentencesByPeriod(word.examples ?? '');
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
      const incoming = splitLines(examplesRaw);
      const joined = incoming.join(' ');
      const examples = joined.length === 0 ? '' : /[.!?]$/.test(joined) ? joined : joined + '.';
      unmatched.push({
        italian,
        pronunciation: pronunciation.normalize('NFC').trim(),
        translation: translation.normalize('NFC').trim(),
        examples,
      });
    }
  }

  await writeFile(vocabFile, JSON.stringify(vocab, null, 2) + '\n', 'utf8');

  const unmatchedPath = resolve(drillDir, 'unmatched.json');
  if (unmatched.length > 0) {
    await writeFile(unmatchedPath, JSON.stringify(unmatched, null, 2) + '\n', 'utf8');
  }

  const dataRowCount = matched + unmatched.length;
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
