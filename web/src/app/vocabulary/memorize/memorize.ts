import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';

import { VocabularyService } from '../vocabulary.service';
import { MemorizeDeck } from '../../shared/memorize-deck/memorize-deck';

@Component({
  selector: 'app-memorize',
  imports: [MemorizeDeck],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-memorize-deck
    [category]="category()"
    [scope]="key()"
    [direction]="direction()"
    (exit)="onExit()"
  />`,
})
export class Memorize {
  readonly key = input.required<string>();
  readonly direction = input<string>('italian');

  private readonly router = inject(Router);
  readonly category = inject(VocabularyService).getCategorySignal(this.key);

  onExit(): void {
    this.router.navigate(['/category', this.key()]);
  }
}
