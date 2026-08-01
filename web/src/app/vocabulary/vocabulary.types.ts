export interface Word {
  n: number;
  /** The headword in the language being learned. */
  target: string;
  pronunciation: string;
  /** The gloss in the learner's native language. */
  translation: string;
  examples: string;
}

export interface Category {
  key: string;
  label: string;
  words: Word[];
}

export interface Vocabulary {
  categories: Category[];
}
