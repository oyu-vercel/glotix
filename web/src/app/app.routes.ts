import { Routes } from '@angular/router';

import { provideStoryDeckSurface } from './stories/story-deck-surface';
import { provideVocabularyDeckSurface } from './vocabulary/vocabulary-deck-surface';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'vocabulary' },
  {
    path: 'vocabulary',
    loadComponent: () => import('./vocabulary/list/list').then((m) => m.List),
  },
  {
    path: 'vocabulary/a2',
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
    loadComponent: () => import('./shared/repeat-route/repeat-route').then((m) => m.RepeatRoute),
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
    loadComponent: () => import('./shared/repeat-route/repeat-route').then((m) => m.RepeatRoute),
    providers: [provideStoryDeckSurface()],
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
    loadComponent: () => import('./drills/memorize/memorize').then((m) => m.DrillMemorize),
  },
  {
    path: 'drills/:slug/repeat',
    loadComponent: () => import('./drills/repeat/repeat').then((m) => m.DrillRepeat),
  },
  {
    path: 'drills/:slug/patterns/repeat',
    loadComponent: () =>
      import('./drills/patterns-repeat/patterns-repeat').then((m) => m.DrillPatternsRepeat),
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
    loadComponent: () => import('./lessons/memorize/memorize').then((m) => m.LessonMemorize),
  },
  {
    path: 'lessons/:slug/repeat',
    loadComponent: () => import('./lessons/repeat/repeat').then((m) => m.LessonRepeat),
  },
  {
    path: 'lessons/:slug/patterns/repeat',
    loadComponent: () =>
      import('./lessons/patterns-repeat/patterns-repeat').then((m) => m.LessonPatternsRepeat),
  },
  { path: '**', redirectTo: 'vocabulary' },
];
