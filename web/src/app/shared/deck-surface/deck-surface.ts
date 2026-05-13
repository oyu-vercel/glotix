import { InjectionToken, Signal } from '@angular/core';

import { Category } from '../../vocabulary/vocabulary.types';

export interface DeckSurface {
  resolveCategory(slug: Signal<string>, key: Signal<string>): Signal<Category | undefined>;
  resolveScope(slug: Signal<string>, key: Signal<string>): Signal<string>;
  exit(slug: string, key: string): void;
}

export const DECK_SURFACE = new InjectionToken<DeckSurface>('DECK_SURFACE');
