import { EnvironmentProviders, Provider, WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Routes, provideRouter, withComponentInputBinding } from '@angular/router';
import { BehaviorSubject, Observable, distinctUntilChanged, filter, shareReplay } from 'rxjs';

import { LanguageIndex } from '../app/shared/language/language.types';
import { LanguageService } from '../app/shared/language/language.service';

/**
 * Two pairs, so specs can prove that per-pair caching and URL building actually vary by pair.
 * Deliberately not the shipping list — a spec must never depend on which courses we ship.
 */
export const TEST_LANGUAGES: LanguageIndex = {
  languages: [
    {
      pair: 'xx-yy',
      target: 'xx',
      native: 'yy',
      targetLabel: 'Target',
      nativeLabel: 'Native',
      level: 'a2',
    },
    {
      pair: 'zz-yy',
      target: 'zz',
      native: 'yy',
      targetLabel: 'Other',
      nativeLabel: 'Native',
      level: 'b1',
    },
  ],
};

/**
 * The provider set every spec needs. `LanguageService` is `providedIn: 'root'` and fetches
 * `/assets/languages.json` from its constructor, so without the testing backend that request
 * escapes as an unhandled rejection and fails the whole run.
 */
export function testProviders(routes: Routes = []): (Provider | EnvironmentProviders)[] {
  return [
    provideHttpClient(),
    provideHttpClientTesting(),
    provideRouter(routes, withComponentInputBinding()),
  ];
}

/** Answers the `languages.json` request that `LanguageService`'s constructor fires. */
export function flushLanguages(index: LanguageIndex = TEST_LANGUAGES): void {
  TestBed.inject(HttpTestingController).expectOne('/assets/languages.json').flush(index);
}

/** Fails the spec if any request went unanswered. Call from `afterEach`. */
export function verifyNoOutstandingRequests(): void {
  TestBed.inject(HttpTestingController).verify();
}

/**
 * Stands in for `LanguageService` so a spec can drive the active pair directly instead of
 * navigating the router. `pair$` mirrors the real filtering and de-duplication, because the data
 * services' caching behaviour depends on both.
 */
export class StubLanguageService {
  readonly pair: WritableSignal<string>;

  private readonly subject: BehaviorSubject<string>;
  readonly pair$: Observable<string>;

  constructor(initial: string) {
    this.pair = signal(initial);
    this.subject = new BehaviorSubject(initial);
    this.pair$ = this.subject.pipe(
      filter((p) => p.length > 0),
      distinctUntilChanged(),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
  }

  /** Switches the active pair, as a navigation to another course would. */
  setPair(pair: string): void {
    this.pair.set(pair);
    this.subject.next(pair);
  }
}

export const TEST_PAIR = 'xx-yy';
export const OTHER_PAIR = 'zz-yy';

/**
 * Replaces the real `LanguageService`. Also removes the `languages.json` request from every spec
 * that does not care about it — inject `StubLanguageService` to drive the pair.
 */
export function provideStubLanguage(initial: string = TEST_PAIR): Provider[] {
  const stub = new StubLanguageService(initial);
  return [
    { provide: StubLanguageService, useValue: stub },
    { provide: LanguageService, useValue: stub as unknown as LanguageService },
  ];
}
