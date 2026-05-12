import { Routes } from '@angular/router';

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
    path: 'category/:key',
    loadComponent: () => import('./vocabulary/category/category').then((m) => m.Category),
  },
  {
    path: 'category/:key/memorize',
    loadComponent: () => import('./vocabulary/memorize/memorize').then((m) => m.Memorize),
  },
  {
    path: 'category/:key/repeat',
    loadComponent: () => import('./vocabulary/repeat/repeat').then((m) => m.Repeat),
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
      import('./stories/memorize/memorize').then((m) => m.StoryMemorize),
  },
  {
    path: 'stories/:slug/category/:key/repeat',
    loadComponent: () => import('./stories/repeat/repeat').then((m) => m.StoryRepeat),
  },
  { path: '**', redirectTo: 'vocabulary' },
];
