import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';

import { BooksService } from '../books.service';
import { RepeatDeck } from '../../shared/repeat-deck/repeat-deck';
import { LanguageService } from '../../shared/language/language.service';

@Component({
  selector: 'app-book-repeat',
  imports: [RepeatDeck],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-repeat-deck
    [category]="category()"
    emptyMessage="No words in this category."
    (exit)="onExit()"
  />`,
})
export class BookRepeat {
  readonly book = input.required<string>();
  readonly slug = input.required<string>();
  readonly key = input.required<string>();

  private readonly service = inject(BooksService);
  private readonly router = inject(Router);
  private readonly language = inject(LanguageService);

  protected readonly category = this.service.getChapterCategorySignal(
    this.book,
    this.slug,
    this.key,
  );

  protected onExit(): void {
    this.router.navigate(['/', this.language.pair(), 'books', this.book(), this.slug()], {
      queryParams: { cat: this.key() },
    });
  }
}
