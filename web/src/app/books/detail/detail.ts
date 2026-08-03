import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { Router, RouterLink } from '@angular/router';
import { combineLatest, map, of, switchMap } from 'rxjs';

import { BooksService } from '../books.service';
import { MemorizeStorage } from '../../shared/storage/memorize-storage';
import { PageHeader } from '../../shared/page-header/page-header';
import { ProgressTable } from '../../shared/progress-table/progress-table';
import { countMemorizedInVocabulary } from '../../shared/utils/count-memorized';
import { LanguageService } from '../../shared/language/language.service';

interface ChapterRow {
  slug: string;
  name: string;
  count: number;
  total: number;
  percent: number;
}

interface BookView {
  name: string;
  rows: ChapterRow[];
  totalCount: number;
  grandTotal: number;
  grandPercent: number;
}

@Component({
  selector: 'app-book-detail',
  imports: [MatTableModule, MatButtonModule, RouterLink, PageHeader, ProgressTable],
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
  readonly columns = ['name', 'count', 'total', 'percent'];

  readonly view = toSignal(
    toObservable(this.slug).pipe(
      switchMap((slug) => this.service.getBook(slug)),
      switchMap((book) => {
        if (!book) return of(undefined);
        if (book.chapters.length === 0) {
          return of<BookView>({
            name: book.name,
            rows: [],
            totalCount: 0,
            grandTotal: 0,
            grandPercent: 0,
          });
        }
        const memorized = this.storage.getMemorized();
        return combineLatest(
          book.chapters.map((c) => this.service.getChapter(book.slug, c.slug)),
        ).pipe(
          map((resolvedList): BookView => {
            const rows: ChapterRow[] = book.chapters.map((c, i) => {
              const resolved = resolvedList[i];
              const total = c.vocabCount;
              const count = resolved
                ? countMemorizedInVocabulary(resolved.vocabulary, memorized)
                : 0;
              return {
                slug: c.slug,
                name: c.name,
                count,
                total,
                percent: total > 0 ? (count / total) * 100 : 0,
              };
            });
            const totalCount = rows.reduce((n, r) => n + r.count, 0);
            const grandTotal = rows.reduce((n, r) => n + r.total, 0);
            return {
              name: book.name,
              rows,
              totalCount,
              grandTotal,
              grandPercent: grandTotal > 0 ? (totalCount / grandTotal) * 100 : 0,
            };
          }),
        );
      }),
    ),
  );

  open(chapterSlug: string): void {
    this.router.navigate(['/', this.pair(), 'books', this.slug(), chapterSlug]);
  }
}
