import { EnvironmentProviders, Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Routes, provideRouter, withComponentInputBinding } from '@angular/router';

import { LanguageIndex } from '../app/shared/language/language.types';

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
