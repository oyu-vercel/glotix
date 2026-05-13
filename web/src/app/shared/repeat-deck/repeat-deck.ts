import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import { Category, Word } from '../../vocabulary/vocabulary.types';
import { MemorizeStorage } from '../storage/memorize-storage';
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

  private readonly storage = inject(MemorizeStorage);

  private readonly fullShuffled = signal<Word[]>([]);
  readonly memorized = signal<Set<string>>(new Set());
  readonly cards = computed(() =>
    this.fullShuffled().filter((w) => !this.memorized().has(w.italian)),
  );
  readonly index = signal(0);

  readonly current = computed(() => this.cards()[this.index()]);
  readonly progress = computed(() => `${this.index() + 1} / ${this.cards().length}`);
  readonly hasCards = computed(() => this.cards().length > 0);

  constructor() {
    effect(() => {
      const cat = this.category();
      if (cat) {
        this.fullShuffled.set(shuffle(cat.words));
        this.memorized.set(this.storage.getMemorized());
        this.index.set(0);
      }
    });
  }

  advance(): void {
    if (!this.hasCards()) return;
    this.index.update((i) => (i + 1) % this.cards().length);
  }

  markMemorized(): void {
    if (!this.hasCards()) return;
    const card = this.current();
    if (!card) return;
    this.storage.addMemorized(card.italian);
    this.memorized.update((s) => new Set([...s, card.italian]));
    if (this.index() >= this.cards().length) {
      this.index.set(0);
    }
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
