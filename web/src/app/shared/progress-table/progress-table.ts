import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Slot-based table shell for summary/progress tables.
 *
 * Wraps the parent's `<table mat-table>` in the project's standard card shell
 * (cream-warm surface, 22px radius, layered shadow) and provides scoped styles
 * for the recurring cell patterns used across vocabulary/stories/drills summaries:
 *
 * - `.summary-table` — the table itself.
 * - `.title-cell` — first column (Source / Story / Drill / Category / etc.).
 * - `.num-col` / `.count-col` — right-aligned numeric columns (interchangeable names).
 * - `.progress-col` + `.progress-cell` + `.progress-track` + `.progress-fill` + `.progress-num` — sage progress bar.
 * - `.clickable-row` — hover + focus-visible behavior.
 * - `.totals-row` + `.footer-label` + `.footer-total` — sage-warm totals footer.
 *
 * Usage:
 * ```html
 * <app-progress-table>
 *   <table mat-table [dataSource]="rows()" class="summary-table">
 *     <!-- column defs -->
 *   </table>
 * </app-progress-table>
 * ```
 */
@Component({
  selector: 'app-progress-table',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<div class="table-wrap"><ng-content /></div>',
  styleUrl: './progress-table.scss',
})
export class ProgressTable {}
