import { Injectable, Signal, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { Observable, map, shareReplay, switchMap } from 'rxjs';

import { Category, Vocabulary } from './vocabulary.types';

@Injectable({ providedIn: 'root' })
export class VocabularyService {
  private readonly http = inject(HttpClient);

  readonly vocabulary$: Observable<Vocabulary> = this.http
    .get<Vocabulary>('/assets/vocabulary.json')
    .pipe(shareReplay({ bufferSize: 1, refCount: false }));

  getCategory(key: string): Observable<Category | undefined> {
    return this.vocabulary$.pipe(map((v) => v.categories.find((c) => c.key === key)));
  }

  getCategorySignal(key: Signal<string>): Signal<Category | undefined> {
    return toSignal(toObservable(key).pipe(switchMap((k) => this.getCategory(k))));
  }

  resolveStoryVocab(refs: Record<string, number[]>): Observable<Vocabulary> {
    return this.vocabulary$.pipe(
      map((v) => ({
        language: v.language,
        level: v.level,
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
