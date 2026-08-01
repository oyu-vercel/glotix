import { Injectable, Signal, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { Observable, combineLatest, map, of, shareReplay, switchMap } from 'rxjs';

import { Story, StoryIndex, StoryResolved } from './stories.types';
import { Category } from '../vocabulary/vocabulary.types';
import { VocabularyService } from '../vocabulary/vocabulary.service';
import { LanguageService } from '../shared/language/language.service';

@Injectable({ providedIn: 'root' })
export class StoriesService {
  private readonly http = inject(HttpClient);
  private readonly vocabularyService = inject(VocabularyService);
  private readonly language = inject(LanguageService);

  private readonly indexCache = new Map<string, Observable<StoryIndex>>();
  private readonly storyCache = new Map<string, Observable<Story | undefined>>();
  private readonly resolvedCache = new Map<string, Observable<StoryResolved | undefined>>();

  /** The story index of the pair currently in the URL. */
  readonly index$: Observable<StoryIndex> = this.language.pair$.pipe(
    switchMap((pair) => this.indexFor(pair)),
    shareReplay({ bufferSize: 1, refCount: false }),
  );

  private indexFor(pair: string): Observable<StoryIndex> {
    let cached = this.indexCache.get(pair);
    if (!cached) {
      cached = this.http
        .get<StoryIndex>(`/assets/${pair}/stories-index.json`)
        .pipe(shareReplay({ bufferSize: 1, refCount: false }));
      this.indexCache.set(pair, cached);
    }
    return cached;
  }

  getStory(slug: string): Observable<Story | undefined> {
    return this.language.pair$.pipe(switchMap((pair) => this.storyFor(pair, slug)));
  }

  private storyFor(pair: string, slug: string): Observable<Story | undefined> {
    const key = `${pair}:${slug}`;
    let cached = this.storyCache.get(key);
    if (!cached) {
      cached = this.indexFor(pair).pipe(
        switchMap((idx) => {
          const exists = idx.stories.some((s) => s.slug === slug);
          if (!exists) return of(undefined);
          return this.http.get<Story>(`/assets/${pair}/stories/${slug}.json`);
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
      this.storyCache.set(key, cached);
    }
    return cached;
  }

  getStoryResolved(slug: string): Observable<StoryResolved | undefined> {
    return this.language.pair$.pipe(switchMap((pair) => this.resolvedFor(pair, slug)));
  }

  private resolvedFor(pair: string, slug: string): Observable<StoryResolved | undefined> {
    const key = `${pair}:${slug}`;
    let cached = this.resolvedCache.get(key);
    if (!cached) {
      cached = this.storyFor(pair, slug).pipe(
        switchMap((story) => {
          if (!story) return of(undefined);
          return this.vocabularyService.resolveStoryVocab(story.vocabulary).pipe(
            map((vocabulary) => ({
              slug: story.slug,
              title: story.title,
              text: story.text,
              vocabulary,
            })),
          );
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
      this.resolvedCache.set(key, cached);
    }
    return cached;
  }

  getStoryResolvedSignal(slug: Signal<string>): Signal<StoryResolved | undefined> {
    return toSignal(toObservable(slug).pipe(switchMap((s) => this.getStoryResolved(s))));
  }

  getStoryCategorySignal(slug: Signal<string>, key: Signal<string>): Signal<Category | undefined> {
    return toSignal(
      combineLatest([toObservable(slug), toObservable(key)]).pipe(
        switchMap(([s, k]) =>
          this.getStoryResolved(s).pipe(
            map((story) => story?.vocabulary.categories.find((c) => c.key === k)),
          ),
        ),
      ),
    );
  }
}
