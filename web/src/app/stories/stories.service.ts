import { Injectable, Signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of, switchMap } from 'rxjs';

import { Story, StoryIndex, StoryResolved } from './stories.types';
import { Category } from '../vocabulary/vocabulary.types';
import { VocabularyService } from '../vocabulary/vocabulary.service';
import { LanguageService } from '../shared/language/language.service';
import {
  KeyedCache,
  forActivePair,
  forActivePairItem,
  ifListed,
  pairKey,
  paramsSignal,
  slugSignal,
} from '../shared/data/pair-resource';

@Injectable({ providedIn: 'root' })
export class StoriesService {
  private readonly http = inject(HttpClient);
  private readonly vocabularyService = inject(VocabularyService);
  private readonly language = inject(LanguageService);

  private readonly indexCache = new KeyedCache<StoryIndex>();
  private readonly storyCache = new KeyedCache<Story | undefined>();
  private readonly resolvedCache = new KeyedCache<StoryResolved | undefined>();

  /** The story index of the pair currently in the URL. */
  readonly index$: Observable<StoryIndex> = forActivePair(this.language.pair$, (pair) =>
    this.indexFor(pair),
  );

  private indexFor(pair: string): Observable<StoryIndex> {
    return this.indexCache.get(pair, () =>
      this.http.get<StoryIndex>(`/assets/${pair}/stories-index.json`),
    );
  }

  getStory(slug: string): Observable<Story | undefined> {
    return forActivePairItem(this.language.pair$, (pair) => this.storyFor(pair, slug));
  }

  private storyFor(pair: string, slug: string): Observable<Story | undefined> {
    return this.storyCache.get(pairKey(pair, slug), () =>
      this.indexFor(pair).pipe(
        switchMap((idx) =>
          ifListed(
            idx.stories.some((s) => s.slug === slug),
            () => this.http.get<Story>(`/assets/${pair}/stories/${slug}.json`),
          ),
        ),
      ),
    );
  }

  getStoryResolved(slug: string): Observable<StoryResolved | undefined> {
    return forActivePairItem(this.language.pair$, (pair) => this.resolvedFor(pair, slug));
  }

  private resolvedFor(pair: string, slug: string): Observable<StoryResolved | undefined> {
    return this.resolvedCache.get(pairKey(pair, slug), () =>
      this.storyFor(pair, slug).pipe(
        switchMap((story) => {
          if (!story) return of(undefined);
          return this.vocabularyService
            .resolveVocabRefs(pair, story.vocabulary)
            .pipe(map((vocabulary) => ({ ...story, vocabulary })));
        }),
      ),
    );
  }

  getStoryResolvedSignal(slug: Signal<string>): Signal<StoryResolved | undefined> {
    return slugSignal(slug, (s) => this.getStoryResolved(s));
  }

  getStoryCategorySignal(slug: Signal<string>, key: Signal<string>): Signal<Category | undefined> {
    return paramsSignal([slug, key], ([s, k]) =>
      this.getStoryResolved(s).pipe(
        map((story) => story?.vocabulary.categories.find((c) => c.key === k)),
      ),
    );
  }
}
