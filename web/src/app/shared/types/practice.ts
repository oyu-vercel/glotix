import { Word } from '../../vocabulary/vocabulary.types';

/**
 * Drills and lessons are the same thing structurally — a titled set of words plus a list of
 * phrase pairs — so they share these shapes. Their *raw* JSON differs (a drill stores
 * `{ category, n }` references, a lesson stores its words inline), which is why `Drill` and
 * `Lesson` stay in their own feature folders.
 */

/** One phrase in the language being learned, with its native-language gloss. */
export interface PatternPair {
  target: string;
  native: string;
}

/** An index row for a practice set. */
export interface PracticeIndexEntry {
  slug: string;
  title: string;
  wordCount: number;
  patternCount: number;
}

/** A practice set whose words have been resolved against the pair's vocabulary. */
export interface PracticeResolved {
  slug: string;
  title: string;
  words: Word[];
  patterns: PatternPair[];
}
