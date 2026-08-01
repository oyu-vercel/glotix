import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';

import { LanguageService } from '../language.service';

@Component({
  selector: 'app-language-switcher',
  imports: [MatButtonModule, MatMenuModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './switcher.html',
  styleUrl: './switcher.scss',
})
export class LanguageSwitcher {
  private readonly language = inject(LanguageService);

  readonly languages = this.language.languages;
  readonly current = this.language.current;

  select(pair: string): void {
    if (pair === this.language.pair()) return;
    this.language.select(pair);
  }
}
