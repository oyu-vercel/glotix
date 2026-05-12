export interface Word {
  n: number;
  italian: string;
  pronunciation: string;
  translation: string;
  examples: string;
  extras?: boolean;
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
