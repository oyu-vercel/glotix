import { Injectable, Signal, inject } from '@angular/core';
import { Observable, map, of, switchMap } from 'rxjs';

import { HttpClient } from '@angular/common/http';

import { Drill, DrillIndex } from './drills.types';
import { PracticeResolved } from '../shared/types/practice';
import { Category } from '../vocabulary/vocabulary.types';
import { VocabularyService } from '../vocabulary/vocabulary.service';
import { LanguageService } from '../shared/language/language.service';
import {
  KeyedCache,
  forActivePair,
  forActivePairItem,
  ifListed,
  pairKey,
  slugSignal,
} from '../shared/data/pair-resource';

@Injectable({ providedIn: 'root' })
export class DrillsService {
  private readonly http = inject(HttpClient);
  private readonly vocabularyService = inject(VocabularyService);
  private readonly language = inject(LanguageService);

  private readonly indexCache = new KeyedCache<DrillIndex>();
  private readonly drillCache = new KeyedCache<Drill | undefined>();
  private readonly resolvedCache = new KeyedCache<PracticeResolved | undefined>();

  /** The drill index of the pair currently in the URL. */
  readonly index$: Observable<DrillIndex> = forActivePair(this.language.pair$, (pair) =>
    this.indexFor(pair),
  );

  private indexFor(pair: string): Observable<DrillIndex> {
    return this.indexCache.get(pair, () =>
      this.http.get<DrillIndex>(`/assets/${pair}/drills-index.json`),
    );
  }

  getDrill(slug: string): Observable<Drill | undefined> {
    return forActivePairItem(this.language.pair$, (pair) => this.drillFor(pair, slug));
  }

  private drillFor(pair: string, slug: string): Observable<Drill | undefined> {
    return this.drillCache.get(pairKey(pair, slug), () =>
      this.indexFor(pair).pipe(
        switchMap((idx) =>
          ifListed(
            idx.drills.some((d) => d.slug === slug),
            () => this.http.get<Drill>(`/assets/${pair}/drills/${slug}.json`),
          ),
        ),
      ),
    );
  }

  getDrillResolved(slug: string): Observable<PracticeResolved | undefined> {
    return forActivePairItem(this.language.pair$, (pair) => this.resolvedFor(pair, slug));
  }

  private resolvedFor(pair: string, slug: string): Observable<PracticeResolved | undefined> {
    return this.resolvedCache.get(pairKey(pair, slug), () =>
      this.drillFor(pair, slug).pipe(
        switchMap((drill) => {
          if (!drill) return of(undefined);
          // `wordOrder` is the drill's own sequence, so the resolved words keep that order rather
          // than the vocabulary's. A reference that matches no word is dropped.
          return this.vocabularyService.resolveWordRefs(pair, drill.wordOrder).pipe(
            map((words) => ({
              slug: drill.slug,
              title: drill.title,
              words,
              patterns: drill.patterns,
            })),
          );
        }),
      ),
    );
  }

  getDrillResolvedSignal(slug: Signal<string>): Signal<PracticeResolved | undefined> {
    return slugSignal(slug, (s) => this.getDrillResolved(s));
  }

  getDrillCategorySignal(slug: Signal<string>): Signal<Category | undefined> {
    return slugSignal(slug, (s) =>
      this.getDrillResolved(s).pipe(
        map((d) => (d ? { key: 'drill', label: d.title, words: d.words } : undefined)),
      ),
    );
  }
}
