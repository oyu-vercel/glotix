import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';

import { StoriesService } from '../stories.service';
import { RepeatDeck } from '../../shared/repeat-deck/repeat-deck';

@Component({
  selector: 'app-story-repeat',
  imports: [RepeatDeck],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-repeat-deck [category]="category()" (exit)="onExit()" />`,
})
export class StoryRepeat {
  readonly slug = input.required<string>();
  readonly key = input.required<string>();

  private readonly router = inject(Router);
  readonly category = inject(StoriesService).getStoryCategorySignal(this.slug, this.key);

  onExit(): void {
    this.router.navigate(['/stories', this.slug()], { queryParams: { cat: this.key() } });
  }
}
