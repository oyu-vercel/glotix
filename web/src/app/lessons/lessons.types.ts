import { PatternPair } from '../drills/drills.types';
import { Word } from '../vocabulary/vocabulary.types';

export interface LessonIndexEntry {
  slug: string;
  title: string;
  wordCount: number;
  patternCount: number;
}

export interface LessonIndex {
  language: string;
  level: string;
  lessons: LessonIndexEntry[];
}

/**
 * A lesson word is authored inline (unlike a drill's `{ category, n }` reference).
 * `russian` is the lesson's own gloss and wins over the vocabulary.json translation;
 * `category` disambiguates headwords that exist in more than one category.
 */
export interface LessonWordRef {
  italian: string;
  russian: string;
  category: string;
}

export interface Lesson {
  slug: string;
  title: string;
  words: LessonWordRef[];
  patterns: PatternPair[];
}

export interface LessonResolved {
  slug: string;
  title: string;
  words: Word[];
  patterns: PatternPair[];
}
