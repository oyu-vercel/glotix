/**
 * The five content features, in nav order.
 *
 * Each feature's URL segment and display labels used to be bare string literals repeated across
 * the routing table, the nav, every back link, every page header and every deck exit — `'books'`
 * alone appeared at 13 sites. Anything that needs to name a feature reads it from here instead.
 *
 * Note this is *not* the routing table: `app.routes.ts` still declares routes explicitly, because
 * the features do not share one route shape (books nest a chapter, vocabulary has no slug, only
 * drills and lessons have patterns).
 */
export interface FeatureDef {
  /** First path segment under the language pair, e.g. `/it-ru/drills`. */
  readonly segment: string;
  readonly labelPlural: string;
  readonly labelSingular: string;
  /** Whether the feature has a `patterns/repeat` deck. */
  readonly hasPatterns: boolean;
}

export const FEATURES: readonly FeatureDef[] = [
  {
    segment: 'vocabulary',
    labelPlural: 'Vocabulary',
    labelSingular: 'Category',
    hasPatterns: false,
  },
  { segment: 'stories', labelPlural: 'Stories', labelSingular: 'Story', hasPatterns: false },
  { segment: 'drills', labelPlural: 'Drills', labelSingular: 'Drill', hasPatterns: true },
  { segment: 'lessons', labelPlural: 'Lessons', labelSingular: 'Lesson', hasPatterns: true },
  { segment: 'books', labelPlural: 'Books', labelSingular: 'Book', hasPatterns: false },
];

const BY_SEGMENT = new Map(FEATURES.map((f) => [f.segment, f]));

/** Throws on an unknown segment: a typo should fail loudly, not render a blank label. */
export function feature(segment: string): FeatureDef {
  const found = BY_SEGMENT.get(segment);
  if (!found) throw new Error(`Unknown feature segment "${segment}"`);
  return found;
}
