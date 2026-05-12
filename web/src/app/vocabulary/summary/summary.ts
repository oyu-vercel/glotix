import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';

import { Category } from '../vocabulary.types';
import { VocabularyService } from '../vocabulary.service';
import { countWords } from '../../shared/utils/count-words';

@Component({
  selector: 'app-summary',
  imports: [AsyncPipe, MatTableModule],
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
    return countWords(categories);
  }

  navigate(key: string): void {
    this.router.navigate(['/category', key]);
  }
}
