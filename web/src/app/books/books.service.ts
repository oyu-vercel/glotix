import { Injectable, Signal, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { Observable, combineLatest, map, of, shareReplay, switchMap } from 'rxjs';

import { Book, BookIndex, ChapterResolved, ChapterVocabFile } from './books.types';
import { Category } from '../vocabulary/vocabulary.types';
import { VocabularyService } from '../vocabulary/vocabulary.service';
import { LanguageService } from '../shared/language/language.service';

@Injectable({ providedIn: 'root' })
export class BooksService {
  private readonly http = inject(HttpClient);
  private readonly vocabularyService = inject(VocabularyService);
  private readonly language = inject(LanguageService);

  private readonly indexCache = new Map<string, Observable<BookIndex>>();
  private readonly bookCache = new Map<string, Observable<Book | undefined>>();
  private readonly chapterCache = new Map<string, Observable<ChapterResolved | undefined>>();

  /** The book index of the pair currently in the URL. */
  readonly index$: Observable<BookIndex> = this.language.pair$.pipe(
    switchMap((pair) => this.indexFor(pair)),
    shareReplay({ bufferSize: 1, refCount: false }),
  );

  private indexFor(pair: string): Observable<BookIndex> {
    let cached = this.indexCache.get(pair);
    if (!cached) {
      cached = this.http
        .get<BookIndex>(`/assets/${pair}/books-index.json`)
        .pipe(shareReplay({ bufferSize: 1, refCount: false }));
      this.indexCache.set(pair, cached);
    }
    return cached;
  }

  getBook(slug: string): Observable<Book | undefined> {
    return this.language.pair$.pipe(switchMap((pair) => this.bookFor(pair, slug)));
  }

  private bookFor(pair: string, slug: string): Observable<Book | undefined> {
    const key = `${pair}:${slug}`;
    let cached = this.bookCache.get(key);
    if (!cached) {
      cached = this.indexFor(pair).pipe(
        switchMap((idx) => {
          if (!idx.books.some((b) => b.slug === slug)) return of(undefined);
          return this.http.get<Book>(`/assets/${pair}/books/${slug}.json`);
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
      this.bookCache.set(key, cached);
    }
    return cached;
  }

  getChapter(bookSlug: string, chapterSlug: string): Observable<ChapterResolved | undefined> {
    return this.language.pair$.pipe(
      switchMap((pair) => this.chapterFor(pair, bookSlug, chapterSlug)),
    );
  }

  private chapterFor(
    pair: string,
    bookSlug: string,
    chapterSlug: string,
  ): Observable<ChapterResolved | undefined> {
    const key = `${pair}:${bookSlug}:${chapterSlug}`;
    let cached = this.chapterCache.get(key);
    if (!cached) {
      const base = `/assets/${pair}/books/${bookSlug}`;
      cached = this.bookFor(pair, bookSlug).pipe(
        switchMap((book) => {
          const chapter = book?.chapters.find((c) => c.slug === chapterSlug);
          if (!book || !chapter) return of(undefined);
          const text$ = this.http.get(`${base}/${chapter.file}`, { responseType: 'text' });
          const refs$ = this.http.get<ChapterVocabFile>(`${base}/${chapter.slug}.vocab.json`);
          return combineLatest([text$, refs$]).pipe(
            switchMap(([text, refs]) =>
              this.vocabularyService.resolveStoryVocab(refs.vocabulary).pipe(
                map((vocabulary) => ({
                  bookSlug: book.slug,
                  bookName: book.name,
                  slug: chapter.slug,
                  name: chapter.name,
                  text,
                  vocabulary,
                })),
              ),
            ),
          );
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
      this.chapterCache.set(key, cached);
    }
    return cached;
  }

  getChapterSignal(
    bookSlug: Signal<string>,
    chapterSlug: Signal<string>,
  ): Signal<ChapterResolved | undefined> {
    return toSignal(
      combineLatest([toObservable(bookSlug), toObservable(chapterSlug)]).pipe(
        switchMap(([b, c]) => this.getChapter(b, c)),
      ),
    );
  }

  getChapterCategorySignal(
    bookSlug: Signal<string>,
    chapterSlug: Signal<string>,
    key: Signal<string>,
  ): Signal<Category | undefined> {
    return toSignal(
      combineLatest([toObservable(bookSlug), toObservable(chapterSlug), toObservable(key)]).pipe(
        switchMap(([b, c, k]) =>
          this.getChapter(b, c).pipe(
            map((chapter) => chapter?.vocabulary.categories.find((cat) => cat.key === k)),
          ),
        ),
      ),
    );
  }
}
