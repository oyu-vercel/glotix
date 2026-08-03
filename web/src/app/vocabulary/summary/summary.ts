import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { MemorizeStorage } from '../../shared/storage/memorize-storage';
import { PageHeader } from '../../shared/page-header/page-header';
import { ProgressTable } from '../../shared/progress-table/progress-table';
import {
  ProgressColumn,
  ProgressRow,
  ProgressTotals,
  sumRows,
} from '../../shared/progress-table/progress-table.types';
import { VocabularyService } from '../vocabulary.service';
import { LanguageService } from '../../shared/language/language.service';

@Component({
  selector: 'app-summary',
  imports: [PageHeader, ProgressTable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './summary.html',
  styleUrl: './summary.scss',
})
export class Summary {
  private readonly service = inject(VocabularyService);
  private readonly storage = inject(MemorizeStorage);
  private readonly router = inject(Router);
  private readonly language = inject(LanguageService);

  readonly vocabulary = toSignal(this.service.vocabulary$);
  readonly level = this.language.level;

  readonly columns: readonly ProgressColumn[] = [
    { kind: 'title', header: 'Category' },
    { kind: 'count', header: 'Words' },
    { kind: 'total', header: 'Total' },
    { kind: 'percent', header: 'Progress' },
  ];

  readonly rows = computed<ProgressRow[]>(() => {
    const vocab = this.vocabulary();
    if (!vocab) return [];
    const memorized = this.storage.memorized();
    return vocab.categories.map((category) => {
      const count = category.words.reduce((n, w) => n + (memorized.has(w.target) ? 1 : 0), 0);
      const total = category.words.length;
      const percent = total > 0 ? (count / total) * 100 : 0;
      return { id: category.key, title: category.label, count, total, percent };
    });
  });

  readonly totals = computed<ProgressTotals>(() => sumRows(this.rows()));

  navigate(key: string): void {
    this.router.navigate(['/', this.language.pair(), 'category', key]);
  }
}
