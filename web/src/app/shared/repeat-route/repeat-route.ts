import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';

import { DECK_SURFACE } from '../deck-surface/deck-surface';
import { RepeatDeck } from '../repeat-deck/repeat-deck';

@Component({
  selector: 'app-repeat-route',
  imports: [RepeatDeck],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-repeat-deck [category]="category()" (exit)="onExit()" />`,
})
export class RepeatRoute {
  readonly slug = input<string>('');
  readonly key = input.required<string>();

  private readonly surface = inject(DECK_SURFACE);
  protected readonly category = this.surface.resolveCategory(this.slug, this.key);

  protected onExit(): void {
    this.surface.exit(this.slug(), this.key());
  }
}
