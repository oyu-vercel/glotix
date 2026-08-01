import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';
import { map } from 'rxjs';

import { LessonsService } from '../lessons.service';
import { PageHeader } from '../../shared/page-header/page-header';
import { ProgressTable } from '../../shared/progress-table/progress-table';
import { LanguageService } from '../../shared/language/language.service';

interface LessonRow {
  slug: string;
  title: string;
}

@Component({
  selector: 'app-lessons-list',
  imports: [MatTableModule, PageHeader, ProgressTable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './list.html',
  styleUrl: './list.scss',
})
export class LessonsList {
  private readonly service = inject(LessonsService);
  private readonly router = inject(Router);
  private readonly language = inject(LanguageService);

  readonly columns = ['title'];
  readonly targetLabel = this.language.targetLabel;

  readonly rows = toSignal(
    this.service.lessons$.pipe(
      map((lessons): LessonRow[] => lessons.map((l) => ({ slug: l.slug, title: l.title }))),
    ),
  );

  navigate(slug: string): void {
    this.router.navigate(['/', this.language.pair(), 'lessons', slug]);
  }
}
