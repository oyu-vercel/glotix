import { Word } from '../vocabulary/vocabulary.types';

export interface DrillIndexEntry {
  slug: string;
  title: string;
  wordCount: number;
  patternCount: number;
}

export interface DrillIndex {
  language: string;
  level: string;
  drills: DrillIndexEntry[];
}

export interface PatternPair {
  italian: string;
  russian: string;
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
