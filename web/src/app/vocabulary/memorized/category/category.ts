import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

import { MemorizeStorage } from '../../../shared/storage/memorize-storage';
import { WordTable } from '../../../shared/word-table/word-table';
import { Word } from '../../vocabulary.types';
import { VocabularyService } from '../../vocabulary.service';

@Component({
  selector: 'app-memorized-category',
  imports: [MatButtonModule, RouterLink, WordTable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './category.html',
  styleUrl: './category.scss',
})
export class MemorizedCategory {
  readonly key = input.required<string>();

  private readonly storage = inject(MemorizeStorage);
  private readonly vocabularyService = inject(VocabularyService);

  readonly memorized = signal<Set<string>>(this.storage.getMemorized());
  readonly vocabulary = toSignal(this.vocabularyService.vocabulary$);

  readonly category = computed(() => {
    const v = this.vocabulary();
    if (!v) return undefined;
    return v.categories.find((c) => c.key === this.key());
  });

  readonly words = computed<Word[]>(() => {
    const cat = this.category();
    if (!cat) return [];
    const memorized = this.memorized();
    return cat.words.filter((w) => memorized.has(w.italian));
  });

  restore(word: Word): void {
    this.storage.removeMemorized(word.italian);
    this.memorized.update((s) => {
      const next = new Set(s);
      next.delete(word.italian);
      return next;
    });
  }
}
