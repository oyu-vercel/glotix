import { Signal, computed, signal } from '@angular/core';

/**
 * The position state every deck needs: which card is showing, how far through we are, and how to
 * step forward. Wrapping instead of round-tripping means the last card leads back to the first, so
 * a deck can be cycled indefinitely.
 *
 * `items` is a signal, so a card leaving the deck (memorized, skipped) shrinks it underneath the
 * cursor — call `clamp()` after such a removal to pull the index back in range.
 */
export function deckCursor<T>(items: Signal<readonly T[]>) {
  const index = signal(0);

  return {
    index,
    current: computed(() => items()[index()]),
    progress: computed(() => `${index() + 1} / ${items().length}`),
    hasCards: computed(() => items().length > 0),

    advance(): void {
      const length = items().length;
      if (length === 0) return;
      index.update((i) => (i + 1) % length);
    },

    reset(): void {
      index.set(0);
    },

    /** Call after removing the current card, so the index never points past the end. */
    clamp(): void {
      if (index() >= items().length) index.set(0);
    },
  };
}
