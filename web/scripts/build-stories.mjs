import { readFile, writeFile, mkdir, readdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, basename, extname } from 'node:path';
import { parse } from 'csv-parse/sync';

import { CATEGORIES, loadVocabulary } from './build-vocabulary.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');
const storiesDir = resolve(repoRoot, 'docs', 'stories');
const outDir = resolve(repoRoot, 'web', 'public', 'assets', 'stories');
const indexFile = resolve(repoRoot, 'web', 'public', 'assets', 'stories-index.json');

function tokenize(text) {
  return text
    .normalize('NFC')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 0 && !/^\d+$/.test(t));
}

function isElisionRemnant(t) {
  return t.length === 1 && /^[a-z]$/.test(t);
}

async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function loadExtras(dir, slug) {
  const path = resolve(dir, `${slug}.extras.csv`);
  if (!(await fileExists(path))) return [];
  const raw = await readFile(path, 'utf8');
  const rows = parse(raw, {
    bom: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  });
  const out = [];
  for (const row of rows) {
    if (!row[0] || !row[1]) continue;
    if (row[0].toLowerCase() === 'category' && row[1].toLowerCase() === 'italian') continue;
    out.push({
      category: row[0],
      italian: row[1],
      pronunciation: row[2] ?? '',
      translation: row[3] ?? '',
      examples: row[4] ?? '',
    });
  }
  return out;
}

function buildHeadwordMap(a2vocab) {
  const map = new Map();
  for (const cat of a2vocab.categories) {
    for (const w of cat.words) {
      const variants = w.italian.split('/').map((s) => s.trim().toLowerCase());
      for (const v of variants) {
        if (v && !map.has(v)) map.set(v, { word: w, category: cat });
      }
    }
  }
  return map;
}

function buildIndirectMap(a2vocab, headwordMap) {
  const map = new Map();
  for (const cat of a2vocab.categories) {
    for (const w of cat.words) {
      if (!w.examples) continue;
      const tokens = new Set(tokenize(w.examples));
      for (const tok of tokens) {
        if (headwordMap.has(tok)) continue;
        if (!map.has(tok)) map.set(tok, { word: w, category: cat });
      }
    }
  }
  return map;
}

function deriveTitle(rawText) {
  const lines = rawText.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 0) return trimmed.replace(/\.$/, '');
  }
  return '';
}

function paragraphCount(rawText) {
  return rawText.split(/\r?\n/).filter((line) => line.trim().length > 0).length;
}

function sortItalian(a, b) {
  return a.italian.localeCompare(b.italian, 'it', { sensitivity: 'base' });
}

async function buildStory(slug, dir, rawText, headwordMap, indirectMap) {
  const title = deriveTitle(rawText);
  const tokens = new Set(tokenize(rawText));

  const catMap = new Map();
  for (const c of CATEGORIES) {
    catMap.set(c.key, { key: c.key, label: c.label, words: [] });
  }

  const matchedTokens = new Set();
  const emittedItalians = new Set();

  function emit(category, word) {
    const key = word.italian.toLowerCase();
    if (emittedItalians.has(key)) return;
    catMap.get(category.key).words.push({
      italian: word.italian,
      pronunciation: word.pronunciation ?? '',
      translation: word.translation ?? '',
      examples: word.examples ?? '',
    });
    emittedItalians.add(key);
  }

  for (const tok of tokens) {
    const direct = headwordMap.get(tok);
    if (direct) {
      emit(direct.category, direct.word);
      matchedTokens.add(tok);
      continue;
    }
    const indirect = indirectMap.get(tok);
    if (indirect) {
      emit(indirect.category, indirect.word);
      matchedTokens.add(tok);
      continue;
    }
  }

  // Mark all tokens of A2-matched headwords' example sentences? No — we only mark
  // the story tokens that successfully matched. Tokens that fall through go to stubs.
  // But we should also mark every token whose tokenization equals the italian of
  // anything we emitted (handles slash-variant entries).
  for (const italLower of emittedItalians) {
    for (const sub of tokenize(italLower)) matchedTokens.add(sub);
  }

  // Apply extras (override)
  const extras = await loadExtras(dir, slug);
  for (const row of extras) {
    const catKey = row.category.toLowerCase();
    const cat = catMap.get(catKey);
    if (!cat) {
      console.warn(`  [${slug}] extras: unknown category "${row.category}" — skipped`);
      continue;
    }
    const italLower = row.italian.toLowerCase();
    cat.words = cat.words.filter((w) => w.italian.toLowerCase() !== italLower);
    cat.words.push({
      italian: row.italian,
      pronunciation: row.pronunciation,
      translation: row.translation,
      examples: row.examples,
    });
    emittedItalians.add(italLower);
    for (const sub of tokenize(row.italian)) matchedTokens.add(sub);
    for (const sub of tokenize(row.examples)) matchedTokens.add(sub);
  }

  const untranslated = [];
  for (const tok of tokens) {
    if (matchedTokens.has(tok)) continue;
    if (isElisionRemnant(tok)) continue;
    untranslated.push(tok);
  }
  untranslated.sort((a, b) => a.localeCompare(b, 'it', { sensitivity: 'base' }));

  const a2Headwords = new Set(headwordMap.keys());
  const categories = [];
  for (const c of CATEGORIES) {
    const cat = catMap.get(c.key);
    cat.words.sort(sortItalian);
    cat.words = cat.words.map((w, i) => {
      const out = { n: i + 1, ...w };
      if (!a2Headwords.has(w.italian.toLowerCase())) out.extras = true;
      return out;
    });
    categories.push(cat);
  }

  return {
    slug,
    title,
    text: rawText,
    vocabulary: { language: 'italian', level: 'a2', categories },
    untranslated,
  };
}

async function discoverStories(rootDir) {
  const found = [];
  async function walk(dir) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const full = resolve(dir, ent.name);
      if (ent.isDirectory()) {
        await walk(full);
      } else if (ent.isFile() && extname(ent.name).toLowerCase() === '.txt') {
        found.push({ slug: basename(ent.name, '.txt'), txtPath: full, dir });
      }
    }
  }
  await walk(rootDir);
  found.sort((a, b) => a.slug.localeCompare(b.slug));
  return found;
}

async function main() {
  const a2vocab = await loadVocabulary();
  const headwordMap = buildHeadwordMap(a2vocab);
  const indirectMap = buildIndirectMap(a2vocab, headwordMap);

  const stories = await discoverStories(storiesDir);

  if (stories.length === 0) {
    console.log(`No .txt files under ${storiesDir} — nothing to build.`);
    await mkdir(dirname(indexFile), { recursive: true });
    await writeFile(
      indexFile,
      JSON.stringify({ language: 'italian', level: 'a2', stories: [] }, null, 2) + '\n',
      'utf8',
    );
    return;
  }

  const seen = new Map();
  for (const s of stories) {
    if (seen.has(s.slug)) {
      throw new Error(
        `Duplicate story slug "${s.slug}": ${seen.get(s.slug)} and ${s.txtPath}`,
      );
    }
    seen.set(s.slug, s.txtPath);
  }

  await mkdir(outDir, { recursive: true });

  const indexEntries = [];
  for (const { slug, txtPath, dir } of stories) {
    const raw = await readFile(txtPath, 'utf8');
    const story = await buildStory(slug, dir, raw, headwordMap, indirectMap);
    const outPath = resolve(outDir, `${slug}.json`);
    await writeFile(outPath, JSON.stringify(story, null, 2) + '\n', 'utf8');
    const vocabCount = story.vocabulary.categories.reduce((s, c) => s + c.words.length, 0);
    indexEntries.push({
      slug,
      title: story.title,
      paragraphs: paragraphCount(raw),
      vocabCount,
      untranslatedCount: story.untranslated.length,
    });
    console.log(
      `${slug.padEnd(24)} ${String(vocabCount).padStart(3)} vocab  ${String(
        story.untranslated.length,
      ).padStart(3)} untranslated`,
    );
  }

  const index = { language: 'italian', level: 'a2', stories: indexEntries };
  await writeFile(indexFile, JSON.stringify(index, null, 2) + '\n', 'utf8');
  console.log(`\nWrote ${indexFile}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
