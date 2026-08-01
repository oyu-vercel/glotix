import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { dirname, resolve, basename, extname } from 'node:path';

import { buildHeadwordMap } from './lib/vocab.mjs';
import { pairPaths, resolvePairs } from './lib/pairs.mjs';

function tokenize(text) {
  return text
    .normalize('NFC')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 0 && !/^\d+$/.test(t));
}

function buildIndirectMap(vocab, headwordMap) {
  const map = new Map();
  for (const cat of vocab.categories) {
    for (const w of cat.words) {
      if (!w.examples) continue;
      const tokens = new Set(tokenize(w.examples));
      for (const tok of tokens) {
        if (headwordMap.has(tok)) continue;
        if (!map.has(tok)) map.set(tok, { categoryKey: cat.key, n: w.n });
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

function buildStory(slug, rawText, categoryKeys, headwordMap, indirectMap) {
  const title = deriveTitle(rawText);
  const tokens = new Set(tokenize(rawText));

  const refs = new Map();
  for (const key of categoryKeys) refs.set(key, new Set());

  for (const tok of tokens) {
    const hit = headwordMap.get(tok) ?? indirectMap.get(tok);
    if (hit) refs.get(hit.categoryKey).add(hit.n);
  }

  const vocabulary = {};
  for (const key of categoryKeys) {
    const ns = [...refs.get(key)].sort((a, b) => a - b);
    if (ns.length > 0) vocabulary[key] = ns;
  }

  return { slug, title, text: rawText, vocabulary };
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
        found.push({ slug: basename(ent.name, '.txt'), txtPath: full });
      }
    }
  }
  await walk(rootDir);
  found.sort((a, b) => a.slug.localeCompare(b.slug));
  return found;
}

async function buildPair(paths) {
  const { pair, storiesSrc, vocabFile, storiesOut, storiesIndex } = paths;
  console.log(`\n=== ${pair} ===`);

  const vocab = JSON.parse(await readFile(vocabFile, 'utf8'));
  const categoryKeys = vocab.categories.map((c) => c.key);
  const headwordMap = buildHeadwordMap(vocab);
  const indirectMap = buildIndirectMap(vocab, headwordMap);

  const stories = await discoverStories(storiesSrc);

  await mkdir(dirname(storiesIndex), { recursive: true });

  if (stories.length === 0) {
    console.log(`No .txt files under ${storiesSrc} — nothing to build.`);
    await writeFile(storiesIndex, JSON.stringify({ stories: [] }, null, 2) + '\n', 'utf8');
    return;
  }

  const seen = new Map();
  for (const s of stories) {
    if (seen.has(s.slug)) {
      throw new Error(`Duplicate story slug "${s.slug}": ${seen.get(s.slug)} and ${s.txtPath}`);
    }
    seen.set(s.slug, s.txtPath);
  }

  await mkdir(storiesOut, { recursive: true });

  const indexEntries = [];
  for (const { slug, txtPath } of stories) {
    const raw = await readFile(txtPath, 'utf8');
    const story = buildStory(slug, raw, categoryKeys, headwordMap, indirectMap);
    await writeFile(resolve(storiesOut, `${slug}.json`), JSON.stringify(story, null, 2) + '\n', 'utf8');
    const vocabCount = Object.values(story.vocabulary).reduce((s, ns) => s + ns.length, 0);
    indexEntries.push({
      slug,
      title: story.title,
      paragraphs: paragraphCount(raw),
      vocabCount,
    });
    console.log(`${slug.padEnd(24)} ${String(vocabCount).padStart(3)} vocab`);
  }

  await writeFile(storiesIndex, JSON.stringify({ stories: indexEntries }, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${storiesIndex}`);
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
