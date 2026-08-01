export function buildHeadwordMap(vocab) {
  const map = new Map();
  for (const cat of vocab.categories) {
    for (const w of cat.words) {
      const variants = w.target.split('/').map((s) => s.normalize('NFC').trim().toLowerCase());
      for (const v of variants) {
        if (v && !map.has(v)) map.set(v, { categoryKey: cat.key, n: w.n });
      }
    }
  }
  return map;
}

export function findWord(vocab, categoryKey, n) {
  const cat = vocab.categories.find((c) => c.key === categoryKey);
  if (!cat) return null;
  return cat.words.find((w) => w.n === n) ?? null;
}
