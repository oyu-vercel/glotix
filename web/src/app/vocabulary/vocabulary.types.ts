export interface Word {
  n: number;
  italian: string;
  pronunciation: string;
  translation: string;
  examples: string;
}

export interface Category {
  key: string;
  label: string;
  words: Word[];
}

export interface Vocabulary {
  language: string;
  level: string;
  categories: Category[];
}
