import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';
import { combineLatest, map, of, switchMap } from 'rxjs';

import { StoriesService } from '../stories.service';
import { MemorizeStorage } from '../../shared/storage/memorize-storage';
import { Vocabulary } from '../../vocabulary/vocabulary.types';

interface StoryProgressRow {
  slug: string;
  title: string;
  paragraphs: number;
  count: number;
  total: number;
  percent: number;
}

interface StoriesProgressView {
  rows: StoryProgressRow[];
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

@Component({
  selector: 'app-stories-summary',
  imports: [AsyncPipe, MatTableModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './summary.html',
  styleUrl: './summary.scss',
})
export class StoriesSummary {
  private readonly service = inject(StoriesService);
  private readonly storage = inject(MemorizeStorage);
  private readonly router = inject(Router);

  readonly columns = ['title', 'paragraphs', 'count', 'total', 'percent'];

  readonly view$ = this.service.index$.pipe(
    switchMap((index) => {
      if (index.stories.length === 0) {
        return of<StoriesProgressView>({
          rows: [],
          totalCount: 0,
          grandTotal: 0,
          grandPercent: 0,
        });
      }
      const memorized = this.storage.getMemorized();
      const resolved$ = combineLatest(
        index.stories.map((s) => this.service.getStoryResolved(s.slug)),
      );
      return resolved$.pipe(
        map((resolvedList): StoriesProgressView => {
          const rows: StoryProgressRow[] = index.stories.map((s, i) => {
            const resolved = resolvedList[i];
            const total = s.vocabCount;
            const count = resolved
              ? countMemorizedInVocabulary(resolved.vocabulary, memorized)
              : 0;
            const percent = total > 0 ? (count / total) * 100 : 0;
            return {
              slug: s.slug,
              title: s.title,
              paragraphs: s.paragraphs,
              count,
              total,
              percent,
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

  navigate(slug: string): void {
    this.router.navigate(['/stories', slug]);
  }
}
