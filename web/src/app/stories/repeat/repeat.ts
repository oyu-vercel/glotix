import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { combineLatest, map, switchMap } from 'rxjs';

import { Word } from '../../vocabulary/vocabulary.types';
import { StoriesService } from '../stories.service';

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isFormField(event: Event): boolean {
  const target = event.target as HTMLElement | null;
  return !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
}

@Component({
  selector: 'app-story-repeat',
  imports: [MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './repeat.html',
  styleUrl: './repeat.scss',
  host: {
    '(document:keydown.space)': 'onSpace($event)',
    '(document:keydown.enter)': 'onEnter($event)',
  },
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

  private readonly fullShuffled = signal<Word[]>([]);
  readonly index = signal(0);

  readonly current = computed(() => this.fullShuffled()[this.index()]);
  readonly progress = computed(() => `${this.index() + 1} / ${this.fullShuffled().length}`);
  readonly hasCards = computed(() => this.fullShuffled().length > 0);

  constructor() {
    effect(() => {
      const cat = this.category();
      if (cat) {
        this.fullShuffled.set(shuffle(cat.words));
        this.index.set(0);
      }
    });
  }

  advance(): void {
    if (!this.hasCards()) return;
    this.index.update((i) => (i + 1) % this.fullShuffled().length);
  }

  onSpace(event: Event): void {
    if (isFormField(event)) return;
    event.preventDefault();
    this.advance();
  }

  onEnter(event: Event): void {
    if (isFormField(event)) return;
    this.advance();
  }

  exit(): void {
    this.router.navigate(['/stories', this.slug()], { queryParams: { cat: this.key() } });
  }
}
