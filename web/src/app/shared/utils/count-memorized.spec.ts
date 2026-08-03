import { Category, Vocabulary, Word } from '../../vocabulary/vocabulary.types';
import { countMemorizedInVocabulary } from './count-memorized';

/**
 * Characterization spec: locks in how `countMemorizedInVocabulary` intersects the memorized set
 * with a vocabulary before the refactor. Everything here describes today's behaviour.
 */
describe('countMemorizedInVocabulary', () => {
  function word(n: number, target: string): Word {
    return { n, target, pronunciation: `p${n}`, translation: `t${n}`, examples: `e${n}` };
  }

  function category(key: string, words: Word[]): Category {
    return { key, label: `${key} label`, words };
  }

  function vocabulary(categories: Category[]): Vocabulary {
    return { categories };
  }

  describe('counting', () => {
    it('returns 0 for an empty vocabulary', () => {
      expect(countMemorizedInVocabulary(vocabulary([]), new Set(['alpha']))).toBe(0);
    });

    it('returns 0 for an empty memorized set', () => {
      const vocab = vocabulary([category('c1', [word(1, 'alpha'), word(2, 'beta')])]);
      expect(countMemorizedInVocabulary(vocab, new Set())).toBe(0);
    });

    it('counts the words whose target is in the set', () => {
      const vocab = vocabulary([category('c1', [word(1, 'alpha'), word(2, 'beta')])]);
      expect(countMemorizedInVocabulary(vocab, new Set(['alpha']))).toBe(1);
    });

    it('counts across every category', () => {
      const vocab = vocabulary([
        category('c1', [word(1, 'alpha'), word(2, 'beta')]),
        category('c2', [word(3, 'gamma')]),
      ]);
      expect(countMemorizedInVocabulary(vocab, new Set(['alpha', 'gamma']))).toBe(2);
    });

    it('ignores a memorized target that is absent from the vocabulary', () => {
      const vocab = vocabulary([category('c1', [word(1, 'alpha')])]);
      expect(countMemorizedInVocabulary(vocab, new Set(['alpha', 'nowhere']))).toBe(1);
    });

    it('counts only the vocabulary side, so a set larger than the vocabulary is capped', () => {
      const vocab = vocabulary([category('c1', [word(1, 'alpha')])]);
      expect(countMemorizedInVocabulary(vocab, new Set(['delta', 'epsilon']))).toBe(0);
    });

    it('counts the same target twice when it appears in two categories', () => {
      const vocab = vocabulary([
        category('c1', [word(1, 'alpha')]),
        category('c2', [word(2, 'alpha')]),
      ]);
      // The count is per word entry, not per distinct target, so it can exceed the set size.
      expect(countMemorizedInVocabulary(vocab, new Set(['alpha']))).toBe(2);
    });

    it('counts the same target twice when it is duplicated inside one category', () => {
      const vocab = vocabulary([category('c1', [word(1, 'alpha'), word(2, 'alpha')])]);
      expect(countMemorizedInVocabulary(vocab, new Set(['alpha']))).toBe(2);
    });

    it('matches the target exactly, so case differences do not count', () => {
      const vocab = vocabulary([category('c1', [word(1, 'alpha')])]);
      expect(countMemorizedInVocabulary(vocab, new Set(['Alpha']))).toBe(0);
    });

    it('matches the target exactly, so surrounding whitespace does not count', () => {
      const vocab = vocabulary([category('c1', [word(1, 'alpha')])]);
      expect(countMemorizedInVocabulary(vocab, new Set([' alpha']))).toBe(0);
    });

    it('ignores categories with no words', () => {
      const vocab = vocabulary([category('c1', []), category('c2', [word(1, 'alpha')])]);
      expect(countMemorizedInVocabulary(vocab, new Set(['alpha']))).toBe(1);
    });

    it('does not mutate the memorized set', () => {
      const vocab = vocabulary([category('c1', [word(1, 'alpha')])]);
      const memorized = new Set(['alpha']);
      countMemorizedInVocabulary(vocab, memorized);
      expect([...memorized]).toEqual(['alpha']);
    });
  });
});
