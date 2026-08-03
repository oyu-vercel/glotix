import { Injectable, Signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, combineLatest, map, of, switchMap } from 'rxjs';

import { Book, BookIndex, ChapterResolved, ChapterVocabFile } from './books.types';
import { Category } from '../vocabulary/vocabulary.types';
import { VocabularyService } from '../vocabulary/vocabulary.service';
import { LanguageService } from '../shared/language/language.service';
import {
  KeyedCache,
  forActivePair,
  forActivePairItem,
  ifListed,
  pairKey,
  paramsSignal,
} from '../shared/data/pair-resource';

@Injectable({ providedIn: 'root' })
export class BooksService {
  private readonly http = inject(HttpClient);
  private readonly vocabularyService = inject(VocabularyService);
  private readonly language = inject(LanguageService);

  private readonly indexCache = new KeyedCache<BookIndex>();
  private readonly bookCache = new KeyedCache<Book | undefined>();
  private readonly chapterCache = new KeyedCache<ChapterResolved | undefined>();

  /** The book index of the pair currently in the URL. */
  readonly index$: Observable<BookIndex> = forActivePair(this.language.pair$, (pair) =>
    this.indexFor(pair),
  );

  private indexFor(pair: string): Observable<BookIndex> {
    return this.indexCache.get(pair, () =>
      this.http.get<BookIndex>(`/assets/${pair}/books-index.json`),
    );
  }

  getBook(slug: string): Observable<Book | undefined> {
    return forActivePairItem(this.language.pair$, (pair) => this.bookFor(pair, slug));
  }

  private bookFor(pair: string, slug: string): Observable<Book | undefined> {
    return this.bookCache.get(pairKey(pair, slug), () =>
      this.indexFor(pair).pipe(
        switchMap((idx) =>
          ifListed(
            idx.books.some((b) => b.slug === slug),
            () => this.http.get<Book>(`/assets/${pair}/books/${slug}.json`),
          ),
        ),
      ),
    );
  }

  getChapter(bookSlug: string, chapterSlug: string): Observable<ChapterResolved | undefined> {
    return forActivePairItem(this.language.pair$, (pair) =>
      this.chapterFor(pair, bookSlug, chapterSlug),
    );
  }

  private chapterFor(
    pair: string,
    bookSlug: string,
    chapterSlug: string,
  ): Observable<ChapterResolved | undefined> {
    return this.chapterCache.get(pairKey(pair, bookSlug, chapterSlug), () => {
      const base = `/assets/${pair}/books/${bookSlug}`;
      return this.bookFor(pair, bookSlug).pipe(
        switchMap((book) => {
          const chapter = book?.chapters.find((c) => c.slug === chapterSlug);
          if (!book || !chapter) return of(undefined);
          const text$ = this.http.get(`${base}/${chapter.file}`, { responseType: 'text' });
          const refs$ = this.http.get<ChapterVocabFile>(`${base}/${chapter.slug}.vocab.json`);
          return combineLatest([text$, refs$]).pipe(
            switchMap(([text, refs]) =>
              // Resolve against `pair` — the pair this chapter was cached under — rather than
              // whichever pair happens to be active by the time the response lands.
              this.vocabularyService.resolveVocabRefs(pair, refs.vocabulary).pipe(
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
      );
    });
  }

  getChapterSignal(
    bookSlug: Signal<string>,
    chapterSlug: Signal<string>,
  ): Signal<ChapterResolved | undefined> {
    return paramsSignal([bookSlug, chapterSlug], ([b, c]) => this.getChapter(b, c));
  }

  getChapterCategorySignal(
    bookSlug: Signal<string>,
    chapterSlug: Signal<string>,
    key: Signal<string>,
  ): Signal<Category | undefined> {
    return paramsSignal([bookSlug, chapterSlug, key], ([b, c, k]) =>
      this.getChapter(b, c).pipe(
        map((chapter) => chapter?.vocabulary.categories.find((cat) => cat.key === k)),
      ),
    );
  }
}
