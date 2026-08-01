import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';

import { LanguageService } from '../language.service';
import { Language } from '../language.types';
import { PageHeader } from '../../page-header/page-header';

interface NativeOption {
  code: string;
  label: string;
}

@Component({
  selector: 'app-language-picker',
  imports: [MatButtonModule, PageHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './picker.html',
  styleUrl: './picker.scss',
})
export class LanguagePicker {
  private readonly language = inject(LanguageService);
  private readonly router = inject(Router);

  readonly languages = this.language.languages;
  readonly native = signal<string | null>(null);

  readonly natives = computed<NativeOption[]>(() => {
    const seen = new Map<string, string>();
    for (const l of this.languages()) {
      if (!seen.has(l.native)) seen.set(l.native, l.nativeLabel);
    }
    return [...seen].map(([code, label]) => ({ code, label }));
  });

  readonly targets = computed<Language[]>(() =>
    this.languages().filter((l) => l.native === this.native()),
  );

  constructor() {
    // Once the index is in, a returning learner goes straight back to their course.
    effect(() => {
      if (this.languages().length === 0) return;
      const remembered = this.language.remembered();
      if (remembered) this.router.navigate(['/', remembered], { replaceUrl: true });
    });
  }

  chooseNative(code: string): void {
    this.native.set(code);
  }

  back(): void {
    this.native.set(null);
  }

  chooseTarget(pair: string): void {
    this.language.select(pair);
  }
}
