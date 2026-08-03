export interface TextNode {
  type: 'h2' | 'p';
  text: string;
}

/**
 * Chapter text is hard-wrapped prose extracted from a PDF: paragraphs run across several lines
 * with no blank line between them, so the lines have to be re-joined. Measured on chapter 1, the
 * wrap width sits around 90-94 characters, so a line materially shorter than that is the last one
 * of its paragraph.
 */
const WRAP_THRESHOLD = 75;

/** Roman numerals on a line of their own separate the chapter's sections. */
const SECTION = /^[IVXLC]+$/;

export function parseChapterText(raw: string): TextNode[] {
  const lines = raw.split(/\r?\n/).map((l) => l.trim());
  const nodes: TextNode[] = [];
  let buffer: string[] = [];
  let titleSkipped = false;

  const flush = () => {
    if (buffer.length === 0) return;
    nodes.push({ type: 'p', text: buffer.join(' ') });
    buffer = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // The first non-empty line is the chapter title; the page header already shows it.
    if (!titleSkipped) {
      titleSkipped = true;
      continue;
    }

    if (SECTION.test(line)) {
      flush();
      nodes.push({ type: 'h2', text: line });
      continue;
    }

    buffer.push(line);

    const next = lines.slice(i + 1).find((l) => l.length > 0);
    const startsNewSpeech = next !== undefined && next.startsWith('-');
    if (line.length < WRAP_THRESHOLD || startsNewSpeech) flush();
  }

  flush();
  return nodes;
}
