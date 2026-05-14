import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';

import { DrillsService } from '../drills.service';
import { MemorizeDeck } from '../../shared/memorize-deck/memorize-deck';

@Component({
  selector: 'app-drill-memorize',
  imports: [MemorizeDeck],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-memorize-deck
    [category]="category()"
    [scope]="scope()"
    [direction]="direction()"
    (exit)="onExit()"
  />`,
})
export class DrillMemorize {
  readonly slug = input.required<string>();
  readonly direction = input<string>('italian');

  private readonly service = inject(DrillsService);
  private readonly router = inject(Router);

  protected readonly category = this.service.getDrillCategorySignal(this.slug);
  protected readonly scope = computed(() => `drill:${this.slug()}`);

  protected onExit(): void {
    this.router.navigate(['/drills', this.slug()]);
  }
}
