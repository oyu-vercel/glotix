import { Word } from '../vocabulary/vocabulary.types';

export interface DrillIndexEntry {
  slug: string;
  title: string;
  wordCount: number;
  patternCount: number;
}

export interface DrillIndex {
  drills: DrillIndexEntry[];
}

/** One phrase in the language being learned, with its native-language gloss. */
export interface PatternPair {
  target: string;
  native: string;
}

export interface DrillWordRef {
  category: string;
  n: number;
}

export interface Drill {
  slug: string;
  title: string;
  wordOrder: DrillWordRef[];
  patterns: PatternPair[];
}

export interface DrillResolved {
  slug: string;
  title: string;
  words: Word[];
  patterns: PatternPair[];
}
