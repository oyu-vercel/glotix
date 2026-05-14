import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';
import { combineLatest, map, of, switchMap } from 'rxjs';

import { VocabularyService } from '../vocabulary.service';
import { StoriesService } from '../../stories/stories.service';
import { MemorizeStorage } from '../../shared/storage/memorize-storage';
import { Vocabulary } from '../vocabulary.types';

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

function countMemorizedInVocabulary(vocab: Vocabulary, memorized: Set<string>): number {
  let n = 0;
  for (const c of vocab.categories) {
    for (const w of c.words) {
      if (memorized.has(w.italian)) n++;
    }
  }
  return n;
}

function totalWordsInVocabulary(vocab: Vocabulary): number {
  return vocab.categories.reduce((n, c) => n + c.words.length, 0);
}

@Component({
  selector: 'app-vocabulary-list',
  imports: [AsyncPipe, MatTableModule],
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

  readonly globalSection$ = this.vocabularyService.vocabulary$.pipe(
    map((vocabulary): ProgressSection => {
      const memorized = this.storage.getMemorized();
      const total = totalWordsInVocabulary(vocabulary);
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
  );

  readonly storiesSection$ = combineLatest([
    this.storiesService.index$,
    this.vocabularyService.vocabulary$,
  ]).pipe(
    switchMap(([index, _vocab]) => {
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
  );

  navigate(row: ProgressRow): void {
    this.router.navigate([...row.route], { queryParams: row.queryParams });
  }
}
