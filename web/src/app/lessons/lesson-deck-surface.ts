import { Injectable, Provider, Signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';

import { Category } from '../vocabulary/vocabulary.types';
import { LessonsService } from './lessons.service';
import { DECK_SURFACE, DeckParams, DeckSurface } from '../shared/deck-surface/deck-surface';
import { PatternPair } from '../shared/types/practice';
import { LanguageService } from '../shared/language/language.service';

/** Like a drill: one whole word set per `slug`, plus a phrase-pattern deck. */
@Injectable()
class LessonDeckSurface implements DeckSurface {
  private readonly router = inject(Router);
  private readonly lessons = inject(LessonsService);
  private readonly language = inject(LanguageService);

  readonly emptyMessage = 'No words in this lesson.';

  resolveCategory(params: Signal<DeckParams>): Signal<Category | undefined> {
    return this.lessons.getLessonCategorySignal(computed(() => params()['slug'] ?? ''));
  }

  resolveScope(params: Signal<DeckParams>): Signal<string> {
    return computed(() => `lesson:${params()['slug']}`);
  }

  resolvePatterns(params: Signal<DeckParams>): Signal<PatternPair[]> {
    const resolved = this.lessons.getLessonResolvedSignal(computed(() => params()['slug'] ?? ''));
    return computed(() => resolved()?.patterns ?? []);
  }

  exit(params: DeckParams): void {
    this.router.navigate(['/', this.language.pair(), 'lessons', params['slug']]);
  }
}

export function provideLessonDeckSurface(): Provider {
  return { provide: DECK_SURFACE, useClass: LessonDeckSurface };
}
