import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';

import { StoriesService } from '../stories.service';
import { MemorizeDeck } from '../../shared/memorize-deck/memorize-deck';

@Component({
  selector: 'app-story-memorize',
  imports: [MemorizeDeck],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-memorize-deck
    [category]="category()"
    [scope]="scope()"
    [direction]="direction()"
    (exit)="onExit()"
  />`,
})
export class StoryMemorize {
  readonly slug = input.required<string>();
  readonly key = input.required<string>();
  readonly direction = input<string>('italian');

  private readonly router = inject(Router);

  readonly scope = computed(() => `story:${this.slug()}:${this.key()}`);
  readonly category = inject(StoriesService).getStoryCategorySignal(this.slug, this.key);

  onExit(): void {
    this.router.navigate(['/stories', this.slug()], { queryParams: { cat: this.key() } });
  }
}
