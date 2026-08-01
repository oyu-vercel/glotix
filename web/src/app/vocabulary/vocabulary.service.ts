import { Injectable, Signal, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { Observable, combineLatest, map, shareReplay, switchMap } from 'rxjs';

import { Category, Vocabulary } from './vocabulary.types';
import { LanguageService } from '../shared/language/language.service';

@Injectable({ providedIn: 'root' })
export class VocabularyService {
  private readonly http = inject(HttpClient);
  private readonly language = inject(LanguageService);

  private readonly cache = new Map<string, Observable<Vocabulary>>();

  /** The vocabulary of the pair currently in the URL. */
  readonly vocabulary$: Observable<Vocabulary> = this.language.pair$.pipe(
    switchMap((pair) => this.vocabularyFor(pair)),
    shareReplay({ bufferSize: 1, refCount: false }),
  );

  vocabularyFor(pair: string): Observable<Vocabulary> {
    let cached = this.cache.get(pair);
    if (!cached) {
      cached = this.http
        .get<Vocabulary>(`/assets/${pair}/vocabulary.json`)
        .pipe(shareReplay({ bufferSize: 1, refCount: false }));
      this.cache.set(pair, cached);
    }
    return cached;
  }

  private getCategory(key: string): Observable<Category | undefined> {
    return this.vocabulary$.pipe(map((v) => v.categories.find((c) => c.key === key)));
  }

  getCategorySignal(key: Signal<string>): Signal<Category | undefined> {
    return toSignal(
      combineLatest([this.language.pair$, toObservable(key)]).pipe(
        switchMap(([, k]) => this.getCategory(k)),
      ),
    );
  }

  resolveStoryVocab(refs: Record<string, number[]>): Observable<Vocabulary> {
    return this.vocabulary$.pipe(
      map((v) => ({
        categories: v.categories
          .map((c) => {
            const ns = new Set(refs[c.key] ?? []);
            return { ...c, words: c.words.filter((w) => ns.has(w.n)) };
          })
          .filter((c) => c.words.length > 0),
      })),
    );
  }
}
