import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatTableModule } from '@angular/material/table';

import {
  PROGRESS_COLUMNS,
  ProgressColumn,
  ProgressRow,
  ProgressTotals,
} from './progress-table.types';

/**
 * The summary table every feature uses: a card-shelled `mat-table` with an optional totals footer
 * and clickable rows.
 *
 * Screens supply rows and column definitions rather than markup — before this was data-driven the
 * same four column definitions, the same progress-bar block and the same clickable-row declaration
 * were hand-written in seven templates.
 */
@Component({
  selector: 'app-progress-table',
  imports: [MatTableModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './progress-table.html',
  styleUrl: './progress-table.scss',
})
export class ProgressTable {
  readonly rows = input.required<readonly ProgressRow[]>();
  readonly columns = input<readonly ProgressColumn[]>(PROGRESS_COLUMNS);
  /** Omit for a table with no footer. */
  readonly totals = input<ProgressTotals | null>(null);

  readonly rowClick = output<ProgressRow>();

  /** `mat-table` identifies columns by name, so derive a stable one per definition. */
  protected readonly columnNames = computed(() =>
    this.columns().map((c, i) => (c.kind === 'value' ? `value:${c.key}` : `${c.kind}:${i}`)),
  );

  protected readonly dataSource = computed(() => [...this.rows()]);

  protected value(row: ProgressRow, column: ProgressColumn): string {
    switch (column.kind) {
      case 'title':
        return row.title;
      case 'value':
        return `${row.values?.[column.key] ?? ''}`;
      case 'count':
        return `${row.count ?? ''}`;
      case 'total':
        return `${row.total ?? ''}`;
      case 'percent':
        return `${(row.percent ?? 0).toFixed(0)}%`;
    }
  }

  protected footer(column: ProgressColumn): string {
    const t = this.totals();
    if (!t) return '';
    switch (column.kind) {
      case 'count':
        return `${t.count}`;
      case 'total':
        return `${t.total}`;
      case 'percent':
        return `${t.percent.toFixed(t.percentDigits ?? 1)}%`;
      default:
        return '';
    }
  }
}
