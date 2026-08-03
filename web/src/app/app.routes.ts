import { Routes } from '@angular/router';

import { provideStoryDeckSurface } from './stories/story-deck-surface';
import { provideVocabularyDeckSurface } from './vocabulary/vocabulary-deck-surface';
import { provideBookDeckSurface } from './books/book-deck-surface';
import { provideDrillDeckSurface } from './drills/drill-deck-surface';
import { provideLessonDeckSurface } from './lessons/lesson-deck-surface';
import { pairMatch } from './shared/language/pair-match-guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./shared/language/picker/picker').then((m) => m.LanguagePicker),
  },
  {
    // Componentless: every feature lives under the active language pair.
    path: ':pair',
    canMatch: [pairMatch],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'vocabulary' },
      {
        path: 'vocabulary',
        loadComponent: () => import('./vocabulary/list/list').then((m) => m.List),
      },
      {
        path: 'vocabulary/summary',
        loadComponent: () => import('./vocabulary/summary/summary').then((m) => m.Summary),
      },
      {
        path: 'vocabulary/memorized',
        loadComponent: () => import('./vocabulary/memorized/memorized').then((m) => m.Memorized),
      },
      {
        path: 'vocabulary/memorized/:key',
        loadComponent: () =>
          import('./vocabulary/memorized/category/category').then((m) => m.MemorizedCategory),
      },
      {
        path: 'category/:key',
        loadComponent: () => import('./vocabulary/category/category').then((m) => m.Category),
      },
      {
        path: 'category/:key/memorize',
        loadComponent: () =>
          import('./shared/memorize-route/memorize-route').then((m) => m.MemorizeRoute),
        providers: [provideVocabularyDeckSurface()],
      },
      {
        path: 'category/:key/repeat',
        loadComponent: () =>
          import('./shared/repeat-route/repeat-route').then((m) => m.RepeatRoute),
        providers: [provideVocabularyDeckSurface()],
      },
      {
        path: 'stories',
        loadComponent: () => import('./stories/summary/summary').then((m) => m.StoriesSummary),
      },
      {
        path: 'stories/:slug',
        loadComponent: () => import('./stories/detail/detail').then((m) => m.StoryDetail),
      },
      {
        path: 'stories/:slug/category/:key/memorize',
        loadComponent: () =>
          import('./shared/memorize-route/memorize-route').then((m) => m.MemorizeRoute),
        providers: [provideStoryDeckSurface()],
      },
      {
        path: 'stories/:slug/category/:key/repeat',
        loadComponent: () =>
          import('./shared/repeat-route/repeat-route').then((m) => m.RepeatRoute),
        providers: [provideStoryDeckSurface()],
      },
      {
        path: 'books',
        loadComponent: () => import('./books/list/list').then((m) => m.BooksList),
      },
      {
        path: 'books/:slug',
        loadComponent: () => import('./books/detail/detail').then((m) => m.BookDetail),
      },
      {
        path: 'books/:book/:slug',
        loadComponent: () => import('./books/chapter/chapter').then((m) => m.BookChapter),
      },
      {
        path: 'books/:book/:slug/category/:key/memorize',
        loadComponent: () =>
          import('./shared/memorize-route/memorize-route').then((m) => m.MemorizeRoute),
        providers: [provideBookDeckSurface()],
      },
      {
        path: 'books/:book/:slug/category/:key/repeat',
        loadComponent: () =>
          import('./shared/repeat-route/repeat-route').then((m) => m.RepeatRoute),
        providers: [provideBookDeckSurface()],
      },
      {
        path: 'drills',
        loadComponent: () => import('./drills/list/list').then((m) => m.DrillsList),
      },
      {
        path: 'drills/:slug',
        loadComponent: () => import('./drills/detail/detail').then((m) => m.DrillDetail),
      },
      {
        path: 'drills/:slug/memorize',
        loadComponent: () =>
          import('./shared/memorize-route/memorize-route').then((m) => m.MemorizeRoute),
        providers: [provideDrillDeckSurface()],
      },
      {
        path: 'drills/:slug/repeat',
        loadComponent: () =>
          import('./shared/repeat-route/repeat-route').then((m) => m.RepeatRoute),
        providers: [provideDrillDeckSurface()],
      },
      {
        path: 'drills/:slug/patterns/repeat',
        loadComponent: () =>
          import('./shared/patterns-repeat-route/patterns-repeat-route').then(
            (m) => m.PatternsRepeatRoute,
          ),
        providers: [provideDrillDeckSurface()],
      },
      {
        path: 'lessons',
        loadComponent: () => import('./lessons/list/list').then((m) => m.LessonsList),
      },
      {
        path: 'lessons/:slug',
        loadComponent: () => import('./lessons/detail/detail').then((m) => m.LessonDetail),
      },
      {
        path: 'lessons/:slug/memorize',
        loadComponent: () =>
          import('./shared/memorize-route/memorize-route').then((m) => m.MemorizeRoute),
        providers: [provideLessonDeckSurface()],
      },
      {
        path: 'lessons/:slug/repeat',
        loadComponent: () =>
          import('./shared/repeat-route/repeat-route').then((m) => m.RepeatRoute),
        providers: [provideLessonDeckSurface()],
      },
      {
        path: 'lessons/:slug/patterns/repeat',
        loadComponent: () =>
          import('./shared/patterns-repeat-route/patterns-repeat-route').then(
            (m) => m.PatternsRepeatRoute,
          ),
        providers: [provideLessonDeckSurface()],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
