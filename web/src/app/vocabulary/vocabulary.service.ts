import { Injectable, Signal, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { Observable, combineLatest, map, switchMap } from 'rxjs';

import { Category, VocabRefs, Vocabulary, Word } from './vocabulary.types';
import { LanguageService } from '../shared/language/language.service';
import { KeyedCache, forActivePair } from '../shared/data/pair-resource';

@Injectable({ providedIn: 'root' })
export class VocabularyService {
  private readonly http = inject(HttpClient);
  private readonly language = inject(LanguageService);

  private readonly cache = new KeyedCache<Vocabulary>();

  /** The vocabulary of the pair currently in the URL. */
  readonly vocabulary$: Observable<Vocabulary> = forActivePair(this.language.pair$, (pair) =>
    this.vocabularyFor(pair),
  );

  vocabularyFor(pair: string): Observable<Vocabulary> {
    return this.cache.get(pair, () => this.http.get<Vocabulary>(`/assets/${pair}/vocabulary.json`));
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

  /**
   * Narrows a pair's vocabulary to the words a story or chapter references, keeping the category
   * grouping and dropping categories that end up empty.
   */
  resolveVocabRefs(pair: string, refs: VocabRefs): Observable<Vocabulary> {
    return this.vocabularyFor(pair).pipe(
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

  /**
   * Resolves an ordered list of `{ category, n }` references, preserving the order given.
   * A reference that matches no word is dropped.
   */
  resolveWordRefs(
    pair: string,
    refs: readonly { category: string; n: number }[],
  ): Observable<Word[]> {
    return this.vocabularyFor(pair).pipe(
      map((vocab) => {
        const byCategory = new Map(
          vocab.categories.map((c) => [c.key, new Map(c.words.map((w) => [w.n, w]))]),
        );
        return refs
          .map((ref) => byCategory.get(ref.category)?.get(ref.n))
          .filter((w): w is Word => w !== undefined);
      }),
    );
  }

  /** The same index as `resolveWordRefs`, but keyed by lowercased headword. */
  wordsByHeadword(pair: string): Observable<Map<string, Map<string, Word>>> {
    return this.vocabularyFor(pair).pipe(
      map(
        (vocab) =>
          new Map(
            vocab.categories.map((c) => [
              c.key,
              new Map(c.words.map((w) => [w.target.toLowerCase(), w])),
            ]),
          ),
      ),
    );
  }
}
