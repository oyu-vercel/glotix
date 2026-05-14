import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

import { DrillsService } from '../drills.service';
import { WordTable } from '../../shared/word-table/word-table';
import { PatternsTable } from '../patterns-table/patterns-table';

@Component({
  selector: 'app-drill-detail',
  imports: [MatTabsModule, MatButtonModule, RouterLink, WordTable, PatternsTable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './detail.html',
  styleUrl: './detail.scss',
})
export class DrillDetail {
  readonly slug = input.required<string>();

  private readonly service = inject(DrillsService);

  readonly drill = toSignal(
    toObservable(this.slug).pipe(switchMap((s) => this.service.getDrillResolved(s))),
  );
}
