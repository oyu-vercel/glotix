import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import { PatternPair } from '../../drills/drills.types';
import { shuffle } from '../utils/shuffle';
import { isFormField } from '../utils/is-form-field';

@Component({
  selector: 'app-pattern-repeat-deck',
  imports: [MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pattern-repeat-deck.html',
  styleUrl: './pattern-repeat-deck.scss',
  host: {
    '(document:keydown.space)': 'onSpace($event)',
    '(document:keydown.enter)': 'onEnter($event)',
  },
})
export class PatternRepeatDeck {
  readonly patterns = input<PatternPair[]>([]);

  readonly exit = output<void>();

  private readonly shuffled = signal<PatternPair[]>([]);
  readonly index = signal(0);

  readonly current = computed(() => this.shuffled()[this.index()]);
  readonly progress = computed(() => `${this.index() + 1} / ${this.shuffled().length}`);
  readonly hasCards = computed(() => this.shuffled().length > 0);

  constructor() {
    effect(() => {
      const p = this.patterns();
      this.shuffled.set(shuffle(p));
      this.index.set(0);
    });
  }

  advance(): void {
    if (!this.hasCards()) return;
    this.index.update((i) => (i + 1) % this.shuffled().length);
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
}
