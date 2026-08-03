import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { DECK_SURFACE } from '../deck-surface/deck-surface';
import { routeParams } from '../deck-surface/deck-params';
import { RepeatDeck } from '../repeat-deck/repeat-deck';

/** The repeat deck for whichever feature provided a `DECK_SURFACE` on its route. */
@Component({
  selector: 'app-repeat-route',
  imports: [RepeatDeck],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-repeat-deck
    [category]="category()"
    [emptyMessage]="emptyMessage"
    (exit)="onExit()"
  />`,
})
export class RepeatRoute {
  private readonly surface = inject(DECK_SURFACE);
  protected readonly params = routeParams();

  protected readonly category = this.surface.resolveCategory(this.params);
  protected readonly emptyMessage = this.surface.emptyMessage;

  protected onExit(): void {
    this.surface.exit(this.params());
  }
}
