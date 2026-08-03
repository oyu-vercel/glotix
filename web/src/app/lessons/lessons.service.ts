import { Injectable, Signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, switchMap } from 'rxjs';

import { Lesson, LessonIndex } from './lessons.types';
import { PracticeIndexEntry, PracticeResolved } from '../shared/types/practice';
import { Category, Word } from '../vocabulary/vocabulary.types';
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
export class LessonsService {
  private readonly http = inject(HttpClient);
  private readonly vocabularyService = inject(VocabularyService);
  private readonly language = inject(LanguageService);

  private readonly indexCache = new KeyedCache<LessonIndex>();
  private readonly lessonCache = new KeyedCache<Lesson | undefined>();
  private readonly resolvedCache = new KeyedCache<PracticeResolved | undefined>();
  private readonly textCache = new KeyedCache<string | null>();

  /** The lesson index of the pair currently in the URL. */
  readonly index$: Observable<LessonIndex> = forActivePair(this.language.pair$, (pair) =>
    this.indexFor(pair),
  );

  readonly lessons$: Observable<PracticeIndexEntry[]> = this.index$.pipe(map((idx) => idx.lessons));

  private indexFor(pair: string): Observable<LessonIndex> {
    return this.indexCache.get(pair, () =>
      this.http.get<LessonIndex>(`/assets/${pair}/lessons-index.json`),
    );
  }

  getLesson(slug: string): Observable<Lesson | undefined> {
    return forActivePairItem(this.language.pair$, (pair) => this.lessonFor(pair, slug));
  }

  private lessonFor(pair: string, slug: string): Observable<Lesson | undefined> {
    return this.lessonCache.get(pairKey(pair, slug), () =>
      this.indexFor(pair).pipe(
        switchMap((idx) =>
          ifListed(
            idx.lessons.some((l) => l.slug === slug),
            () => this.http.get<Lesson>(`/assets/${pair}/lessons/${slug}.json`),
          ),
        ),
      ),
    );
  }

  getLessonResolved(slug: string): Observable<PracticeResolved | undefined> {
    return forActivePairItem(this.language.pair$, (pair) => this.resolvedFor(pair, slug));
  }

  private resolvedFor(pair: string, slug: string): Observable<PracticeResolved | undefined> {
    return this.resolvedCache.get(pairKey(pair, slug), () =>
      this.lessonFor(pair, slug).pipe(
        switchMap((lesson) => {
          if (!lesson) return of(undefined);
          // A lesson names its words by headword, not by `n`. Pronunciation and examples come from
          // vocabulary.json; the translation is the lesson's own gloss, which is the meaning
          // actually taught here. Unlike a drill, a word with no vocabulary match is still kept.
          return this.vocabularyService.wordsByHeadword(pair).pipe(
            map((byCategory) => {
              const words: Word[] = lesson.words.map((ref, i) => {
                const hit = byCategory.get(ref.category)?.get(ref.target.toLowerCase());
                return {
                  n: hit?.n ?? i + 1,
                  target: ref.target,
                  pronunciation: hit?.pronunciation ?? '',
                  translation: ref.native,
                  examples: hit?.examples ?? '',
                };
              });
              return {
                slug: lesson.slug,
                title: lesson.title,
                words,
                patterns: lesson.patterns,
              };
            }),
          );
        }),
      ),
    );
  }

  /**
   * The raw lesson transcript, served from `<slug>.txt` next to the lesson JSON.
   * `null` means the lesson has no transcript file — the detail screen says so instead of erroring.
   */
  getLessonText(slug: string): Observable<string | null> {
    return forActivePairItem(this.language.pair$, (pair) => this.textFor(pair, slug));
  }

  private textFor(pair: string, slug: string): Observable<string | null> {
    return this.textCache.get(pairKey(pair, slug), () =>
      this.indexFor(pair).pipe(
        switchMap((idx) =>
          idx.lessons.some((l) => l.slug === slug)
            ? this.http
                .get(`/assets/${pair}/lessons/${slug}.txt`, { responseType: 'text' })
                .pipe(catchError(() => of(null)))
            : of(null),
        ),
      ),
    );
  }

  getLessonTextSignal(slug: Signal<string>): Signal<string | null | undefined> {
    return slugSignal(slug, (s) => this.getLessonText(s));
  }

  getLessonResolvedSignal(slug: Signal<string>): Signal<PracticeResolved | undefined> {
    return slugSignal(slug, (s) => this.getLessonResolved(s));
  }

  getLessonCategorySignal(slug: Signal<string>): Signal<Category | undefined> {
    return slugSignal(slug, (s) =>
      this.getLessonResolved(s).pipe(
        map((l) => (l ? { key: 'lesson', label: l.title, words: l.words } : undefined)),
      ),
    );
  }
}
