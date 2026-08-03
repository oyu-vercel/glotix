import { parseChapterText } from './parse-chapter-text';

/**
 * Characterization spec: locks in how hard-wrapped PDF prose is re-joined into paragraphs before
 * the refactor. The parser is language-agnostic and only ever looks at line *length*, a leading
 * `-`, and a Roman-numeral-only line, so neutral filler text exercises it fully.
 */
describe('parseChapterText', () => {
  /** The wrap threshold baked into the parser: a line shorter than this ends its paragraph. */
  const WRAP_THRESHOLD = 75;

  /** Pads `text` with filler words to exactly `length` characters, never ending on a space. */
  function padTo(text: string, length: number): string {
    let out = text;
    while (out.length < length) out += ' fill';
    out = out.slice(0, length);
    return out.endsWith(' ') ? `${out.slice(0, -1)}x` : out;
  }

  /** A line long enough to be treated as a mid-paragraph wrap. */
  function long(text: string): string {
    return padTo(text, WRAP_THRESHOLD + 10);
  }

  /** A line short enough to be treated as the last line of its paragraph. */
  function short(text: string): string {
    return padTo(text, WRAP_THRESHOLD - 10);
  }

  function doc(...lines: string[]): string {
    return lines.join('\n');
  }

  describe('the padding helper itself', () => {
    it('produces a line at or above the wrap threshold', () => {
      expect(long('alpha').length).toBe(WRAP_THRESHOLD + 10);
    });

    it('produces a line below the wrap threshold', () => {
      expect(short('alpha').length).toBe(WRAP_THRESHOLD - 10);
    });

    it('never ends a padded line on a space, so trimming cannot shorten it', () => {
      expect(padTo('alpha', 12).endsWith(' ')).toBe(false);
    });
  });

  describe('title handling', () => {
    it('drops the first non-empty line', () => {
      const body = short('alpha');
      expect(parseChapterText(doc('Chapter one', body))).toEqual([{ type: 'p', text: body }]);
    });

    it('drops the first non-empty line even when blank lines precede it', () => {
      const body = short('alpha');
      expect(parseChapterText(doc('', '   ', 'Chapter one', body))).toEqual([
        { type: 'p', text: body },
      ]);
    });

    it('drops a Roman-numeral first line too, so no h2 is emitted for it', () => {
      const body = short('alpha');
      // The title check runs before the section check.
      expect(parseChapterText(doc('II', body))).toEqual([{ type: 'p', text: body }]);
    });

    it('returns nothing for a document that is only a title', () => {
      expect(parseChapterText('Chapter one')).toEqual([]);
    });

    it('returns nothing for an empty document', () => {
      expect(parseChapterText('')).toEqual([]);
    });

    it('returns nothing for a whitespace-only document', () => {
      expect(parseChapterText('  \n\n   \n')).toEqual([]);
    });
  });

  describe('paragraph re-joining', () => {
    it('joins long lines and ends the paragraph on a short one', () => {
      const a = long('alpha');
      const b = long('beta');
      const c = short('gamma');
      expect(parseChapterText(doc('Title', a, b, c))).toEqual([
        { type: 'p', text: `${a} ${b} ${c}` },
      ]);
    });

    it('joins with a single space', () => {
      const a = long('alpha');
      const b = short('beta');
      expect(parseChapterText(doc('Title', a, b))).toEqual([{ type: 'p', text: `${a} ${b}` }]);
    });

    it('starts a new paragraph after a short line', () => {
      const a = short('alpha');
      const b = short('beta');
      expect(parseChapterText(doc('Title', a, b))).toEqual([
        { type: 'p', text: a },
        { type: 'p', text: b },
      ]);
    });

    it('treats a line of exactly the threshold length as a continuation', () => {
      const a = padTo('alpha', WRAP_THRESHOLD);
      const b = short('beta');
      expect(parseChapterText(doc('Title', a, b))).toEqual([{ type: 'p', text: `${a} ${b}` }]);
    });

    it('treats a line one character below the threshold as a paragraph end', () => {
      const a = padTo('alpha', WRAP_THRESHOLD - 1);
      const b = short('beta');
      expect(parseChapterText(doc('Title', a, b))).toEqual([
        { type: 'p', text: a },
        { type: 'p', text: b },
      ]);
    });

    it('flushes a trailing buffer of long lines at the end of the document', () => {
      const a = long('alpha');
      const b = long('beta');
      expect(parseChapterText(doc('Title', a, b))).toEqual([{ type: 'p', text: `${a} ${b}` }]);
    });

    it('trims each line before joining', () => {
      const a = long('alpha');
      const b = short('beta');
      expect(parseChapterText(doc('Title', `   ${a}   `, `\t${b}\t`))).toEqual([
        { type: 'p', text: `${a} ${b}` },
      ]);
    });

    it('skips blank lines inside a paragraph without breaking it', () => {
      const a = long('alpha');
      const b = short('beta');
      expect(parseChapterText(doc('Title', a, '', '   ', b))).toEqual([
        { type: 'p', text: `${a} ${b}` },
      ]);
    });

    it('accepts CRLF line endings', () => {
      const a = long('alpha');
      const b = short('beta');
      expect(parseChapterText(['Title', a, b].join('\r\n'))).toEqual([
        { type: 'p', text: `${a} ${b}` },
      ]);
    });
  });

  describe('Roman-numeral sections', () => {
    it('emits an h2 for a Roman-numeral-only line', () => {
      const a = short('alpha');
      expect(parseChapterText(doc('Title', a, 'II'))).toEqual([
        { type: 'p', text: a },
        { type: 'h2', text: 'II' },
      ]);
    });

    it('flushes the pending paragraph before the h2', () => {
      const a = long('alpha');
      const b = short('beta');
      expect(parseChapterText(doc('Title', a, 'II', b))).toEqual([
        { type: 'p', text: a },
        { type: 'h2', text: 'II' },
        { type: 'p', text: b },
      ]);
    });

    it('emits back-to-back h2s without inventing an empty paragraph', () => {
      expect(parseChapterText(doc('Title', 'II', 'III'))).toEqual([
        { type: 'h2', text: 'II' },
        { type: 'h2', text: 'III' },
      ]);
    });

    it('matches any run of I V X L C, including non-numerals like IIII', () => {
      expect(parseChapterText(doc('Title', 'IIII'))).toEqual([{ type: 'h2', text: 'IIII' }]);
    });

    it('matches a nonsensical ordering of those characters', () => {
      expect(parseChapterText(doc('Title', 'ILVXC'))).toEqual([{ type: 'h2', text: 'ILVXC' }]);
    });

    it('does not match lowercase Roman numerals', () => {
      expect(parseChapterText(doc('Title', 'ii'))).toEqual([{ type: 'p', text: 'ii' }]);
    });

    it('does not match a Roman numeral with a trailing period', () => {
      expect(parseChapterText(doc('Title', 'II.'))).toEqual([{ type: 'p', text: 'II.' }]);
    });

    it('does not match D or M, which are outside the character class', () => {
      expect(parseChapterText(doc('Title', 'MD'))).toEqual([{ type: 'p', text: 'MD' }]);
    });
  });

  describe('dialogue lookahead', () => {
    it('flushes a long line early when the next non-empty line starts with a dash', () => {
      const a = long('alpha');
      const b = short('- beta');
      expect(parseChapterText(doc('Title', a, b))).toEqual([
        { type: 'p', text: a },
        { type: 'p', text: b },
      ]);
    });

    it('looks past blank lines when checking for the dash', () => {
      const a = long('alpha');
      const b = short('- beta');
      expect(parseChapterText(doc('Title', a, '', '   ', b))).toEqual([
        { type: 'p', text: a },
        { type: 'p', text: b },
      ]);
    });

    it('breaks a multi-line dialogue turn before each new speaker', () => {
      const a = long('- alpha');
      const b = long('beta');
      const c = long('- gamma');
      const d = short('delta');
      expect(parseChapterText(doc('Title', a, b, c, d))).toEqual([
        { type: 'p', text: `${a} ${b}` },
        { type: 'p', text: `${c} ${d}` },
      ]);
    });

    it('only looks one non-empty line ahead, so an earlier long line keeps buffering', () => {
      const a = long('alpha');
      const b = long('beta');
      const c = short('- gamma');
      expect(parseChapterText(doc('Title', a, b, c))).toEqual([
        { type: 'p', text: `${a} ${b}` },
        { type: 'p', text: c },
      ]);
    });

    it('treats any leading hyphen as dialogue, including a hyphenated word', () => {
      const a = long('alpha');
      const b = short('-beta gamma');
      expect(parseChapterText(doc('Title', a, b))).toEqual([
        { type: 'p', text: a },
        { type: 'p', text: b },
      ]);
    });

    it('ignores a dash that is not at the start of the next line', () => {
      const a = long('alpha');
      const b = long('beta - gamma');
      const c = short('delta');
      expect(parseChapterText(doc('Title', a, b, c))).toEqual([
        { type: 'p', text: `${a} ${b} ${c}` },
      ]);
    });

    it('does not flush early when the dash line is a Roman-numeral section instead', () => {
      const a = long('alpha');
      const b = long('beta');
      expect(parseChapterText(doc('Title', a, b, 'II'))).toEqual([
        { type: 'p', text: `${a} ${b}` },
        { type: 'h2', text: 'II' },
      ]);
    });
  });
});
