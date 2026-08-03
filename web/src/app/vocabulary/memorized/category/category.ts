import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

import { MemorizeStorage } from '../../../shared/storage/memorize-storage';
import { WordTable } from '../../../shared/word-table/word-table';
import { Word } from '../../vocabulary.types';
import { VocabularyService } from '../../vocabulary.service';
import { LanguageService } from '../../../shared/language/language.service';
import { BackLink } from '../../../shared/back-link/back-link';

@Component({
  selector: 'app-memorized-category',
  imports: [MatButtonModule, RouterLink, WordTable, BackLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './category.html',
  styleUrl: './category.scss',
})
export class MemorizedCategory {
  readonly key = input.required<string>();

  private readonly storage = inject(MemorizeStorage);

  readonly pair = inject(LanguageService).pair;
  readonly category = inject(VocabularyService).getCategorySignal(this.key);

  readonly words = computed<Word[]>(() => {
    const cat = this.category();
    if (!cat) return [];
    const memorized = this.storage.memorized();
    return cat.words.filter((w) => memorized.has(w.target));
  });

  restore(word: Word): void {
    this.storage.removeMemorized(word.target);
  }
}
