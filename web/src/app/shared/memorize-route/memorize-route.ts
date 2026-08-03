import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';

import { DECK_SURFACE } from '../deck-surface/deck-surface';
import { routeParams } from '../deck-surface/deck-params';
import { MemorizeDeck } from '../memorize-deck/memorize-deck';
import { Direction } from '../utils/direction';

/** The memorize deck for whichever feature provided a `DECK_SURFACE` on its route. */
@Component({
  selector: 'app-memorize-route',
  imports: [MemorizeDeck],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-memorize-deck
    [category]="category()"
    [scope]="scope()"
    [direction]="direction()"
    (exit)="onExit()"
  />`,
})
export class MemorizeRoute {
  /** Bound from the `?direction=` query param. */
  readonly direction = input<Direction>('target');

  private readonly surface = inject(DECK_SURFACE);
  protected readonly params = routeParams();

  protected readonly category = this.surface.resolveCategory(this.params);
  protected readonly scope = this.surface.resolveScope(this.params);

  protected onExit(): void {
    this.surface.exit(this.params());
  }
}
