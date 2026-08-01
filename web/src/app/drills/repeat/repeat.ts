import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';

import { DrillsService } from '../drills.service';
import { RepeatDeck } from '../../shared/repeat-deck/repeat-deck';
import { LanguageService } from '../../shared/language/language.service';

@Component({
  selector: 'app-drill-repeat',
  imports: [RepeatDeck],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-repeat-deck
    [category]="category()"
    emptyMessage="No words in this drill."
    (exit)="onExit()"
  />`,
})
export class DrillRepeat {
  readonly slug = input.required<string>();

  private readonly service = inject(DrillsService);
  private readonly router = inject(Router);
  private readonly language = inject(LanguageService);

  protected readonly category = this.service.getDrillCategorySignal(this.slug);

  protected onExit(): void {
    this.router.navigate(['/', this.language.pair(), 'drills', this.slug()]);
  }
}
