import { Injectable, Provider, Signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';

import { Category } from '../vocabulary/vocabulary.types';
import { DrillsService } from './drills.service';
import { DECK_SURFACE, DeckParams, DeckSurface } from '../shared/deck-surface/deck-surface';
import { PatternPair } from '../shared/types/practice';
import { LanguageService } from '../shared/language/language.service';

/** A drill is one whole word set, so it has a `slug` but no per-category `key`. */
@Injectable()
class DrillDeckSurface implements DeckSurface {
  private readonly router = inject(Router);
  private readonly drills = inject(DrillsService);
  private readonly language = inject(LanguageService);

  readonly emptyMessage = 'No words in this drill.';

  resolveCategory(params: Signal<DeckParams>): Signal<Category | undefined> {
    return this.drills.getDrillCategorySignal(computed(() => params()['slug'] ?? ''));
  }

  resolveScope(params: Signal<DeckParams>): Signal<string> {
    return computed(() => `drill:${params()['slug']}`);
  }

  resolvePatterns(params: Signal<DeckParams>): Signal<PatternPair[]> {
    const resolved = this.drills.getDrillResolvedSignal(computed(() => params()['slug'] ?? ''));
    return computed(() => resolved()?.patterns ?? []);
  }

  exit(params: DeckParams): void {
    this.router.navigate(['/', this.language.pair(), 'drills', params['slug']]);
  }
}

export function provideDrillDeckSurface(): Provider {
  return { provide: DECK_SURFACE, useClass: DrillDeckSurface };
}
