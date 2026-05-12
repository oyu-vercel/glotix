import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { switchMap } from 'rxjs';

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

  private readonly service = inject(VocabularyService);
  private readonly router = inject(Router);

  readonly category = toSignal(
    toObservable(this.key).pipe(switchMap((k) => this.service.getCategory(k))),
  );

  onExit(): void {
    this.router.navigate(['/category', this.key()]);
  }
}
