/**
 * One row of a summary table. `count`/`total`/`percent` are optional so the same component can
 * render a bare list (drills, lessons) and a full progress table (vocabulary, stories, books).
 * `values` carries any extra numeric column a single screen needs — chapters, paragraphs.
 */
export interface ProgressRow {
  /** Passed back on `rowClick`; usually a slug or a category key. */
  readonly id: string;
  readonly title: string;
  readonly count?: number;
  readonly total?: number;
  readonly percent?: number;
  readonly values?: Readonly<Record<string, number>>;
}

/**
 * A column definition. `title` renders the first cell; `count`, `total` and `percent` read the
 * matching field of the row; `value` reads `row.values[key]`.
 */
export type ProgressColumn =
  | { readonly kind: 'title'; readonly header: string }
  | { readonly kind: 'value'; readonly header: string; readonly key: string }
  | { readonly kind: 'count'; readonly header: string }
  | { readonly kind: 'total'; readonly header: string }
  | { readonly kind: 'percent'; readonly header: string };

/** The shape most summary screens use: name, memorized, total, progress bar. */
export const PROGRESS_COLUMNS: readonly ProgressColumn[] = [
  { kind: 'title', header: 'Name' },
  { kind: 'count', header: 'Words' },
  { kind: 'total', header: 'Total' },
  { kind: 'percent', header: 'Progress' },
];

/** Totals rendered in the footer row. */
export interface ProgressTotals {
  readonly count: number;
  readonly total: number;
  readonly percent: number;
  /** Decimal places for the footer percentage — screens differ (0 or 1). */
  readonly percentDigits?: number;
}

/**
 * Sums a row set into a footer. Every summary screen used to re-derive this with three separate
 * `reduce` calls; the percentage is of the summed totals, not the mean of the row percentages.
 */
export function sumRows(rows: readonly ProgressRow[], percentDigits?: number): ProgressTotals {
  const count = rows.reduce((n, r) => n + (r.count ?? 0), 0);
  const total = rows.reduce((n, r) => n + (r.total ?? 0), 0);
  return { count, total, percent: total > 0 ? (count / total) * 100 : 0, percentDigits };
}
