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

import { Category, Word } from '../../vocabulary/vocabulary.types';
import { shuffle } from '../utils/shuffle';
import { isFormField } from '../utils/is-form-field';

@Component({
  selector: 'app-repeat-deck',
  imports: [MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './repeat-deck.html',
  styleUrl: './repeat-deck.scss',
  host: {
    '(document:keydown.space)': 'onSpace($event)',
    '(document:keydown.enter)': 'onEnter($event)',
  },
})
export class RepeatDeck {
  readonly category = input<Category | undefined>(undefined);

  readonly exit = output<void>();

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
}
