import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { switchMap } from 'rxjs';

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

  private readonly service = inject(VocabularyService);
  private readonly router = inject(Router);

  readonly category = toSignal(
    toObservable(this.key).pipe(switchMap((k) => this.service.getCategory(k))),
  );

  onExit(): void {
    this.router.navigate(['/category', this.key()]);
  }
}
