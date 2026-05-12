import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of, shareReplay, switchMap } from 'rxjs';

import { Story, StoryIndex } from './stories.types';

@Injectable({ providedIn: 'root' })
export class StoriesService {
  private readonly http = inject(HttpClient);

  readonly index$: Observable<StoryIndex> = this.http
    .get<StoryIndex>('/assets/stories-index.json')
    .pipe(shareReplay({ bufferSize: 1, refCount: false }));

  private readonly storyCache = new Map<string, Observable<Story | undefined>>();

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

  getIndexEntry(slug: string) {
    return this.index$.pipe(map((idx) => idx.stories.find((s) => s.slug === slug)));
  }
}
