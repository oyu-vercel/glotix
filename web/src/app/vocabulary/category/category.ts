import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

import { VocabularyService } from '../vocabulary.service';
import { WordTable } from '../../shared/word-table/word-table';

@Component({
  selector: 'app-category',
  imports: [MatButtonModule, RouterLink, WordTable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './category.html',
  styleUrl: './category.scss',
})
export class Category {
  readonly key = input.required<string>();
  readonly category = inject(VocabularyService).getCategorySignal(this.key);
}
