import { vi } from 'vitest';

import { shuffle } from './shuffle';

/**
 * Characterization spec: locks in the Fisher-Yates behaviour of `shuffle` before the refactor.
 * `Math.random` is stubbed so the resulting permutation is asserted exactly, not just as a
 * "same members" property.
 */
describe('shuffle', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('array contract', () => {
    it('returns a new array rather than the input', () => {
      const input = ['w1', 'w2', 'w3'];
      expect(shuffle(input)).not.toBe(input);
    });

    it('leaves the input untouched', () => {
      const input = ['w1', 'w2', 'w3', 'w4'];
      shuffle(input);
      expect(input).toEqual(['w1', 'w2', 'w3', 'w4']);
    });

    it('keeps the length', () => {
      expect(shuffle(['w1', 'w2', 'w3', 'w4', 'w5']).length).toBe(5);
    });

    it('keeps the same multiset of members', () => {
      const input = ['w1', 'w2', 'w3', 'w4', 'w5'];
      expect([...shuffle(input)].sort()).toEqual([...input].sort());
    });

    it('keeps duplicates as duplicates', () => {
      const input = ['w1', 'w1', 'w2'];
      expect([...shuffle(input)].sort()).toEqual(['w1', 'w1', 'w2']);
    });

    it('returns an empty array for an empty input', () => {
      expect(shuffle([])).toEqual([]);
    });

    it('returns a copy of a single-element array', () => {
      const input = ['w1'];
      const out = shuffle(input);
      expect(out).toEqual(['w1']);
      expect(out).not.toBe(input);
    });

    it('accepts a readonly array', () => {
      const input: readonly string[] = ['w1', 'w2'];
      expect([...shuffle(input)].sort()).toEqual(['w1', 'w2']);
    });

    it('works on non-string members', () => {
      const input = [{ id: 1 }, { id: 2 }];
      const out = shuffle(input);
      expect(out).toHaveLength(2);
      // Members are copied by reference, not cloned.
      expect(out).toContain(input[0]);
      expect(out).toContain(input[1]);
    });
  });

  describe('permutation with Math.random stubbed', () => {
    it('rotates the array when random always returns 0', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0);
      // j is 0 on every pass, so each element is swapped with the head in turn.
      expect(shuffle(['w1', 'w2', 'w3', 'w4'])).toEqual(['w2', 'w3', 'w4', 'w1']);
    });

    it('leaves the order unchanged when random returns just under 1', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.999999);
      // j lands on i, so every swap is a no-op.
      expect(shuffle(['w1', 'w2', 'w3', 'w4'])).toEqual(['w1', 'w2', 'w3', 'w4']);
    });

    it('produces the exact permutation for a scripted sequence of draws', () => {
      vi.spyOn(Math, 'random').mockReturnValueOnce(0.5).mockReturnValueOnce(0);
      // i=2 -> j=1 gives [w1,w3,w2]; i=1 -> j=0 gives [w3,w1,w2].
      expect(shuffle(['w1', 'w2', 'w3'])).toEqual(['w3', 'w1', 'w2']);
    });

    it('draws exactly length-1 random numbers', () => {
      const random = vi.spyOn(Math, 'random').mockReturnValue(0);
      shuffle(['w1', 'w2', 'w3', 'w4']);
      expect(random).toHaveBeenCalledTimes(3);
    });

    it('draws no random numbers for a single-element array', () => {
      const random = vi.spyOn(Math, 'random').mockReturnValue(0);
      shuffle(['w1']);
      expect(random).not.toHaveBeenCalled();
    });

    it('draws no random numbers for an empty array', () => {
      const random = vi.spyOn(Math, 'random').mockReturnValue(0);
      shuffle([]);
      expect(random).not.toHaveBeenCalled();
    });
  });
});
