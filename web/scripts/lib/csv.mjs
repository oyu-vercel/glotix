/**
 * Drops the header row and every blank row, and normalises the target cell.
 *
 * Row 0 is always the header — detecting it by its text would mean naming a language in code,
 * which the project forbids. To keep that assumption honest it is *validated*: if row 0's first
 * cell is a real headword, the file has probably lost its header and we fail loudly rather than
 * silently eating a word.
 *
 * Returns `[{ cells, target, rowNumber }]`, where `rowNumber` is 1-based including the header, so
 * it matches what the maintainer sees in a spreadsheet.
 */
export function dataRows(rows, headwordMap, label) {
  if (rows.length === 0) return [];

  const headerTarget = (rows[0][0] ?? '').normalize('NFC').trim().toLowerCase();
  if (headerTarget && headwordMap.has(headerTarget)) {
    throw new Error(
      `First row of ${label} looks like data, not a header ("${rows[0][0]}" is a known headword). ` +
        `Add the header row back, or the word would be dropped silently.`,
    );
  }

  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i];
    if (cells.length === 0 || (cells.length === 1 && cells[0] === '')) continue;
    const target = (cells[0] ?? '').normalize('NFC').trim();
    if (!target) continue;
    out.push({ cells, target, rowNumber: i + 1 });
  }
  return out;
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  let i = 0;
  const n = text.length;
  while (i < n) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      cell += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ',') {
      row.push(cell);
      cell = '';
      i += 1;
      continue;
    }
    if (ch === '\r') {
      i += 1;
      continue;
    }
    if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      i += 1;
      continue;
    }
    cell += ch;
    i += 1;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}
