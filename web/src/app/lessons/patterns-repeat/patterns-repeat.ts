import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';

import { LessonsService } from '../lessons.service';
import { PatternRepeatDeck } from '../../shared/pattern-repeat-deck/pattern-repeat-deck';

@Component({
  selector: 'app-lesson-patterns-repeat',
  imports: [PatternRepeatDeck],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-pattern-repeat-deck [patterns]="patterns()" (exit)="onExit()" />`,
})
export class LessonPatternsRepeat {
  readonly slug = input.required<string>();

  private readonly service = inject(LessonsService);
  private readonly router = inject(Router);

  private readonly lesson = this.service.getLessonResolvedSignal(this.slug);

  protected readonly patterns = computed(() => this.lesson()?.patterns ?? []);

  protected onExit(): void {
    this.router.navigate(['/lessons', this.slug()]);
  }
}
