import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { combineLatest, map, of, switchMap } from 'rxjs';

import { VocabularyService } from '../vocabulary.service';
import { StoriesService } from '../../stories/stories.service';
import { MemorizeStorage } from '../../shared/storage/memorize-storage';
import { countWords } from '../../shared/utils/count-words';
import { countMemorizedInVocabulary } from '../../shared/utils/count-memorized';
import { PageHeader } from '../../shared/page-header/page-header';
import { ProgressTable } from '../../shared/progress-table/progress-table';
import {
  ProgressColumn,
  ProgressRow,
  ProgressTotals,
  sumRows,
} from '../../shared/progress-table/progress-table.types';
import { LanguageService } from '../../shared/language/language.service';

/** A row that also knows where clicking it should go. */
interface NavRow extends ProgressRow {
  readonly route: readonly [string, ...string[]];
  readonly queryParams?: Readonly<Record<string, string>>;
}

interface ProgressSection {
  rows: NavRow[];
  totals: ProgressTotals;
}

@Component({
  selector: 'app-vocabulary-list',
  imports: [PageHeader, ProgressTable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './list.html',
  styleUrl: './list.scss',
})
export class List {
  private readonly vocabularyService = inject(VocabularyService);
  private readonly storiesService = inject(StoriesService);
  private readonly storage = inject(MemorizeStorage);
  private readonly router = inject(Router);
  private readonly language = inject(LanguageService);

  readonly globalColumns: readonly ProgressColumn[] = [
    { kind: 'title', header: 'Source' },
    { kind: 'count', header: 'Words' },
    { kind: 'total', header: 'Total' },
    { kind: 'percent', header: 'Progress' },
  ];

  readonly storyColumns: readonly ProgressColumn[] = [
    { kind: 'title', header: 'Story' },
    { kind: 'count', header: 'Words' },
    { kind: 'total', header: 'Total' },
    { kind: 'percent', header: 'Progress' },
  ];

  readonly globalSection = toSignal(
    this.vocabularyService.vocabulary$.pipe(
      map((vocabulary): ProgressSection => {
        const memorized = this.storage.memorized();
        const total = countWords(vocabulary.categories);
        const count = countMemorizedInVocabulary(vocabulary, memorized);
        const percent = total > 0 ? (count / total) * 100 : 0;

        const rows: NavRow[] = [
          {
            id: 'summary',
            title: 'Global Vocabulary',
            count,
            total,
            percent,
            route: ['vocabulary', 'summary'],
          },
          {
            id: 'memorized',
            title: 'Memorized Words',
            count,
            total,
            percent,
            route: ['vocabulary', 'memorized'],
          },
        ];

        return { rows, totals: sumRows(rows) };
      }),
    ),
  );

  readonly storiesSection = toSignal(
    this.storiesService.index$.pipe(
      switchMap((index) => {
        if (index.stories.length === 0) {
          return of<ProgressSection>({ rows: [], totals: sumRows([]) });
        }
        const memorized = this.storage.memorized();
        const resolved$ = combineLatest(
          index.stories.map((s) => this.storiesService.getStoryResolved(s.slug)),
        );
        return resolved$.pipe(
          map((resolvedList): ProgressSection => {
            const rows: NavRow[] = index.stories.map((s, i) => {
              const resolved = resolvedList[i];
              const total = s.vocabCount;
              const count = resolved
                ? countMemorizedInVocabulary(resolved.vocabulary, memorized)
                : 0;
              return {
                id: s.slug,
                title: s.title,
                count,
                total,
                percent: total > 0 ? (count / total) * 100 : 0,
                route: ['stories', s.slug] as const,
                queryParams: { tab: 'vocab' },
              };
            });
            return { rows, totals: sumRows(rows) };
          }),
        );
      }),
    ),
  );

  navigate(row: ProgressRow): void {
    // Rows carry pair-less segments; the active pair is prefixed here so the row builders above
    // stay free of it.
    const nav = [
      ...(this.globalSection()?.rows ?? []),
      ...(this.storiesSection()?.rows ?? []),
    ].find((r) => r.id === row.id);
    if (!nav) return;
    this.router.navigate(['/', this.language.pair(), ...nav.route], {
      queryParams: nav.queryParams,
    });
  }
}
