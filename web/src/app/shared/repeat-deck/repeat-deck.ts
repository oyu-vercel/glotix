import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import { Category, Word } from '../../vocabulary/vocabulary.types';
import { MemorizeStorage } from '../storage/memorize-storage';
import { DeckShell } from '../deck/deck-shell';
import { deckCursor } from '../deck/deck-cursor';
import { shuffle } from '../utils/shuffle';
import { isFormField } from '../utils/is-form-field';

@Component({
  selector: 'app-repeat-deck',
  imports: [MatButtonModule, DeckShell],
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
  readonly emptyMessage = input.required<string>();

  readonly exit = output<void>();

  private readonly storage = inject(MemorizeStorage);

  private readonly fullShuffled = signal<Word[]>([]);
  private readonly cards = computed(() =>
    this.fullShuffled().filter((w) => !this.storage.memorized().has(w.target)),
  );
  protected readonly cursor = deckCursor(this.cards);

  constructor() {
    // Only a new category may reset the deck. `cards` filters against the storage signal directly,
    // so a memorized word disappears from the deck without the deck being rebuilt.
    effect(() => {
      const cat = this.category();
      if (!cat) return;
      untracked(() => {
        this.fullShuffled.set(shuffle(cat.words));
        this.cursor.reset();
      });
    });
  }

  markMemorized(): void {
    const card = this.cursor.current();
    if (!card) return;
    this.storage.addMemorized(card.target);
    this.cursor.clamp();
  }

  onSpace(event: Event): void {
    if (isFormField(event)) return;
    event.preventDefault();
    this.cursor.advance();
  }

  onEnter(event: Event): void {
    if (isFormField(event)) return;
    this.cursor.advance();
  }
}
