import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toObservable } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';

import { VocabularyService } from '../vocabulary.service';
import { WordTable } from '../../shared/word-table/word-table';

@Component({
  selector: 'app-category',
  imports: [CommonModule, MatButtonModule, RouterLink, WordTable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './category.html',
  styleUrl: './category.scss',
})
export class Category {
  readonly key = input.required<string>();

  private readonly service = inject(VocabularyService);

  readonly category$ = toObservable(this.key).pipe(
    switchMap((k) => this.service.getCategory(k)),
  );
}
