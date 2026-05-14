import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatTableModule } from '@angular/material/table';

import { PatternPair } from '../drills.types';

@Component({
  selector: 'app-patterns-table',
  imports: [MatTableModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './patterns-table.html',
  styleUrl: './patterns-table.scss',
})
export class PatternsTable {
  readonly patterns = input.required<PatternPair[]>();

  readonly columns = ['n', 'italian'];
}
