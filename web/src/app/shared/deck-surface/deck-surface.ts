import { InjectionToken, Signal } from '@angular/core';

import { Category } from '../../vocabulary/vocabulary.types';
import { PatternPair } from '../types/practice';

/** The activated route's path params, e.g. `{ book, slug, key }`. */
export type DeckParams = Readonly<Record<string, string>>;

/**
 * What a feature must supply for the shared deck routes to work.
 *
 * Params arrive as a bag rather than fixed `(slug, key)` arguments because the features disagree
 * on how many they have: vocabulary has only `key`, drills and lessons only `slug`, stories
 * `slug + key`, and a book chapter `book + slug + key`. That mismatch is why books, drills and
 * lessons each used to ship their own deck wrapper instead of using this.
 */
export interface DeckSurface {
  /** The word set to drill. Not implemented by a surface that only has patterns. */
  resolveCategory(params: Signal<DeckParams>): Signal<Category | undefined>;

  /** Namespace for the per-deck "skipped" set in storage. */
  resolveScope(params: Signal<DeckParams>): Signal<string>;

  /** Only for features with a `patterns/repeat` route. */
  resolvePatterns?(params: Signal<DeckParams>): Signal<PatternPair[]>;

  /** Shown by the repeat deck when every word has been memorized. */
  readonly emptyMessage: string;

  /** Where "← Exit" goes. */
  exit(params: DeckParams): void;
}

export const DECK_SURFACE = new InjectionToken<DeckSurface>('DECK_SURFACE');
