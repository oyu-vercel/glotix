import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

import { LessonsService } from '../lessons.service';
import { WordTable } from '../../shared/word-table/word-table';
import { PatternsTable } from '../../drills/patterns-table/patterns-table';
import { PageHeader } from '../../shared/page-header/page-header';
import { AudioPlayer } from '../../shared/audio-player/audio-player';
import { LanguageService } from '../../shared/language/language.service';
import { BackLink } from '../../shared/back-link/back-link';

@Component({
  selector: 'app-lesson-detail',
  imports: [
    MatTabsModule,
    MatButtonModule,
    RouterLink,
    WordTable,
    PatternsTable,
    PageHeader,
    AudioPlayer,
    BackLink,
  ],
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

  /** Derived from the slug, exactly like the transcript — no index entry points at the audio. */
  readonly audioSrc = computed(() => `/assets/${this.pair()}/lessons/audio/${this.slug()}.mp3`);

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
