import { Injectable, Signal, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of, shareReplay, switchMap } from 'rxjs';

import { Lesson, LessonIndex, LessonResolved } from './lessons.types';
import { Category, Word } from '../vocabulary/vocabulary.types';
import { VocabularyService } from '../vocabulary/vocabulary.service';

@Injectable({ providedIn: 'root' })
export class LessonsService {
  private readonly http = inject(HttpClient);
  private readonly vocabularyService = inject(VocabularyService);

  readonly index$: Observable<LessonIndex> = this.http
    .get<LessonIndex>('/assets/lessons-index.json')
    .pipe(shareReplay({ bufferSize: 1, refCount: false }));

  private readonly lessonCache = new Map<string, Observable<Lesson | undefined>>();
  private readonly resolvedCache = new Map<string, Observable<LessonResolved | undefined>>();

  getLesson(slug: string): Observable<Lesson | undefined> {
    let cached = this.lessonCache.get(slug);
    if (!cached) {
      cached = this.index$.pipe(
        switchMap((idx) => {
          const exists = idx.lessons.some((l) => l.slug === slug);
          if (!exists) return of(undefined);
          return this.http.get<Lesson>(`/assets/lessons/${slug}.json`);
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
      this.lessonCache.set(slug, cached);
    }
    return cached;
  }

  getLessonResolved(slug: string): Observable<LessonResolved | undefined> {
    let cached = this.resolvedCache.get(slug);
    if (!cached) {
      cached = this.getLesson(slug).pipe(
        switchMap((lesson) => {
          if (!lesson) return of(undefined);
          return this.vocabularyService.vocabulary$.pipe(
            map((vocab) => {
              const wordsByCat = new Map<string, Map<string, Word>>();
              for (const c of vocab.categories) {
                const inner = new Map<string, Word>();
                for (const w of c.words) inner.set(w.italian.toLowerCase(), w);
                wordsByCat.set(c.key, inner);
              }
              // Pronunciation and examples come from vocabulary.json; the translation is the
              // lesson's own gloss, which is the meaning actually taught here.
              const words: Word[] = lesson.words.map((ref, i) => {
                const hit = wordsByCat.get(ref.category)?.get(ref.italian.toLowerCase());
                return {
                  n: hit?.n ?? i + 1,
                  italian: ref.italian,
                  pronunciation: hit?.pronunciation ?? '',
                  translation: ref.russian,
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
      this.resolvedCache.set(slug, cached);
    }
    return cached;
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
