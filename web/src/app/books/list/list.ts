import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { BooksService } from '../books.service';
import { PageHeader } from '../../shared/page-header/page-header';
import { ProgressTable } from '../../shared/progress-table/progress-table';
import { ProgressColumn, ProgressRow } from '../../shared/progress-table/progress-table.types';
import { LanguageService } from '../../shared/language/language.service';

@Component({
  selector: 'app-books-list',
  imports: [PageHeader, ProgressTable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './list.html',
  styleUrl: './list.scss',
})
export class BooksList {
  private readonly service = inject(BooksService);
  private readonly router = inject(Router);
  private readonly language = inject(LanguageService);

  readonly columns: readonly ProgressColumn[] = [
    { kind: 'title', header: 'Book' },
    { kind: 'value', header: 'Chapters', key: 'chapters' },
  ];

  private readonly index = toSignal(this.service.index$);

  readonly rows = computed<ProgressRow[] | undefined>(() =>
    this.index()?.books.map((b) => ({
      id: b.slug,
      title: b.name,
      values: { chapters: b.chapters },
    })),
  );

  navigate(slug: string): void {
    this.router.navigate(['/', this.language.pair(), 'books', slug]);
  }
}
