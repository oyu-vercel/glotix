import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

import { StoriesService } from '../stories.service';
import { Category } from '../../vocabulary/vocabulary.types';

interface TextNode {
  type: 'h2' | 'p';
  text: string;
}

@Component({
  selector: 'app-story-detail',
  imports: [CommonModule, MatTabsModule, MatTableModule, MatButtonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './detail.html',
  styleUrl: './detail.scss',
})
export class StoryDetail {
  readonly slug = input.required<string>();

  private readonly service = inject(StoriesService);

  readonly story = toSignal(
    toObservable(this.slug).pipe(switchMap((s) => this.service.getStory(s))),
  );

  readonly selectedCategoryKey = signal<string | null>(null);

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

  readonly totalVocab = computed(() => {
    return this.nonEmptyCategories().reduce((sum, c) => sum + c.words.length, 0);
  });

  readonly selectedCategory = computed<Category | undefined>(() => {
    const key = this.selectedCategoryKey();
    if (!key) return undefined;
    return this.nonEmptyCategories().find((c) => c.key === key);
  });

  readonly summaryColumns = ['label', 'count'];
  readonly wordColumns = ['n', 'italian', 'pronunciation', 'translation', 'examples'];

  openCategory(key: string): void {
    this.selectedCategoryKey.set(key);
  }

  closeCategory(): void {
    this.selectedCategoryKey.set(null);
  }
}

function parseStoryText(raw: string): TextNode[] {
  const lines = raw.split(/\r?\n/);
  const nodes: TextNode[] = [];
  let titleSkipped = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (!titleSkipped) {
      titleSkipped = true;
      continue;
    }
    if (isSectionHeader(trimmed)) {
      nodes.push({ type: 'h2', text: trimmed.replace(/\.$/, '') });
    } else {
      nodes.push({ type: 'p', text: trimmed });
    }
  }
  return nodes;
}

function isSectionHeader(line: string): boolean {
  if (line.length > 60) return false;
  if (!line.endsWith('.')) return false;
  if (line.includes('«') || line.includes('»') || line.includes('"')) return false;
  // 1-3 words ending with a period — likely a header
  const wordCount = line.replace(/\.$/, '').split(/\s+/).length;
  return wordCount <= 6;
}
