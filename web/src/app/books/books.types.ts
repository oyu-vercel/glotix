import { VocabRefs, Vocabulary } from '../vocabulary/vocabulary.types';

export interface BookIndexEntry {
  slug: string;
  name: string;
  /** How many chapters the book has, so the list can render without loading each manifest. */
  chapters: number;
}

export interface BookIndex {
  books: BookIndexEntry[];
}

export interface ChapterEntry {
  slug: string;
  name: string;
  /** File name of the chapter text, relative to the book's own folder. */
  file: string;
  vocabCount: number;
}

export interface Book {
  slug: string;
  name: string;
  chapters: ChapterEntry[];
}

export interface ChapterVocabFile {
  vocabulary: VocabRefs;
}

export interface ChapterResolved {
  bookSlug: string;
  bookName: string;
  slug: string;
  name: string;
  text: string;
  vocabulary: Vocabulary;
}
