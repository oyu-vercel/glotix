import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';

import { Category } from '../vocabulary.types';
import { VocabularyService } from '../vocabulary.service';

@Component({
  selector: 'app-summary',
  imports: [CommonModule, MatTableModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './summary.html',
  styleUrl: './summary.scss',
})
export class Summary {
  private readonly service = inject(VocabularyService);
  private readonly router = inject(Router);

  readonly vocabulary$ = this.service.vocabulary$;
  readonly columns = ['label', 'count'];

  total(categories: Category[]): number {
    return categories.reduce((sum, c) => sum + c.words.length, 0);
  }

  navigate(key: string): void {
    this.router.navigate(['/category', key]);
  }
}
