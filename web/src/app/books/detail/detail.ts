import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { Router, RouterLink } from '@angular/router';
import { combineLatest, map, of, switchMap } from 'rxjs';

import { BooksService } from '../books.service';
import { MemorizeStorage } from '../../shared/storage/memorize-storage';
import { PageHeader } from '../../shared/page-header/page-header';
import { ProgressTable } from '../../shared/progress-table/progress-table';
import {
  ProgressColumn,
  ProgressRow,
  ProgressTotals,
  sumRows,
} from '../../shared/progress-table/progress-table.types';
import { countMemorizedInVocabulary } from '../../shared/utils/count-memorized';
import { LanguageService } from '../../shared/language/language.service';
import { BackLink } from '../../shared/back-link/back-link';

interface BookView {
  name: string;
  rows: ProgressRow[];
  totals: ProgressTotals;
}

@Component({
  selector: 'app-book-detail',
  imports: [MatButtonModule, RouterLink, PageHeader, ProgressTable, BackLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './detail.html',
  styleUrl: './detail.scss',
})
export class BookDetail {
  readonly slug = input.required<string>();

  private readonly service = inject(BooksService);
  private readonly storage = inject(MemorizeStorage);
  private readonly router = inject(Router);
  private readonly language = inject(LanguageService);

  readonly pair = this.language.pair;

  readonly columns: readonly ProgressColumn[] = [
    { kind: 'title', header: 'Chapter' },
    { kind: 'count', header: 'Words' },
    { kind: 'total', header: 'Total' },
    { kind: 'percent', header: 'Progress' },
  ];

  readonly view = toSignal(
    toObservable(this.slug).pipe(
      switchMap((slug) => this.service.getBook(slug)),
      switchMap((book) => {
        if (!book) return of(undefined);
        if (book.chapters.length === 0) {
          return of<BookView>({ name: book.name, rows: [], totals: sumRows([]) });
        }
        const memorized = this.storage.memorized();
        return combineLatest(
          book.chapters.map((c) => this.service.getChapter(book.slug, c.slug)),
        ).pipe(
          map((resolvedList): BookView => {
            const rows: ProgressRow[] = book.chapters.map((c, i) => {
              const resolved = resolvedList[i];
              const total = c.vocabCount;
              const count = resolved
                ? countMemorizedInVocabulary(resolved.vocabulary, memorized)
                : 0;
              return {
                id: c.slug,
                title: c.name,
                count,
                total,
                percent: total > 0 ? (count / total) * 100 : 0,
              };
            });
            return { name: book.name, rows, totals: sumRows(rows) };
          }),
        );
      }),
    ),
  );

  open(chapterSlug: string): void {
    this.router.navigate(['/', this.pair(), 'books', this.slug(), chapterSlug]);
  }
}
