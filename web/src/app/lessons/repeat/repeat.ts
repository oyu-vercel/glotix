import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';

import { LessonsService } from '../lessons.service';
import { RepeatDeck } from '../../shared/repeat-deck/repeat-deck';

@Component({
  selector: 'app-lesson-repeat',
  imports: [RepeatDeck],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-repeat-deck
    [category]="category()"
    emptyMessage="No words in this lesson."
    (exit)="onExit()"
  />`,
})
export class LessonRepeat {
  readonly slug = input.required<string>();

  private readonly service = inject(LessonsService);
  private readonly router = inject(Router);

  protected readonly category = this.service.getLessonCategorySignal(this.slug);

  protected onExit(): void {
    this.router.navigate(['/lessons', this.slug()]);
  }
}
