import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';

import { DrillsService } from '../drills.service';
import { MemorizeDeck } from '../../shared/memorize-deck/memorize-deck';
import { Direction } from '../../shared/utils/direction';
import { LanguageService } from '../../shared/language/language.service';

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
  readonly direction = input<Direction>('target');

  private readonly service = inject(DrillsService);
  private readonly router = inject(Router);
  private readonly language = inject(LanguageService);

  protected readonly category = this.service.getDrillCategorySignal(this.slug);
  protected readonly scope = computed(() => `drill:${this.slug()}`);

  protected onExit(): void {
    this.router.navigate(['/', this.language.pair(), 'drills', this.slug()]);
  }
}
