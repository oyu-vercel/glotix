import { PatternPair, PracticeIndexEntry } from '../shared/types/practice';

export interface DrillIndex {
  drills: PracticeIndexEntry[];
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
