import { VocabRefs, Vocabulary } from '../vocabulary/vocabulary.types';

export interface StoryIndexEntry {
  slug: string;
  title: string;
  paragraphs: number;
  vocabCount: number;
}

export interface StoryIndex {
  stories: StoryIndexEntry[];
}

export interface Story {
  slug: string;
  title: string;
  text: string;
  vocabulary: VocabRefs;
}

export interface StoryResolved {
  slug: string;
  title: string;
  text: string;
  vocabulary: Vocabulary;
}
