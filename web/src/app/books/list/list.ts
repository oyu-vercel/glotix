import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';

import { BooksService } from '../books.service';
import { PageHeader } from '../../shared/page-header/page-header';
import { ProgressTable } from '../../shared/progress-table/progress-table';
import { LanguageService } from '../../shared/language/language.service';

@Component({
  selector: 'app-books-list',
  imports: [MatTableModule, PageHeader, ProgressTable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './list.html',
  styleUrl: './list.scss',
})
export class BooksList {
  private readonly service = inject(BooksService);
  private readonly router = inject(Router);
  private readonly language = inject(LanguageService);

  readonly columns = ['name', 'chapters'];

  readonly index = toSignal(this.service.index$);

  navigate(slug: string): void {
    this.router.navigate(['/', this.language.pair(), 'books', slug]);
  }
}
