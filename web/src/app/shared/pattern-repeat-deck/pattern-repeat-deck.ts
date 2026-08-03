import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';

import { PatternPair } from '../types/practice';
import { DeckShell } from '../deck/deck-shell';
import { deckCursor } from '../deck/deck-cursor';
import { shuffle } from '../utils/shuffle';
import { isFormField } from '../utils/is-form-field';

@Component({
  selector: 'app-pattern-repeat-deck',
  imports: [DeckShell],
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
  protected readonly cursor = deckCursor(this.shuffled);

  constructor() {
    effect(() => {
      this.shuffled.set(shuffle(this.patterns()));
      this.cursor.reset();
    });
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
