import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';

import { LanguageService } from './shared/language/language.service';
import { LanguageSwitcher } from './shared/language/switcher/switcher';
import { FEATURES } from './shared/features/feature-registry';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    LanguageSwitcher,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  /** Empty while the picker is showing — the nav has nothing to point at yet. */
  readonly pair = inject(LanguageService).pair;

  readonly features = FEATURES;
}
