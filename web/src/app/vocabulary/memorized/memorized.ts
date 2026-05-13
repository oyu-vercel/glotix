import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';

import { MemorizeStorage } from '../../shared/storage/memorize-storage';
import { VocabularyService } from '../vocabulary.service';

interface MemorizedCategoryRow {
  key: string;
  label: string;
  count: number;
  total: number;
  percent: number;
}

@Component({
  selector: 'app-memorized',
  imports: [MatTableModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './memorized.html',
  styleUrl: './memorized.scss',
})
export class Memorized {
  private readonly storage = inject(MemorizeStorage);
  private readonly vocabularyService = inject(VocabularyService);
  private readonly router = inject(Router);

  readonly memorized = signal<Set<string>>(this.storage.getMemorized());
  readonly vocabulary = toSignal(this.vocabularyService.vocabulary$);

  readonly columns = ['label', 'count', 'total', 'percent'];

  readonly rows = computed<MemorizedCategoryRow[]>(() => {
    const vocab = this.vocabulary();
    if (!vocab) return [];
    const memorized = this.memorized();
    const out: MemorizedCategoryRow[] = [];
    for (const category of vocab.categories) {
      const count = category.words.reduce((n, w) => n + (memorized.has(w.italian) ? 1 : 0), 0);
      if (count === 0) continue;
      const total = category.words.length;
      const percent = total > 0 ? (count / total) * 100 : 0;
      out.push({ key: category.key, label: category.label, count, total, percent });
    }
    return out;
  });

  readonly total = computed(() => this.rows().reduce((n, r) => n + r.count, 0));

  readonly grandTotal = computed(() => {
    const vocab = this.vocabulary();
    if (!vocab) return 0;
    return vocab.categories.reduce((n, c) => n + c.words.length, 0);
  });

  readonly grandPercent = computed(() => {
    const g = this.grandTotal();
    return g > 0 ? (this.total() / g) * 100 : 0;
  });

  navigate(key: string): void {
    this.router.navigate(['/vocabulary/memorized', key]);
  }
}
