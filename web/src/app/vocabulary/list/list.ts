import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';
import { map } from 'rxjs';

import { VocabularyService } from '../vocabulary.service';
import { StoriesService } from '../../stories/stories.service';
import { MemorizeStorage } from '../../shared/storage/memorize-storage';
import { countWords } from '../../shared/utils/count-words';

interface VocabularySource {
  name: string;
  count: number;
  route: readonly [string, ...string[]];
  queryParams?: Readonly<Record<string, string>>;
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

  readonly columns = ['name', 'count'];

  readonly globalRows$ = this.vocabularyService.vocabulary$.pipe(
    map((vocabulary): VocabularySource[] => {
      const globalCount = countWords(vocabulary.categories);
      const memorizedCount = this.storage.getMemorized().size;
      return [
        { name: 'Global Vocabulary', count: globalCount, route: ['/vocabulary/a2'] },
        { name: 'Memorized Words', count: memorizedCount, route: ['/vocabulary/memorized'] },
      ];
    }),
  );

  readonly storyRows$ = this.storiesService.index$.pipe(
    map((index): VocabularySource[] =>
      index.stories.map((s) => ({
        name: s.title,
        count: s.vocabCount,
        route: ['/stories', s.slug] as const,
        queryParams: { tab: 'vocab' },
      })),
    ),
  );

  navigate(row: VocabularySource): void {
    this.router.navigate([...row.route], { queryParams: row.queryParams });
  }
}
