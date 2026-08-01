import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

import { LessonsService } from '../lessons.service';
import { WordTable } from '../../shared/word-table/word-table';
import { PatternsTable } from '../../drills/patterns-table/patterns-table';
import { PageHeader } from '../../shared/page-header/page-header';
import { LanguageService } from '../../shared/language/language.service';

@Component({
  selector: 'app-lesson-detail',
  imports: [MatTabsModule, MatButtonModule, RouterLink, WordTable, PatternsTable, PageHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './detail.html',
  styleUrl: './detail.scss',
})
export class LessonDetail {
  readonly slug = input.required<string>();

  private readonly service = inject(LessonsService);
  private readonly language = inject(LanguageService);

  readonly lesson = this.service.getLessonResolvedSignal(this.slug);
  readonly pair = this.language.pair;
  readonly targetLabel = this.language.targetLabel;
  readonly nativeLabel = this.language.nativeLabel;

  readonly text = this.service.getLessonTextSignal(this.slug);

  /**
   * Blank lines split the transcript into paragraphs; nothing else is touched. Line breaks inside a
   * paragraph survive via `white-space: pre-line` rather than by rewriting the string.
   */
  readonly paragraphs = computed(() => {
    const raw = this.text();
    if (!raw) return [];
    return raw
      .split(/\r?\n[ \t]*\r?\n/)
      .map((p) => p.replace(/^\r?\n+|[ \t\r\n]+$/g, ''))
      .filter((p) => p.length > 0);
  });
}
