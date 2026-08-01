import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';

import { Word } from '../../vocabulary/vocabulary.types';

@Component({
  selector: 'app-word-table',
  imports: [MatButtonModule, MatTableModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './word-table.html',
  styleUrl: './word-table.scss',
})
export class WordTable {
  readonly words = input.required<Word[]>();
  readonly actionLabel = input<string | null>(null);
  readonly action = output<Word>();

  readonly columns = computed(() => {
    const base = ['n', 'target', 'pronunciation', 'translation', 'examples'];
    return this.actionLabel() ? [...base, 'action'] : base;
  });
}
