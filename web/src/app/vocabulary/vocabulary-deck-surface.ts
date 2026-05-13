import { Injectable, Provider, Signal, inject } from '@angular/core';
import { Router } from '@angular/router';

import { Category } from './vocabulary.types';
import { DECK_SURFACE, DeckSurface } from '../shared/deck-surface/deck-surface';
import { VocabularyService } from './vocabulary.service';

@Injectable()
class VocabularyDeckSurface implements DeckSurface {
  private readonly router = inject(Router);
  private readonly vocab = inject(VocabularyService);

  resolveCategory(_slug: Signal<string>, key: Signal<string>): Signal<Category | undefined> {
    return this.vocab.getCategorySignal(key);
  }

  resolveScope(_slug: Signal<string>, key: Signal<string>): Signal<string> {
    return key;
  }

  exit(_slug: string, key: string): void {
    this.router.navigate(['/category', key]);
  }
}

export function provideVocabularyDeckSurface(): Provider {
  return { provide: DECK_SURFACE, useClass: VocabularyDeckSurface };
}
