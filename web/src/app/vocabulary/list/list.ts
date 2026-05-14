import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';
import { combineLatest, map, of, switchMap } from 'rxjs';

import { VocabularyService } from '../vocabulary.service';
import { StoriesService } from '../../stories/stories.service';
import { MemorizeStorage } from '../../shared/storage/memorize-storage';
import { countWords } from '../../shared/utils/count-words';
import { countMemorizedInVocabulary } from '../../shared/utils/count-memorized';
import { PageHeader } from '../../shared/page-header/page-header';
import { ProgressTable } from '../../shared/progress-table/progress-table';

interface ProgressRow {
  name: string;
  count: number;
  total: number;
  percent: number;
  route: readonly [string, ...string[]];
  queryParams?: Readonly<Record<string, string>>;
}

interface ProgressSection {
  rows: ProgressRow[];
  totalCount: number;
  grandTotal: number;
  grandPercent: number;
}

@Component({
  selector: 'app-vocabulary-list',
  imports: [MatTableModule, PageHeader, ProgressTable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './list.html',
  styleUrl: './list.scss',
})
export class List {
  private readonly vocabularyService = inject(VocabularyService);
  private readonly storiesService = inject(StoriesService);
  private readonly storage = inject(MemorizeStorage);
  private readonly router = inject(Router);

  readonly columns = ['name', 'count', 'total', 'percent'];

  readonly globalSection = toSignal(
    this.vocabularyService.vocabulary$.pipe(
      map((vocabulary): ProgressSection => {
        const memorized = this.storage.getMemorized();
        const total = countWords(vocabulary.categories);
        const memorizedInVocab = countMemorizedInVocabulary(vocabulary, memorized);
        const percent = total > 0 ? (memorizedInVocab / total) * 100 : 0;

        const rows: ProgressRow[] = [
          {
            name: 'Global Vocabulary',
            count: memorizedInVocab,
            total,
            percent,
            route: ['/vocabulary/a2'],
          },
          {
            name: 'Memorized Words',
            count: memorizedInVocab,
            total,
            percent,
            route: ['/vocabulary/memorized'],
          },
        ];

        return {
          rows,
          totalCount: rows.reduce((n, r) => n + r.count, 0),
          grandTotal: rows.reduce((n, r) => n + r.total, 0),
          grandPercent: percent,
        };
      }),
    ),
  );

  readonly storiesSection = toSignal(
    this.storiesService.index$.pipe(
      switchMap((index) => {
        if (index.stories.length === 0) {
          return of<ProgressSection>({ rows: [], totalCount: 0, grandTotal: 0, grandPercent: 0 });
        }
        const memorized = this.storage.getMemorized();
        const resolved$ = combineLatest(
          index.stories.map((s) => this.storiesService.getStoryResolved(s.slug)),
        );
        return resolved$.pipe(
          map((resolvedList): ProgressSection => {
            const rows: ProgressRow[] = index.stories.map((s, i) => {
              const resolved = resolvedList[i];
              const total = s.vocabCount;
              const count = resolved
                ? countMemorizedInVocabulary(resolved.vocabulary, memorized)
                : 0;
              const percent = total > 0 ? (count / total) * 100 : 0;
              return {
                name: s.title,
                count,
                total,
                percent,
                route: ['/stories', s.slug] as const,
                queryParams: { tab: 'vocab' },
              };
            });
            const totalCount = rows.reduce((n, r) => n + r.count, 0);
            const grandTotal = rows.reduce((n, r) => n + r.total, 0);
            const grandPercent = grandTotal > 0 ? (totalCount / grandTotal) * 100 : 0;
            return { rows, totalCount, grandTotal, grandPercent };
          }),
        );
      }),
    ),
  );

  navigate(row: ProgressRow): void {
    this.router.navigate([...row.route], { queryParams: row.queryParams });
  }
}
