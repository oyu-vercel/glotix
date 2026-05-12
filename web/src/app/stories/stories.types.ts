import { Vocabulary } from '../vocabulary/vocabulary.types';

export interface StoryIndexEntry {
  slug: string;
  title: string;
  paragraphs: number;
  vocabCount: number;
}

export interface StoryIndex {
  language: string;
  level: string;
  stories: StoryIndexEntry[];
}

export type StoryVocabRefs = Record<string, number[]>;

export interface Story {
  slug: string;
  title: string;
  text: string;
  vocabulary: StoryVocabRefs;
}

export interface StoryResolved {
  slug: string;
  title: string;
  text: string;
  vocabulary: Vocabulary;
}
