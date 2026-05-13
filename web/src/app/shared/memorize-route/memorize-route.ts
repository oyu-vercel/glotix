import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';

import { DECK_SURFACE } from '../deck-surface/deck-surface';
import { MemorizeDeck } from '../memorize-deck/memorize-deck';

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
  readonly slug = input<string>('');
  readonly key = input.required<string>();
  readonly direction = input<string>('italian');

  private readonly surface = inject(DECK_SURFACE);
  protected readonly category = this.surface.resolveCategory(this.slug, this.key);
  protected readonly scope = this.surface.resolveScope(this.slug, this.key);

  protected onExit(): void {
    this.surface.exit(this.slug(), this.key());
  }
}
