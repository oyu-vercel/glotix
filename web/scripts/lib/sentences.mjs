export function splitSentences(s) {
  if (!s) return [];
  return s
    .normalize('NFC')
    .split(/(?<=[.!?])\s+/)
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
}

export function splitLines(s) {
  if (!s) return [];
  return s
    .normalize('NFC')
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
}

export function dedupKey(sentence) {
  return sentence
    .normalize('NFC')
    .toLowerCase()
    .replace(/[.!?]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function joinExamples(sentences) {
  if (sentences.length === 0) return '';
  const joined = sentences.join(' ');
  return /[.!?]$/.test(joined) ? joined : joined + '.';
}
