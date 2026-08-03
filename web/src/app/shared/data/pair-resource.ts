import { Signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Observable, combineLatest, of, shareReplay, switchMap } from 'rxjs';

/**
 * Every asset the app fetches is immutable for the life of the session and is shared by several
 * screens, so each one is fetched once and replayed. `refCount: false` keeps the value after the
 * last subscriber leaves — navigating away from a story and back must not refetch it.
 */
export const REPLAY_LAST = { bufferSize: 1, refCount: false } as const;

/**
 * Memoizes one observable per key. Assets are per language pair, so every key starts with the
 * pair — see `pairKey`. Nothing is ever evicted: the whole point is that a course's data stays
 * warm for the session.
 */
export class KeyedCache<T> {
  private readonly entries = new Map<string, Observable<T>>();

  get(key: string, create: () => Observable<T>): Observable<T> {
    let cached = this.entries.get(key);
    if (!cached) {
      cached = create().pipe(shareReplay(REPLAY_LAST));
      this.entries.set(key, cached);
    }
    return cached;
  }
}

/** Cache key for a pair-scoped asset. Keeping the pair first makes keys readable when debugging. */
export function pairKey(pair: string, ...parts: string[]): string {
  return [pair, ...parts].join(':');
}

/**
 * Follows the active pair: re-runs `forPair` whenever the course changes, and replays the current
 * value to late subscribers. Use for the `index$`-style members a service exposes directly.
 */
export function forActivePair<T>(
  pair$: Observable<string>,
  forPair: (pair: string) => Observable<T>,
): Observable<T> {
  return pair$.pipe(switchMap(forPair), shareReplay(REPLAY_LAST));
}

/**
 * The per-item accessors are already memoized by `KeyedCache`, so this deliberately does not add
 * another `shareReplay` on top — it only re-resolves when the pair changes.
 */
export function forActivePairItem<T>(
  pair$: Observable<string>,
  forPair: (pair: string) => Observable<T>,
): Observable<T> {
  return pair$.pipe(switchMap(forPair));
}

/** Bridges a slug held in a component `input()` to the observable accessors above. */
export function slugSignal<T>(
  slug: Signal<string>,
  get: (slug: string) => Observable<T>,
): Signal<T | undefined> {
  return toSignal(toObservable(slug).pipe(switchMap(get)));
}

/**
 * The same bridge for a screen identified by more than one route param — a story category needs
 * `(slug, key)`, a book chapter category needs `(book, chapter, key)`. Re-resolves when any of
 * them changes.
 */
export function paramsSignal<T>(
  params: readonly Signal<string>[],
  get: (values: string[]) => Observable<T>,
): Signal<T | undefined> {
  return toSignal(combineLatest(params.map((p) => toObservable(p))).pipe(switchMap(get)));
}

/**
 * Guards a per-item fetch on the item existing in the index, so a bad slug in the URL emits
 * `undefined` instead of firing a request that 404s and then caches the failure forever.
 */
export function ifListed<T>(
  listed: boolean,
  fetch: () => Observable<T>,
): Observable<T | undefined> {
  return listed ? fetch() : of(undefined);
}
