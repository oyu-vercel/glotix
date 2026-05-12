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

export interface Story {
  slug: string;
  title: string;
  text: string;
  vocabulary: Vocabulary;
}
