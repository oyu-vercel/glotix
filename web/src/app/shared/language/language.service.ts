import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { NavigationEnd, Router } from '@angular/router';
import { Observable, distinctUntilChanged, filter, map, shareReplay } from 'rxjs';

import { Language, LanguageIndex } from './language.types';

const PAIR_KEY = 'glotix:pair';
const PAIR_PATTERN = /^[a-z]{2}-[a-z]{2}$/;

/**
 * Holds the active language pair. The URL is the source of truth — the pair is the first path
 * segment — and every data service builds its asset URLs from it, so a course switch is just a
 * navigation. The last pair used is remembered so `/` can skip the picker on later visits.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly languages$: Observable<Language[]> = this.http
    .get<LanguageIndex>('/assets/languages.json')
    .pipe(
      map((index) => index.languages),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

  /** Empty string while the picker is showing — no pair is active yet. */
  readonly pair = signal(pairFromUrl(this.router.url));

  /** Emits only real pairs, so data services never fetch `/assets//…`. */
  readonly pair$: Observable<string> = toObservable(this.pair).pipe(
    filter((pair) => pair.length > 0),
    distinctUntilChanged(),
    shareReplay({ bufferSize: 1, refCount: false }),
  );

  private readonly all = signal<Language[]>([]);
  readonly languages = this.all.asReadonly();
  readonly current = computed(() => this.all().find((l) => l.pair === this.pair()));

  /** Deck and table headings read these instead of naming a language in the markup. */
  readonly targetLabel = computed(() => this.current()?.targetLabel ?? '');
  readonly nativeLabel = computed(() => this.current()?.nativeLabel ?? '');
  readonly level = computed(() => this.current()?.level.toUpperCase() ?? '');

  constructor() {
    this.languages$.pipe(takeUntilDestroyed()).subscribe((langs) => this.all.set(langs));

    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((e) => {
        const pair = pairFromUrl(e.urlAfterRedirects);
        this.pair.set(pair);
        if (pair) write(PAIR_KEY, pair);
      });
  }

  /** The pair remembered from a previous visit, if it is still one we ship. */
  remembered(): string | null {
    const saved = read(PAIR_KEY);
    if (!saved) return null;
    return this.all().some((l) => l.pair === saved) ? saved : null;
  }

  select(pair: string): void {
    write(PAIR_KEY, pair);
    this.router.navigate(['/', pair]);
  }

  /** Builds an absolute router link under the active pair. */
  link(...segments: (string | number)[]): (string | number)[] {
    return ['/', this.pair(), ...segments];
  }
}

function pairFromUrl(url: string): string {
  const first = url.split(/[?#]/)[0].split('/').filter(Boolean)[0] ?? '';
  return PAIR_PATTERN.test(first) ? first : '';
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* quota or unavailable — silently ignore */
  }
}
