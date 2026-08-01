import { Injectable, Signal, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of, shareReplay, switchMap } from 'rxjs';

import { Drill, DrillIndex, DrillResolved } from './drills.types';
import { Category, Word } from '../vocabulary/vocabulary.types';
import { VocabularyService } from '../vocabulary/vocabulary.service';
import { LanguageService } from '../shared/language/language.service';

@Injectable({ providedIn: 'root' })
export class DrillsService {
  private readonly http = inject(HttpClient);
  private readonly vocabularyService = inject(VocabularyService);
  private readonly language = inject(LanguageService);

  private readonly indexCache = new Map<string, Observable<DrillIndex>>();
  private readonly drillCache = new Map<string, Observable<Drill | undefined>>();
  private readonly resolvedCache = new Map<string, Observable<DrillResolved | undefined>>();

  /** The drill index of the pair currently in the URL. */
  readonly index$: Observable<DrillIndex> = this.language.pair$.pipe(
    switchMap((pair) => this.indexFor(pair)),
    shareReplay({ bufferSize: 1, refCount: false }),
  );

  private indexFor(pair: string): Observable<DrillIndex> {
    let cached = this.indexCache.get(pair);
    if (!cached) {
      cached = this.http
        .get<DrillIndex>(`/assets/${pair}/drills-index.json`)
        .pipe(shareReplay({ bufferSize: 1, refCount: false }));
      this.indexCache.set(pair, cached);
    }
    return cached;
  }

  getDrill(slug: string): Observable<Drill | undefined> {
    return this.language.pair$.pipe(switchMap((pair) => this.drillFor(pair, slug)));
  }

  private drillFor(pair: string, slug: string): Observable<Drill | undefined> {
    const key = `${pair}:${slug}`;
    let cached = this.drillCache.get(key);
    if (!cached) {
      cached = this.indexFor(pair).pipe(
        switchMap((idx) => {
          const exists = idx.drills.some((d) => d.slug === slug);
          if (!exists) return of(undefined);
          return this.http.get<Drill>(`/assets/${pair}/drills/${slug}.json`);
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
      this.drillCache.set(key, cached);
    }
    return cached;
  }

  getDrillResolved(slug: string): Observable<DrillResolved | undefined> {
    return this.language.pair$.pipe(switchMap((pair) => this.resolvedFor(pair, slug)));
  }

  private resolvedFor(pair: string, slug: string): Observable<DrillResolved | undefined> {
    const key = `${pair}:${slug}`;
    let cached = this.resolvedCache.get(key);
    if (!cached) {
      cached = this.drillFor(pair, slug).pipe(
        switchMap((drill) => {
          if (!drill) return of(undefined);
          return this.vocabularyService.vocabularyFor(pair).pipe(
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
      this.resolvedCache.set(key, cached);
    }
    return cached;
  }

  getDrillResolvedSignal(slug: Signal<string>): Signal<DrillResolved | undefined> {
    return toSignal(toObservable(slug).pipe(switchMap((s) => this.getDrillResolved(s))));
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
