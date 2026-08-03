import { parseStoryText } from './parse-story-text';

/**
 * Characterization spec: locks in the heading heuristic of the story parser before the refactor.
 * A line becomes an `h2` only when it is <= 60 chars, ends with `.`, holds <= 6 words and carries
 * no quote characters; every other non-empty line becomes a `p`.
 */
describe('parseStoryText', () => {
  function doc(...lines: string[]): string {
    return lines.join('\n');
  }

  describe('title handling', () => {
    it('drops the first non-empty line', () => {
      expect(parseStoryText(doc('Story title', 'alpha beta gamma'))).toEqual([
        { type: 'p', text: 'alpha beta gamma' },
      ]);
    });

    it('drops the first non-empty line even when blank lines precede it', () => {
      expect(parseStoryText(doc('', '  ', 'Story title', 'alpha beta gamma'))).toEqual([
        { type: 'p', text: 'alpha beta gamma' },
      ]);
    });

    it('drops the first line even when it would qualify as a heading', () => {
      expect(parseStoryText(doc('alpha beta.', 'gamma delta epsilon'))).toEqual([
        { type: 'p', text: 'gamma delta epsilon' },
      ]);
    });

    it('returns nothing for an empty document', () => {
      expect(parseStoryText('')).toEqual([]);
    });

    it('returns nothing for a whitespace-only document', () => {
      expect(parseStoryText('   \n\n  ')).toEqual([]);
    });

    it('returns nothing for a document that is only a title', () => {
      expect(parseStoryText('Story title')).toEqual([]);
    });
  });

  describe('line handling', () => {
    it('keeps one node per line, without joining lines', () => {
      expect(parseStoryText(doc('Title', 'alpha beta gamma', 'delta epsilon zeta'))).toEqual([
        { type: 'p', text: 'alpha beta gamma' },
        { type: 'p', text: 'delta epsilon zeta' },
      ]);
    });

    it('skips blank lines', () => {
      expect(parseStoryText(doc('Title', '', 'alpha beta gamma', '   ', ''))).toEqual([
        { type: 'p', text: 'alpha beta gamma' },
      ]);
    });

    it('trims each line', () => {
      expect(parseStoryText(doc('Title', '   alpha beta gamma  '))).toEqual([
        { type: 'p', text: 'alpha beta gamma' },
      ]);
    });

    it('accepts CRLF line endings', () => {
      expect(parseStoryText(['Title', 'alpha beta gamma'].join('\r\n'))).toEqual([
        { type: 'p', text: 'alpha beta gamma' },
      ]);
    });
  });

  describe('headings that are accepted', () => {
    it('promotes a short two-word line ending in a period', () => {
      expect(parseStoryText(doc('Title', 'alpha beta.'))).toEqual([
        { type: 'h2', text: 'alpha beta' },
      ]);
    });

    it('strips the trailing period from the heading text', () => {
      expect(parseStoryText(doc('Title', 'alpha.'))).toEqual([{ type: 'h2', text: 'alpha' }]);
    });

    it('accepts exactly six words', () => {
      expect(parseStoryText(doc('Title', 'w1 w2 w3 w4 w5 w6.'))).toEqual([
        { type: 'h2', text: 'w1 w2 w3 w4 w5 w6' },
      ]);
    });

    it('accepts a line of exactly 60 characters', () => {
      const line = `${'a'.repeat(59)}.`;
      expect(line.length).toBe(60);
      expect(parseStoryText(doc('Title', line))).toEqual([{ type: 'h2', text: 'a'.repeat(59) }]);
    });

    it('collapses nothing: inner whitespace is preserved in the heading text', () => {
      expect(parseStoryText(doc('Title', 'alpha   beta.'))).toEqual([
        { type: 'h2', text: 'alpha   beta' },
      ]);
    });
  });

  describe('heading rejection branches', () => {
    it('rejects a line longer than 60 characters', () => {
      const line = `${'a'.repeat(60)}.`;
      expect(line.length).toBe(61);
      expect(parseStoryText(doc('Title', line))).toEqual([{ type: 'p', text: line }]);
    });

    it('rejects a line that does not end with a period', () => {
      expect(parseStoryText(doc('Title', 'alpha beta'))).toEqual([
        { type: 'p', text: 'alpha beta' },
      ]);
    });

    it('rejects a line ending with a question mark', () => {
      expect(parseStoryText(doc('Title', 'alpha beta?'))).toEqual([
        { type: 'p', text: 'alpha beta?' },
      ]);
    });

    it('rejects a line ending with an exclamation mark', () => {
      expect(parseStoryText(doc('Title', 'alpha beta!'))).toEqual([
        { type: 'p', text: 'alpha beta!' },
      ]);
    });

    it('rejects a line containing an opening guillemet', () => {
      expect(parseStoryText(doc('Title', '«alpha beta.'))).toEqual([
        { type: 'p', text: '«alpha beta.' },
      ]);
    });

    it('rejects a line containing a closing guillemet', () => {
      expect(parseStoryText(doc('Title', 'alpha beta».'))).toEqual([
        { type: 'p', text: 'alpha beta».' },
      ]);
    });

    it('rejects a line containing a straight double quote', () => {
      expect(parseStoryText(doc('Title', 'alpha "beta".'))).toEqual([
        { type: 'p', text: 'alpha "beta".' },
      ]);
    });

    it('rejects a line of seven words', () => {
      const line = 'w1 w2 w3 w4 w5 w6 w7.';
      expect(parseStoryText(doc('Title', line))).toEqual([{ type: 'p', text: line }]);
    });
  });

  describe('heuristic edge cases', () => {
    it('strips only one trailing period, leaving the second in the heading text', () => {
      expect(parseStoryText(doc('Title', 'alpha beta..'))).toEqual([
        { type: 'h2', text: 'alpha beta.' },
      ]);
    });

    it('promotes a lone period into an empty heading', () => {
      // Word count is computed on the empty remainder, which still splits to one entry.
      expect(parseStoryText(doc('Title', '.'))).toEqual([{ type: 'h2', text: '' }]);
    });

    it('promotes a long single word that fits inside 60 characters', () => {
      expect(parseStoryText(doc('Title', 'lorem.'))).toEqual([{ type: 'h2', text: 'lorem' }]);
    });

    it('does not treat a single quote as a quote character', () => {
      expect(parseStoryText(doc('Title', "alpha 'beta'."))).toEqual([
        { type: 'h2', text: "alpha 'beta'" },
      ]);
    });

    it('counts words on whitespace only, so punctuation does not add words', () => {
      expect(parseStoryText(doc('Title', 'alpha, beta, gamma, delta.'))).toEqual([
        { type: 'h2', text: 'alpha, beta, gamma, delta' },
      ]);
    });
  });
});
