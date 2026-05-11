import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'vocabulary' },
  {
    path: 'vocabulary',
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
  { path: '**', redirectTo: 'vocabulary' },
];
