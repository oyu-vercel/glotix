import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { Router } from '@angular/router';

import { DrillsService } from '../drills.service';
import { PatternRepeatDeck } from '../../shared/pattern-repeat-deck/pattern-repeat-deck';

@Component({
  selector: 'app-drill-patterns-repeat',
  imports: [PatternRepeatDeck],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-pattern-repeat-deck [patterns]="patterns()" (exit)="onExit()" />`,
})
export class DrillPatternsRepeat {
  readonly slug = input.required<string>();

  private readonly service = inject(DrillsService);
  private readonly router = inject(Router);

  private readonly drill = toSignal(
    toObservable(this.slug).pipe(switchMap((s) => this.service.getDrillResolved(s))),
  );

  protected readonly patterns = computed(() => this.drill()?.patterns ?? []);

  protected onExit(): void {
    this.router.navigate(['/drills', this.slug()]);
  }
}
