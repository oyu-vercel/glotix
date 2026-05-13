import { Injectable, Provider, Signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';

import { Category } from '../vocabulary/vocabulary.types';
import { DECK_SURFACE, DeckSurface } from '../shared/deck-surface/deck-surface';
import { StoriesService } from './stories.service';

@Injectable()
class StoryDeckSurface implements DeckSurface {
  private readonly router = inject(Router);
  private readonly stories = inject(StoriesService);

  resolveCategory(slug: Signal<string>, key: Signal<string>): Signal<Category | undefined> {
    return this.stories.getStoryCategorySignal(slug, key);
  }

  resolveScope(slug: Signal<string>, key: Signal<string>): Signal<string> {
    return computed(() => `story:${slug()}:${key()}`);
  }

  exit(slug: string, key: string): void {
    this.router.navigate(['/stories', slug], { queryParams: { cat: key } });
  }
}

export function provideStoryDeckSurface(): Provider {
  return { provide: DECK_SURFACE, useClass: StoryDeckSurface };
}
