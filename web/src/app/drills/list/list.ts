import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';
import { map } from 'rxjs';

import { DrillsService } from '../drills.service';
import { PageHeader } from '../../shared/page-header/page-header';
import { ProgressTable } from '../../shared/progress-table/progress-table';

interface DrillRow {
  slug: string;
  title: string;
}

@Component({
  selector: 'app-drills-list',
  imports: [MatTableModule, PageHeader, ProgressTable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './list.html',
  styleUrl: './list.scss',
})
export class DrillsList {
  private readonly service = inject(DrillsService);
  private readonly router = inject(Router);

  readonly columns = ['title'];

  readonly rows = toSignal(
    this.service.index$.pipe(
      map((idx): DrillRow[] => idx.drills.map((d) => ({ slug: d.slug, title: d.title }))),
    ),
  );

  navigate(slug: string): void {
    this.router.navigate(['/drills', slug]);
  }
}
