import { PatternPair, PracticeIndexEntry } from '../shared/types/practice';

export interface LessonIndex {
  lessons: PracticeIndexEntry[];
}

/**
 * A lesson word is authored inline (unlike a drill's `{ category, n }` reference).
 * `native` is the lesson's own gloss and wins over the vocabulary.json translation;
 * `category` disambiguates headwords that exist in more than one category.
 */
export interface LessonWordRef {
  target: string;
  native: string;
  category: string;
}

export interface Lesson {
  slug: string;
  title: string;
  words: LessonWordRef[];
  patterns: PatternPair[];
}
