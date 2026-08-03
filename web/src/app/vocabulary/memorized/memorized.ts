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
} from '../../shared/progress-table/progress-table.types';
import { countWords } from '../../shared/utils/count-words';
import { VocabularyService } from '../vocabulary.service';
import { LanguageService } from '../../shared/language/language.service';

@Component({
  selector: 'app-memorized',
  imports: [PageHeader, ProgressTable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './memorized.html',
  styleUrl: './memorized.scss',
})
export class Memorized {
  private readonly storage = inject(MemorizeStorage);
  private readonly vocabularyService = inject(VocabularyService);
  private readonly router = inject(Router);
  private readonly language = inject(LanguageService);

  readonly vocabulary = toSignal(this.vocabularyService.vocabulary$);

  readonly columns: readonly ProgressColumn[] = [
    { kind: 'title', header: 'Category' },
    { kind: 'count', header: 'Words' },
    { kind: 'total', header: 'Total' },
    { kind: 'percent', header: 'Progress' },
  ];

  /** Only categories with at least one memorized word — this screen is the un-memorize view. */
  readonly rows = computed<ProgressRow[]>(() => {
    const vocab = this.vocabulary();
    if (!vocab) return [];
    const memorized = this.storage.memorized();
    const out: ProgressRow[] = [];
    for (const category of vocab.categories) {
      const count = category.words.reduce((n, w) => n + (memorized.has(w.target) ? 1 : 0), 0);
      if (count === 0) continue;
      const total = category.words.length;
      out.push({
        id: category.key,
        title: category.label,
        count,
        total,
        percent: total > 0 ? (count / total) * 100 : 0,
      });
    }
    return out;
  });

  /**
   * Deliberately not `sumRows`: the footer measures progress against the *whole* vocabulary, not
   * just the categories that happen to have a memorized word in them.
   */
  readonly totals = computed<ProgressTotals>(() => {
    const count = this.rows().reduce((n, r) => n + (r.count ?? 0), 0);
    const vocab = this.vocabulary();
    const total = vocab ? countWords(vocab.categories) : 0;
    return { count, total, percent: total > 0 ? (count / total) * 100 : 0 };
  });

  navigate(key: string): void {
    this.router.navigate(['/', this.language.pair(), 'vocabulary', 'memorized', key]);
  }
}
