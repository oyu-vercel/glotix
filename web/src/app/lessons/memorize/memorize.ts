import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';

import { LessonsService } from '../lessons.service';
import { MemorizeDeck } from '../../shared/memorize-deck/memorize-deck';
import { Direction } from '../../shared/utils/direction';

@Component({
  selector: 'app-lesson-memorize',
  imports: [MemorizeDeck],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-memorize-deck
    [category]="category()"
    [scope]="scope()"
    [direction]="direction()"
    (exit)="onExit()"
  />`,
})
export class LessonMemorize {
  readonly slug = input.required<string>();
  readonly direction = input<Direction>('italian');

  private readonly service = inject(LessonsService);
  private readonly router = inject(Router);

  protected readonly category = this.service.getLessonCategorySignal(this.slug);
  protected readonly scope = computed(() => `lesson:${this.slug()}`);

  protected onExit(): void {
    this.router.navigate(['/lessons', this.slug()]);
  }
}
