import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { combineLatest, map, switchMap } from 'rxjs';

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

  private readonly service = inject(StoriesService);
  private readonly router = inject(Router);

  readonly category = toSignal(
    combineLatest([toObservable(this.slug), toObservable(this.key)]).pipe(
      switchMap(([slug, key]) =>
        this.service
          .getStoryResolved(slug)
          .pipe(map((story) => story?.vocabulary.categories.find((c) => c.key === key))),
      ),
    ),
  );

  onExit(): void {
    this.router.navigate(['/stories', this.slug()], { queryParams: { cat: this.key() } });
  }
}
