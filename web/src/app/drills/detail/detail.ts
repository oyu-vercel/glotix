import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

import { DrillsService } from '../drills.service';
import { WordTable } from '../../shared/word-table/word-table';
import { PatternsTable } from '../patterns-table/patterns-table';
import { PageHeader } from '../../shared/page-header/page-header';
import { LanguageService } from '../../shared/language/language.service';
import { BackLink } from '../../shared/back-link/back-link';

@Component({
  selector: 'app-drill-detail',
  imports: [
    MatTabsModule,
    MatButtonModule,
    RouterLink,
    WordTable,
    PatternsTable,
    PageHeader,
    BackLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './detail.html',
  styleUrl: './detail.scss',
})
export class DrillDetail {
  readonly slug = input.required<string>();

  private readonly service = inject(DrillsService);
  private readonly language = inject(LanguageService);

  readonly pair = this.language.pair;
  readonly targetLabel = this.language.targetLabel;
  readonly nativeLabel = this.language.nativeLabel;

  readonly drill = this.service.getDrillResolvedSignal(this.slug);
}
