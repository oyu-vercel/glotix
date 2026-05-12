import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatTableModule } from '@angular/material/table';

import { Word } from '../../vocabulary/vocabulary.types';

@Component({
  selector: 'app-word-table',
  imports: [MatTableModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './word-table.html',
  styleUrl: './word-table.scss',
})
export class WordTable {
  readonly words = input.required<Word[]>();
  readonly columns = ['n', 'italian', 'pronunciation', 'translation', 'examples'];
}
