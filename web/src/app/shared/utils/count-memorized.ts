import { Vocabulary } from '../../vocabulary/vocabulary.types';

export function countMemorizedInVocabulary(vocab: Vocabulary, memorized: Set<string>): number {
  let n = 0;
  for (const c of vocab.categories) {
    for (const w of c.words) {
      if (memorized.has(w.target)) n++;
    }
  }
  return n;
}
