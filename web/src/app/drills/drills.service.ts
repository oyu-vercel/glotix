import { Injectable, Signal, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of, shareReplay, switchMap } from 'rxjs';

import { Drill, DrillIndex, DrillResolved } from './drills.types';
import { Category, Word } from '../vocabulary/vocabulary.types';
import { VocabularyService } from '../vocabulary/vocabulary.service';

@Injectable({ providedIn: 'root' })
export class DrillsService {
  private readonly http = inject(HttpClient);
  private readonly vocabularyService = inject(VocabularyService);

  readonly index$: Observable<DrillIndex> = this.http
    .get<DrillIndex>('/assets/drills-index.json')
    .pipe(shareReplay({ bufferSize: 1, refCount: false }));

  private readonly drillCache = new Map<string, Observable<Drill | undefined>>();
  private readonly resolvedCache = new Map<string, Observable<DrillResolved | undefined>>();

  getDrill(slug: string): Observable<Drill | undefined> {
    let cached = this.drillCache.get(slug);
    if (!cached) {
      cached = this.index$.pipe(
        switchMap((idx) => {
          const exists = idx.drills.some((d) => d.slug === slug);
          if (!exists) return of(undefined);
          return this.http.get<Drill>(`/assets/drills/${slug}.json`);
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
      this.drillCache.set(slug, cached);
    }
    return cached;
  }

  getDrillResolved(slug: string): Observable<DrillResolved | undefined> {
    let cached = this.resolvedCache.get(slug);
    if (!cached) {
      cached = this.getDrill(slug).pipe(
        switchMap((drill) => {
          if (!drill) return of(undefined);
          return this.vocabularyService.vocabulary$.pipe(
            map((vocab) => {
              const wordsByCat = new Map<string, Map<number, Word>>();
              for (const c of vocab.categories) {
                const inner = new Map<number, Word>();
                for (const w of c.words) inner.set(w.n, w);
                wordsByCat.set(c.key, inner);
              }
              const words: Word[] = [];
              for (const ref of drill.wordOrder) {
                const w = wordsByCat.get(ref.category)?.get(ref.n);
                if (w) words.push(w);
              }
              return {
                slug: drill.slug,
                title: drill.title,
                words,
                patterns: drill.patterns,
              };
            }),
          );
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
      this.resolvedCache.set(slug, cached);
    }
    return cached;
  }

  getDrillCategorySignal(slug: Signal<string>): Signal<Category | undefined> {
    return toSignal(
      toObservable(slug).pipe(
        switchMap((s) =>
          this.getDrillResolved(s).pipe(
            map((d) => (d ? { key: 'drill', label: d.title, words: d.words } : undefined)),
          ),
        ),
      ),
    );
  }
}
