import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { splitSentences, joinExamples } from './lib/sentences.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');
const vocabFile = resolve(repoRoot, 'web', 'public', 'assets', 'vocabulary.json');

const MAX_EXAMPLES = 10;

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: node web/scripts/append-words.mjs <unmatched.json>');
    process.exit(2);
  }
  const inputPath = resolve(process.cwd(), arg);

  const vocab = JSON.parse(await readFile(vocabFile, 'utf8'));
  const allowedKeys = new Set(vocab.categories.map((c) => c.key));

  const input = JSON.parse(await readFile(inputPath, 'utf8'));
  if (!Array.isArray(input)) {
    throw new Error(`${inputPath} must contain a JSON array`);
  }

  const bad = [];
  for (let i = 0; i < input.length; i++) {
    const row = input[i];
    if (!row || typeof row !== 'object') {
      bad.push(`row ${i}: not an object`);
      continue;
    }
    if (!row.category || !allowedKeys.has(row.category)) {
      bad.push(
        `row ${i} (${row.italian ?? '<no italian>'}): category=${JSON.stringify(row.category)} not in allowed set`,
      );
    }
    for (const f of ['italian', 'pronunciation', 'translation']) {
      if (typeof row[f] !== 'string' || row[f].length === 0) {
        bad.push(`row ${i} (${row.italian ?? '<no italian>'}): missing field "${f}"`);
      }
    }
  }
  if (bad.length > 0) {
    console.error('Validation failed:');
    for (const b of bad) console.error('  ' + b);
    process.exit(1);
  }

  const insertCounts = {};
  for (const key of allowedKeys) insertCounts[key] = 0;

  for (const row of input) {
    const cat = vocab.categories.find((c) => c.key === row.category);
    const maxN = cat.words.reduce((m, w) => (w.n > m ? w.n : m), 0);
    const sentences = splitSentences(row.examples ?? '').slice(0, MAX_EXAMPLES);
    cat.words.push({
      n: maxN + 1,
      italian: row.italian,
      pronunciation: row.pronunciation,
      translation: row.translation,
      examples: joinExamples(sentences),
    });
    insertCounts[row.category] += 1;
  }

  await writeFile(vocabFile, JSON.stringify(vocab, null, 2) + '\n', 'utf8');

  console.log(`Appended ${input.length} word(s) to vocabulary.json:`);
  for (const key of Object.keys(insertCounts)) {
    if (insertCounts[key] > 0) {
      console.log(`  ${key.padEnd(14)} +${insertCounts[key]}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
