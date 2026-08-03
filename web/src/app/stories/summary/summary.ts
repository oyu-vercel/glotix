import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { combineLatest, map, of, switchMap } from 'rxjs';

import { StoriesService } from '../stories.service';
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

interface StoriesProgressView {
  rows: ProgressRow[];
  totals: ProgressTotals;
}

@Component({
  selector: 'app-stories-summary',
  imports: [PageHeader, ProgressTable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './summary.html',
  styleUrl: './summary.scss',
})
export class StoriesSummary {
  private readonly service = inject(StoriesService);
  private readonly storage = inject(MemorizeStorage);
  private readonly router = inject(Router);
  private readonly language = inject(LanguageService);

  readonly columns: readonly ProgressColumn[] = [
    { kind: 'title', header: 'Story' },
    { kind: 'value', header: 'Paragraphs', key: 'paragraphs' },
    { kind: 'count', header: 'Words' },
    { kind: 'total', header: 'Total' },
    { kind: 'percent', header: 'Progress' },
  ];

  readonly view = toSignal(
    this.service.index$.pipe(
      switchMap((index) => {
        if (index.stories.length === 0) {
          return of<StoriesProgressView>({ rows: [], totals: sumRows([]) });
        }
        const memorized = this.storage.memorized();
        const resolved$ = combineLatest(
          index.stories.map((s) => this.service.getStoryResolved(s.slug)),
        );
        return resolved$.pipe(
          map((resolvedList): StoriesProgressView => {
            const rows: ProgressRow[] = index.stories.map((s, i) => {
              const resolved = resolvedList[i];
              const total = s.vocabCount;
              const count = resolved
                ? countMemorizedInVocabulary(resolved.vocabulary, memorized)
                : 0;
              return {
                id: s.slug,
                title: s.title,
                values: { paragraphs: s.paragraphs },
                count,
                total,
                percent: total > 0 ? (count / total) * 100 : 0,
              };
            });
            return { rows, totals: sumRows(rows) };
          }),
        );
      }),
    ),
  );

  navigate(slug: string): void {
    this.router.navigate(['/', this.language.pair(), 'stories', slug]);
  }
}
