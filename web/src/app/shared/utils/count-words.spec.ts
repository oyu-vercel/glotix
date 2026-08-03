import { Category, Word } from '../../vocabulary/vocabulary.types';
import { countWords } from './count-words';

/**
 * Characterization spec: locks in how `countWords` totals a category list before the refactor.
 */
describe('countWords', () => {
  function word(n: number, target: string): Word {
    return { n, target, pronunciation: `p${n}`, translation: `t${n}`, examples: `e${n}` };
  }

  function category(key: string, words: Word[]): Category {
    return { key, label: `${key} label`, words };
  }

  describe('summing', () => {
    it('returns 0 for an empty category list', () => {
      expect(countWords([])).toBe(0);
    });

    it('returns 0 when every category is empty', () => {
      expect(countWords([category('c1', []), category('c2', [])])).toBe(0);
    });

    it('counts the words of a single category', () => {
      expect(countWords([category('c1', [word(1, 'alpha'), word(2, 'beta')])])).toBe(2);
    });

    it('sums across categories', () => {
      const categories = [
        category('c1', [word(1, 'alpha'), word(2, 'beta')]),
        category('c2', [word(3, 'gamma')]),
        category('c3', []),
      ];
      expect(countWords(categories)).toBe(3);
    });

    it('counts a repeated target twice', () => {
      const categories = [category('c1', [word(1, 'alpha')]), category('c2', [word(2, 'alpha')])];
      expect(countWords(categories)).toBe(2);
    });

    it('does not mutate the input', () => {
      const categories = [category('c1', [word(1, 'alpha')])];
      countWords(categories);
      expect(categories).toEqual([category('c1', [word(1, 'alpha')])]);
    });
  });
});
