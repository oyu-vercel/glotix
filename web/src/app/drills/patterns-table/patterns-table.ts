import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { MatTableModule } from '@angular/material/table';

import { PatternPair } from '../../shared/types/practice';
import { LanguageService } from '../../shared/language/language.service';

@Component({
  selector: 'app-patterns-table',
  imports: [MatTableModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './patterns-table.html',
  styleUrl: './patterns-table.scss',
})
export class PatternsTable {
  readonly patterns = input.required<PatternPair[]>();

  readonly targetLabel = inject(LanguageService).targetLabel;
  readonly columns = ['n', 'target'];
}
