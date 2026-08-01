import { Injectable, Signal, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, shareReplay, switchMap } from 'rxjs';

import { Lesson, LessonIndex, LessonIndexEntry, LessonResolved } from './lessons.types';
import { Category, Word } from '../vocabulary/vocabulary.types';
import { VocabularyService } from '../vocabulary/vocabulary.service';
import { LanguageService } from '../shared/language/language.service';

@Injectable({ providedIn: 'root' })
export class LessonsService {
  private readonly http = inject(HttpClient);
  private readonly vocabularyService = inject(VocabularyService);
  private readonly language = inject(LanguageService);

  private readonly indexCache = new Map<string, Observable<LessonIndex>>();
  private readonly lessonCache = new Map<string, Observable<Lesson | undefined>>();
  private readonly resolvedCache = new Map<string, Observable<LessonResolved | undefined>>();
  private readonly textCache = new Map<string, Observable<string | null>>();

  /** The lesson index of the pair currently in the URL. */
  readonly index$: Observable<LessonIndex> = this.language.pair$.pipe(
    switchMap((pair) => this.indexFor(pair)),
    shareReplay({ bufferSize: 1, refCount: false }),
  );

  readonly lessons$: Observable<LessonIndexEntry[]> = this.index$.pipe(map((idx) => idx.lessons));

  private indexFor(pair: string): Observable<LessonIndex> {
    let cached = this.indexCache.get(pair);
    if (!cached) {
      cached = this.http
        .get<LessonIndex>(`/assets/${pair}/lessons-index.json`)
        .pipe(shareReplay({ bufferSize: 1, refCount: false }));
      this.indexCache.set(pair, cached);
    }
    return cached;
  }

  getLesson(slug: string): Observable<Lesson | undefined> {
    return this.language.pair$.pipe(switchMap((pair) => this.lessonFor(pair, slug)));
  }

  private lessonFor(pair: string, slug: string): Observable<Lesson | undefined> {
    const key = `${pair}:${slug}`;
    let cached = this.lessonCache.get(key);
    if (!cached) {
      cached = this.indexFor(pair).pipe(
        switchMap((idx) => {
          const exists = idx.lessons.some((l) => l.slug === slug);
          if (!exists) return of(undefined);
          return this.http.get<Lesson>(`/assets/${pair}/lessons/${slug}.json`);
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
      this.lessonCache.set(key, cached);
    }
    return cached;
  }

  getLessonResolved(slug: string): Observable<LessonResolved | undefined> {
    return this.language.pair$.pipe(switchMap((pair) => this.resolvedFor(pair, slug)));
  }

  private resolvedFor(pair: string, slug: string): Observable<LessonResolved | undefined> {
    const key = `${pair}:${slug}`;
    let cached = this.resolvedCache.get(key);
    if (!cached) {
      cached = this.lessonFor(pair, slug).pipe(
        switchMap((lesson) => {
          if (!lesson) return of(undefined);
          return this.vocabularyService.vocabularyFor(pair).pipe(
            map((vocab) => {
              const wordsByCat = new Map<string, Map<string, Word>>();
              for (const c of vocab.categories) {
                const inner = new Map<string, Word>();
                for (const w of c.words) inner.set(w.target.toLowerCase(), w);
                wordsByCat.set(c.key, inner);
              }
              // Pronunciation and examples come from vocabulary.json; the translation is the
              // lesson's own gloss, which is the meaning actually taught here.
              const words: Word[] = lesson.words.map((ref, i) => {
                const hit = wordsByCat.get(ref.category)?.get(ref.target.toLowerCase());
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
        shareReplay({ bufferSize: 1, refCount: false }),
      );
      this.resolvedCache.set(key, cached);
    }
    return cached;
  }

  /**
   * The raw lesson transcript, served from `<slug>.txt` next to the lesson JSON.
   * `null` means the lesson has no transcript file — the detail screen says so instead of erroring.
   */
  getLessonText(slug: string): Observable<string | null> {
    return this.language.pair$.pipe(switchMap((pair) => this.textFor(pair, slug)));
  }

  private textFor(pair: string, slug: string): Observable<string | null> {
    const key = `${pair}:${slug}`;
    let cached = this.textCache.get(key);
    if (!cached) {
      cached = this.http.get(`/assets/${pair}/lessons/${slug}.txt`, { responseType: 'text' }).pipe(
        catchError(() => of(null)),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
      this.textCache.set(key, cached);
    }
    return cached;
  }

  getLessonTextSignal(slug: Signal<string>): Signal<string | null | undefined> {
    return toSignal(toObservable(slug).pipe(switchMap((s) => this.getLessonText(s))));
  }

  getLessonResolvedSignal(slug: Signal<string>): Signal<LessonResolved | undefined> {
    return toSignal(toObservable(slug).pipe(switchMap((s) => this.getLessonResolved(s))));
  }

  getLessonCategorySignal(slug: Signal<string>): Signal<Category | undefined> {
    return toSignal(
      toObservable(slug).pipe(
        switchMap((s) =>
          this.getLessonResolved(s).pipe(
            map((l) => (l ? { key: 'lesson', label: l.title, words: l.words } : undefined)),
          ),
        ),
      ),
    );
  }
}
