import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';

import { BooksService } from '../books.service';
import { MemorizeDeck } from '../../shared/memorize-deck/memorize-deck';
import { Direction } from '../../shared/utils/direction';
import { LanguageService } from '../../shared/language/language.service';

/**
 * A chapter needs two route params, so books use their own deck component rather than the shared
 * DECK_SURFACE route — a surface provided in a route's `providers` cannot read the activated
 * route's params.
 */
@Component({
  selector: 'app-book-memorize',
  imports: [MemorizeDeck],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-memorize-deck
    [category]="category()"
    [scope]="scope()"
    [direction]="direction()"
    (exit)="onExit()"
  />`,
})
export class BookMemorize {
  readonly book = input.required<string>();
  readonly slug = input.required<string>();
  readonly key = input.required<string>();
  readonly direction = input<Direction>('target');

  private readonly service = inject(BooksService);
  private readonly router = inject(Router);
  private readonly language = inject(LanguageService);

  protected readonly category = this.service.getChapterCategorySignal(
    this.book,
    this.slug,
    this.key,
  );
  protected readonly scope = computed(() => `book:${this.book()}:${this.slug()}:${this.key()}`);

  protected onExit(): void {
    this.router.navigate(['/', this.language.pair(), 'books', this.book(), this.slug()], {
      queryParams: { cat: this.key() },
    });
  }
}
