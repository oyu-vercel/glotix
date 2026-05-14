import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { Router, RouterLink } from '@angular/router';

import { StoriesService } from '../stories.service';
import { Category } from '../../vocabulary/vocabulary.types';
import { WordTable } from '../../shared/word-table/word-table';
import { PageHeader } from '../../shared/page-header/page-header';
import { ProgressTable } from '../../shared/progress-table/progress-table';
import { MemorizeStorage } from '../../shared/storage/memorize-storage';
import { countWords } from '../../shared/utils/count-words';
import { TextNode, parseStoryText } from '../utils/parse-story-text';

interface VocabProgressRow {
  key: string;
  label: string;
  count: number;
  total: number;
  percent: number;
}

@Component({
  selector: 'app-story-detail',
  imports: [
    MatTabsModule,
    MatTableModule,
    MatButtonModule,
    RouterLink,
    WordTable,
    PageHeader,
    ProgressTable,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './detail.html',
  styleUrl: './detail.scss',
})
export class StoryDetail {
  readonly slug = input.required<string>();
  readonly cat = input<string | null>(null);
  readonly tab = input<string | null>(null);

  private readonly service = inject(StoriesService);
  private readonly storage = inject(MemorizeStorage);
  private readonly router = inject(Router);

  readonly story = this.service.getStoryResolvedSignal(this.slug);

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

  readonly vocabRows = computed<VocabProgressRow[]>(() => {
    const memorized = this.storage.memorized();
    return this.nonEmptyCategories().map((category) => {
      const count = category.words.reduce((n, w) => n + (memorized.has(w.italian) ? 1 : 0), 0);
      const total = category.words.length;
      const percent = total > 0 ? (count / total) * 100 : 0;
      return { key: category.key, label: category.label, count, total, percent };
    });
  });

  readonly vocabMemorizedTotal = computed(() => this.vocabRows().reduce((n, r) => n + r.count, 0));

  readonly vocabPercent = computed(() => {
    const total = this.totalVocab();
    return total > 0 ? (this.vocabMemorizedTotal() / total) * 100 : 0;
  });

  readonly selectedCategory = computed<Category | undefined>(() => {
    const key = this.cat();
    if (!key) return undefined;
    return this.nonEmptyCategories().find((c) => c.key === key);
  });

  readonly summaryColumns = ['label', 'count', 'total', 'percent'];

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
