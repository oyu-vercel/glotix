/**
 * One course: a target language taught to speakers of a native language.
 * `pair` is the URL segment and the asset folder name, e.g. `it-ru`.
 */
export interface Language {
  pair: string;
  target: string;
  native: string;
  targetLabel: string;
  nativeLabel: string;
  level: string;
}

export interface LanguageIndex {
  languages: Language[];
}
