import { Injectable, Provider, Signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';

import { Category } from '../vocabulary/vocabulary.types';
import { BooksService } from './books.service';
import { DECK_SURFACE, DeckParams, DeckSurface } from '../shared/deck-surface/deck-surface';
import { LanguageService } from '../shared/language/language.service';

/** A chapter is identified by three params (`book`, `slug`, `key`) — the deepest of the five. */
@Injectable()
class BookDeckSurface implements DeckSurface {
  private readonly router = inject(Router);
  private readonly books = inject(BooksService);
  private readonly language = inject(LanguageService);

  readonly emptyMessage = 'No words in this category.';

  resolveCategory(params: Signal<DeckParams>): Signal<Category | undefined> {
    return this.books.getChapterCategorySignal(
      computed(() => params()['book'] ?? ''),
      computed(() => params()['slug'] ?? ''),
      computed(() => params()['key'] ?? ''),
    );
  }

  resolveScope(params: Signal<DeckParams>): Signal<string> {
    return computed(() => {
      const p = params();
      return `book:${p['book']}:${p['slug']}:${p['key']}`;
    });
  }

  exit(params: DeckParams): void {
    this.router.navigate(['/', this.language.pair(), 'books', params['book'], params['slug']], {
      queryParams: { cat: params['key'] },
    });
  }
}

export function provideBookDeckSurface(): Provider {
  return { provide: DECK_SURFACE, useClass: BookDeckSurface };
}
