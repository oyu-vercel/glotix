import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { DECK_SURFACE } from '../deck-surface/deck-surface';
import { routeParams } from '../deck-surface/deck-params';
import { PatternRepeatDeck } from '../pattern-repeat-deck/pattern-repeat-deck';
import { PatternPair } from '../types/practice';

/**
 * The phrase-pattern deck, for the features that have one. Kept separate from the word decks
 * because it drills `PatternPair`s rather than a `Category`, and its route has no `:key`.
 */
@Component({
  selector: 'app-patterns-repeat-route',
  imports: [PatternRepeatDeck],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-pattern-repeat-deck [patterns]="patterns()" (exit)="onExit()" />`,
})
export class PatternsRepeatRoute {
  private readonly surface = inject(DECK_SURFACE);
  protected readonly params = routeParams();

  private readonly resolved = this.surface.resolvePatterns?.(this.params);
  protected readonly patterns = computed<PatternPair[]>(() => this.resolved?.() ?? []);

  protected onExit(): void {
    this.surface.exit(this.params());
  }
}
