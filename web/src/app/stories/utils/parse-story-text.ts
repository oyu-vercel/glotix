export interface TextNode {
  type: 'h2' | 'p';
  text: string;
}

export function parseStoryText(raw: string): TextNode[] {
  const lines = raw.split(/\r?\n/);
  const nodes: TextNode[] = [];
  let titleSkipped = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (!titleSkipped) {
      titleSkipped = true;
      continue;
    }
    if (isSectionHeader(trimmed)) {
      nodes.push({ type: 'h2', text: trimmed.replace(/\.$/, '') });
    } else {
      nodes.push({ type: 'p', text: trimmed });
    }
  }
  return nodes;
}

function isSectionHeader(line: string): boolean {
  if (line.length > 60) return false;
  if (!line.endsWith('.')) return false;
  if (line.includes('«') || line.includes('»') || line.includes('"')) return false;
  const wordCount = line.replace(/\.$/, '').split(/\s+/).length;
  return wordCount <= 6;
}
