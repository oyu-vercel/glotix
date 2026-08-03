import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

import { VocabularyService } from '../vocabulary.service';
import { WordTable } from '../../shared/word-table/word-table';
import { LanguageService } from '../../shared/language/language.service';
import { BackLink } from '../../shared/back-link/back-link';

@Component({
  selector: 'app-category',
  imports: [MatButtonModule, RouterLink, WordTable, BackLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './category.html',
  styleUrl: './category.scss',
})
export class Category {
  readonly key = input.required<string>();
  readonly category = inject(VocabularyService).getCategorySignal(this.key);

  private readonly language = inject(LanguageService);
  readonly pair = this.language.pair;
  readonly targetLabel = this.language.targetLabel;
  readonly nativeLabel = this.language.nativeLabel;
}
