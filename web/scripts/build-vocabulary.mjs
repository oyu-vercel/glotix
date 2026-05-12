import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { parse } from 'csv-parse/sync';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const repoRoot = resolve(__dirname, '..', '..');
export const csvDir = resolve(repoRoot, 'docs', 'words', 'italian', 'a2');
const outFile = resolve(repoRoot, 'web', 'public', 'assets', 'vocabulary-italian-a2.json');

export const CATEGORIES = [
  { key: 'noun', label: 'Nouns' },
  { key: 'verb', label: 'Verbs' },
  { key: 'adjective', label: 'Adjectives' },
  { key: 'adverb', label: 'Adverbs' },
  { key: 'article', label: 'Articles' },
  { key: 'conjunction', label: 'Conjunctions' },
  { key: 'interjection', label: 'Interjections' },
  { key: 'preposition', label: 'Prepositions' },
  { key: 'pronoun', label: 'Pronouns' },
];

function sortKey(italian) {
  return italian.split('/')[0].trim();
}

export async function loadCategory({ key, label }) {
  const csvPath = resolve(csvDir, `${key}.csv`);
  const raw = await readFile(csvPath, 'utf8');
  const rows = parse(raw, {
    bom: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: false,
  });
  const dataRows = rows.slice(1);
  const words = dataRows
    .filter((row) => row[0] && row[0].trim().length > 0)
    .map((row) => ({
      italian: row[0],
      pronunciation: row[1] ?? '',
      translation: row[2] ?? '',
      examples: row[3] ?? '',
    }));
  words.sort((a, b) =>
    sortKey(a.italian).localeCompare(sortKey(b.italian), 'it', { sensitivity: 'base' }),
  );
  return {
    key,
    label,
    words: words.map((w, i) => ({ n: i + 1, ...w })),
  };
}

export async function loadVocabulary() {
  const categories = await Promise.all(CATEGORIES.map(loadCategory));
  return { language: 'italian', level: 'a2', categories };
}

async function main() {
  const vocab = await loadVocabulary();
  await mkdir(dirname(outFile), { recursive: true });
  await writeFile(outFile, JSON.stringify(vocab, null, 2) + '\n', 'utf8');
  for (const c of vocab.categories) {
    console.log(
      `${c.key.padEnd(14)} ${String(c.words.length).padStart(3)} words` +
        (c.words[0] ? `  (first: ${c.words[0].italian})` : ''),
    );
  }
  console.log(`\nWrote ${outFile}`);
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
