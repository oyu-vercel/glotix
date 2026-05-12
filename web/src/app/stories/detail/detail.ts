import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { Router, RouterLink } from '@angular/router';

import { StoriesService } from '../stories.service';
import { Category } from '../../vocabulary/vocabulary.types';
import { WordTable } from '../../shared/word-table/word-table';
import { countWords } from '../../shared/utils/count-words';
import { TextNode, parseStoryText } from '../utils/parse-story-text';

@Component({
  selector: 'app-story-detail',
  imports: [MatTabsModule, MatTableModule, MatButtonModule, RouterLink, WordTable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './detail.html',
  styleUrl: './detail.scss',
})
export class StoryDetail {
  readonly slug = input.required<string>();
  readonly cat = input<string | null>(null);
  readonly tab = input<string | null>(null);

  private readonly service = inject(StoriesService);
  private readonly router = inject(Router);

  readonly story = toSignal(
    toObservable(this.slug).pipe(switchMap((s) => this.service.getStoryResolved(s))),
  );

  readonly nodes = computed<TextNode[]>(() => {
    const s = this.story();
    if (!s) return [];
    return parseStoryText(s.text);
  });

  readonly nonEmptyCategories = computed<Category[]>(() => {
    const s = this.story();
    if (!s) return [];
    return s.vocabulary.categories.filter((c) => c.words.length > 0);
  });

  readonly totalVocab = computed(() => countWords(this.nonEmptyCategories()));

  readonly selectedCategory = computed<Category | undefined>(() => {
    const key = this.cat();
    if (!key) return undefined;
    return this.nonEmptyCategories().find((c) => c.key === key);
  });

  readonly summaryColumns = ['label', 'count'];

  readonly selectedTab = signal(0);

  constructor() {
    effect(() => {
      if (this.cat() || this.tab() === 'vocab') this.selectedTab.set(1);
    });
  }

  openCategory(key: string): void {
    this.router.navigate(['/stories', this.slug()], { queryParams: { cat: key } });
  }

  closeCategory(): void {
    this.router.navigate(['/stories', this.slug()]);
  }
}
