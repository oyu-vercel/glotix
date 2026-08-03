import { splitExamples } from './split-examples';

/**
 * Characterization spec: locks in how the examples blob is cut into sentences before the refactor.
 * The split is a lookbehind on sentence-ending punctuation followed by whitespace.
 */
describe('splitExamples', () => {
  describe('empty input', () => {
    it('returns an empty array for an empty string', () => {
      expect(splitExamples('')).toEqual([]);
    });

    it('returns an empty array for whitespace only', () => {
      expect(splitExamples('   ')).toEqual([]);
    });

    it('returns an empty array for newlines only', () => {
      expect(splitExamples('\n\n')).toEqual([]);
    });
  });

  describe('single sentence', () => {
    it('keeps a sentence with no trailing punctuation', () => {
      expect(splitExamples('alpha beta gamma')).toEqual(['alpha beta gamma']);
    });

    it('keeps a sentence with a trailing period', () => {
      expect(splitExamples('alpha beta.')).toEqual(['alpha beta.']);
    });

    it('trims leading and trailing whitespace', () => {
      expect(splitExamples('   alpha beta.   ')).toEqual(['alpha beta.']);
    });

    it('drops the empty fragment left after a trailing period plus space', () => {
      expect(splitExamples('alpha beta. ')).toEqual(['alpha beta.']);
    });
  });

  describe('multiple sentences', () => {
    it('splits on a period followed by a space', () => {
      expect(splitExamples('alpha beta. gamma delta.')).toEqual(['alpha beta.', 'gamma delta.']);
    });

    it('splits on an exclamation mark', () => {
      expect(splitExamples('alpha! beta.')).toEqual(['alpha!', 'beta.']);
    });

    it('splits on a question mark', () => {
      expect(splitExamples('alpha? beta.')).toEqual(['alpha?', 'beta.']);
    });

    it('splits on a mix of all three terminators', () => {
      expect(splitExamples('alpha. beta! gamma? delta')).toEqual([
        'alpha.',
        'beta!',
        'gamma?',
        'delta',
      ]);
    });

    it('splits on a newline after the terminator', () => {
      expect(splitExamples('alpha.\nbeta.')).toEqual(['alpha.', 'beta.']);
    });

    it('collapses a run of whitespace between sentences', () => {
      expect(splitExamples('alpha.    beta.')).toEqual(['alpha.', 'beta.']);
    });

    it('handles a tab plus newline between sentences', () => {
      expect(splitExamples('alpha.\t\n beta.')).toEqual(['alpha.', 'beta.']);
    });

    it('keeps the terminator on the left-hand fragment', () => {
      expect(splitExamples('alpha? beta! gamma.')).toEqual(['alpha?', 'beta!', 'gamma.']);
    });
  });

  describe('boundary cases the regex does not cover', () => {
    it('does not split when the terminator is not followed by whitespace', () => {
      expect(splitExamples('alpha.beta.')).toEqual(['alpha.beta.']);
    });

    it('splits only after the last dot of an ellipsis', () => {
      expect(splitExamples('alpha... beta.')).toEqual(['alpha...', 'beta.']);
    });

    it('splits after a one-letter abbreviation, mid sentence', () => {
      // The regex has no abbreviation awareness, so this is one sentence cut into two.
      expect(splitExamples('alpha v. beta gamma.')).toEqual(['alpha v.', 'beta gamma.']);
    });

    it('does not split on a comma or a semicolon', () => {
      expect(splitExamples('alpha, beta; gamma')).toEqual(['alpha, beta; gamma']);
    });

    it('does not split when a closing quote sits between the terminator and the space', () => {
      // The lookbehind needs [.!?] immediately before the whitespace; here it sees a quote.
      expect(splitExamples('"alpha." beta.')).toEqual(['"alpha." beta.']);
    });

    it('leaves a leading terminator as its own fragment', () => {
      expect(splitExamples('. alpha')).toEqual(['.', 'alpha']);
    });

    it('does not mind repeated terminators with spaces between them', () => {
      expect(splitExamples('alpha. . beta')).toEqual(['alpha.', '.', 'beta']);
    });
  });
});
