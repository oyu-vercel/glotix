import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

/**
 * The chrome around every flashcard deck: exit button, progress readout, an optional slot for
 * extra topbar controls, and the card frame itself.
 *
 * The three decks (memorize, repeat, pattern repeat) previously each carried their own copy of
 * this markup and roughly 60 identical lines of SCSS. Card *contents* still belong to each deck,
 * so they are projected into `[card]`.
 *
 * Three display states: cards to show, loaded-but-nothing-to-show, and still loading. The middle
 * one renders `emptyMessage` when it is a plain sentence, or the projected `[empty]` slot when a
 * deck needs richer markup.
 */
@Component({
  selector: 'app-deck-shell',
  imports: [MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './deck-shell.html',
  styleUrl: './deck-shell.scss',
})
export class DeckShell {
  readonly progress = input.required<string>();
  readonly hasCards = input.required<boolean>();
  /** True once the data has loaded — distinguishes "nothing to show" from "not loaded yet". */
  readonly isEmpty = input<boolean>(false);
  readonly emptyMessage = input<string | null>(null);

  readonly exit = output<void>();
  readonly cardClick = output<void>();
}
