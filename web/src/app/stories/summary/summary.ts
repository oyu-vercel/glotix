import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';

import { StoriesService } from '../stories.service';

@Component({
  selector: 'app-stories-summary',
  imports: [AsyncPipe, MatTableModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './summary.html',
  styleUrl: './summary.scss',
})
export class StoriesSummary {
  private readonly service = inject(StoriesService);
  private readonly router = inject(Router);

  readonly index$ = this.service.index$;
  readonly columns = ['title', 'paragraphs', 'vocabCount'];

  navigate(slug: string): void {
    this.router.navigate(['/stories', slug]);
  }
}
