import { Injectable, Provider, Signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';

import { Category } from '../vocabulary/vocabulary.types';
import { StoriesService } from './stories.service';
import { DECK_SURFACE, DeckParams, DeckSurface } from '../shared/deck-surface/deck-surface';
import { LanguageService } from '../shared/language/language.service';

@Injectable()
class StoryDeckSurface implements DeckSurface {
  private readonly router = inject(Router);
  private readonly stories = inject(StoriesService);
  private readonly language = inject(LanguageService);

  readonly emptyMessage = 'No words in this category.';

  resolveCategory(params: Signal<DeckParams>): Signal<Category | undefined> {
    return this.stories.getStoryCategorySignal(
      computed(() => params()['slug'] ?? ''),
      computed(() => params()['key'] ?? ''),
    );
  }

  resolveScope(params: Signal<DeckParams>): Signal<string> {
    return computed(() => `story:${params()['slug']}:${params()['key']}`);
  }

  exit(params: DeckParams): void {
    this.router.navigate(['/', this.language.pair(), 'stories', params['slug']], {
      queryParams: { cat: params['key'] },
    });
  }
}

export function provideStoryDeckSurface(): Provider {
  return { provide: DECK_SURFACE, useClass: StoryDeckSurface };
}
