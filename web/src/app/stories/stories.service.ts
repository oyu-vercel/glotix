import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of, shareReplay, switchMap } from 'rxjs';

import { Story, StoryIndex, StoryResolved } from './stories.types';
import { VocabularyService } from '../vocabulary/vocabulary.service';

@Injectable({ providedIn: 'root' })
export class StoriesService {
  private readonly http = inject(HttpClient);
  private readonly vocabularyService = inject(VocabularyService);

  readonly index$: Observable<StoryIndex> = this.http
    .get<StoryIndex>('/assets/stories-index.json')
    .pipe(shareReplay({ bufferSize: 1, refCount: false }));

  private readonly storyCache = new Map<string, Observable<Story | undefined>>();
  private readonly resolvedCache = new Map<string, Observable<StoryResolved | undefined>>();

  getStory(slug: string): Observable<Story | undefined> {
    let cached = this.storyCache.get(slug);
    if (!cached) {
      cached = this.index$.pipe(
        switchMap((idx) => {
          const exists = idx.stories.some((s) => s.slug === slug);
          if (!exists) return of(undefined);
          return this.http.get<Story>(`/assets/stories/${slug}.json`);
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
      this.storyCache.set(slug, cached);
    }
    return cached;
  }

  getStoryResolved(slug: string): Observable<StoryResolved | undefined> {
    let cached = this.resolvedCache.get(slug);
    if (!cached) {
      cached = this.getStory(slug).pipe(
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
      this.resolvedCache.set(slug, cached);
    }
    return cached;
  }

  getIndexEntry(slug: string) {
    return this.index$.pipe(map((idx) => idx.stories.find((s) => s.slug === slug)));
  }
}
