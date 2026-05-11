import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, shareReplay } from 'rxjs';

import { Category, Vocabulary } from './vocabulary.types';

@Injectable({ providedIn: 'root' })
export class VocabularyService {
  private readonly http = inject(HttpClient);

  readonly vocabulary$: Observable<Vocabulary> = this.http
    .get<Vocabulary>('/assets/vocabulary-italian-a2.json')
    .pipe(shareReplay({ bufferSize: 1, refCount: false }));

  getCategory(key: string): Observable<Category | undefined> {
    return this.vocabulary$.pipe(map((v) => v.categories.find((c) => c.key === key)));
  }
}
