import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';

import { VocabularyService } from '../vocabulary.service';
import { RepeatDeck } from '../../shared/repeat-deck/repeat-deck';

@Component({
  selector: 'app-repeat',
  imports: [RepeatDeck],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-repeat-deck [category]="category()" (exit)="onExit()" />`,
})
export class Repeat {
  readonly key = input.required<string>();

  private readonly router = inject(Router);
  readonly category = inject(VocabularyService).getCategorySignal(this.key);

  onExit(): void {
    this.router.navigate(['/category', this.key()]);
  }
}
