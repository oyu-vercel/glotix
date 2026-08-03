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

import { BooksService } from '../books.service';
import { Category } from '../../vocabulary/vocabulary.types';
import { WordTable } from '../../shared/word-table/word-table';
import { PageHeader } from '../../shared/page-header/page-header';
import { ProgressTable } from '../../shared/progress-table/progress-table';
import {
  ProgressColumn,
  ProgressRow,
  ProgressTotals,
} from '../../shared/progress-table/progress-table.types';
import { MemorizeStorage } from '../../shared/storage/memorize-storage';
import { countWords } from '../../shared/utils/count-words';
import { TextNode, parseChapterText } from '../utils/parse-chapter-text';
import { LanguageService } from '../../shared/language/language.service';
import { BackLink } from '../../shared/back-link/back-link';

@Component({
  selector: 'app-book-chapter',
  imports: [
    MatTabsModule,
    MatTableModule,
    MatButtonModule,
    RouterLink,
    WordTable,
    PageHeader,
    ProgressTable,
    BackLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chapter.html',
  styleUrl: './chapter.scss',
})
export class BookChapter {
  readonly book = input.required<string>();
  readonly slug = input.required<string>();
  readonly cat = input<string | null>(null);
  readonly tab = input<string | null>(null);

  private readonly service = inject(BooksService);
  private readonly storage = inject(MemorizeStorage);
  private readonly router = inject(Router);
  private readonly language = inject(LanguageService);

  readonly pair = this.language.pair;
  readonly level = this.language.level;
  readonly targetLabel = this.language.targetLabel;
  readonly nativeLabel = this.language.nativeLabel;

  readonly chapter = this.service.getChapterSignal(this.book, this.slug);

  readonly nodes = computed<TextNode[]>(() => {
    const c = this.chapter();
    return c ? parseChapterText(c.text) : [];
  });

  readonly nonEmptyCategories = computed<Category[]>(() => {
    const c = this.chapter();
    if (!c) return [];
    return c.vocabulary.categories.filter((cat) => cat.words.length > 0);
  });

  readonly totalVocab = computed(() => countWords(this.nonEmptyCategories()));

  readonly vocabRows = computed<ProgressRow[]>(() => {
    const memorized = this.storage.memorized();
    return this.nonEmptyCategories().map((category) => {
      const count = category.words.reduce((n, w) => n + (memorized.has(w.target) ? 1 : 0), 0);
      const total = category.words.length;
      return {
        id: category.key,
        title: category.label,
        count,
        total,
        percent: total > 0 ? (count / total) * 100 : 0,
      };
    });
  });

  /** Footer measures against every non-empty category of this chapter. */
  readonly vocabTotals = computed<ProgressTotals>(() => {
    const count = this.vocabRows().reduce((n, r) => n + (r.count ?? 0), 0);
    const total = this.totalVocab();
    return { count, total, percent: total > 0 ? (count / total) * 100 : 0 };
  });

  readonly selectedCategory = computed<Category | undefined>(() => {
    const key = this.cat();
    if (!key) return undefined;
    return this.nonEmptyCategories().find((c) => c.key === key);
  });

  readonly summaryColumns: readonly ProgressColumn[] = [
    { kind: 'title', header: 'Category' },
    { kind: 'count', header: 'Words' },
    { kind: 'total', header: 'Total' },
    { kind: 'percent', header: 'Progress' },
  ];

  readonly selectedTab = signal(0);

  constructor() {
    effect(() => {
      if (this.cat() || this.tab() === 'vocab') this.selectedTab.set(1);
    });
  }

  openCategory(key: string): void {
    this.router.navigate(['/', this.pair(), 'books', this.book(), this.slug()], {
      queryParams: { cat: key },
    });
  }

  closeCategory(): void {
    this.router.navigate(['/', this.pair(), 'books', this.book(), this.slug()]);
  }
}
