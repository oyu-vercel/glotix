import { Injectable, Provider, Signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';

import { Category } from './vocabulary.types';
import { DECK_SURFACE, DeckParams, DeckSurface } from '../shared/deck-surface/deck-surface';
import { VocabularyService } from './vocabulary.service';
import { LanguageService } from '../shared/language/language.service';

@Injectable()
class VocabularyDeckSurface implements DeckSurface {
  private readonly router = inject(Router);
  private readonly vocab = inject(VocabularyService);
  private readonly language = inject(LanguageService);

  readonly emptyMessage = 'No words in this category.';

  resolveCategory(params: Signal<DeckParams>): Signal<Category | undefined> {
    return this.vocab.getCategorySignal(computed(() => params()['key'] ?? ''));
  }

  resolveScope(params: Signal<DeckParams>): Signal<string> {
    return computed(() => params()['key'] ?? '');
  }

  exit(params: DeckParams): void {
    this.router.navigate(['/', this.language.pair(), 'category', params['key']]);
  }
}

export function provideVocabularyDeckSurface(): Provider {
  return { provide: DECK_SURFACE, useClass: VocabularyDeckSurface };
}
