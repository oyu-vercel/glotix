import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';

import { MemorizeStorage } from '../../shared/storage/memorize-storage';
import { PageHeader } from '../../shared/page-header/page-header';
import { ProgressTable } from '../../shared/progress-table/progress-table';
import { VocabularyService } from '../vocabulary.service';
import { LanguageService } from '../../shared/language/language.service';

interface CategoryProgressRow {
  key: string;
  label: string;
  count: number;
  total: number;
  percent: number;
}

@Component({
  selector: 'app-summary',
  imports: [MatTableModule, PageHeader, ProgressTable],
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

  readonly columns = ['label', 'count', 'total', 'percent'];

  readonly rows = computed<CategoryProgressRow[]>(() => {
    const vocab = this.vocabulary();
    if (!vocab) return [];
    const memorized = this.storage.memorized();
    return vocab.categories.map((category) => {
      const count = category.words.reduce((n, w) => n + (memorized.has(w.target) ? 1 : 0), 0);
      const total = category.words.length;
      const percent = total > 0 ? (count / total) * 100 : 0;
      return { key: category.key, label: category.label, count, total, percent };
    });
  });

  readonly total = computed(() => this.rows().reduce((n, r) => n + r.count, 0));

  readonly grandTotal = computed(() => this.rows().reduce((n, r) => n + r.total, 0));

  readonly grandPercent = computed(() => {
    const g = this.grandTotal();
    return g > 0 ? (this.total() / g) * 100 : 0;
  });

  navigate(key: string): void {
    this.router.navigate(['/', this.language.pair(), 'category', key]);
  }
}
