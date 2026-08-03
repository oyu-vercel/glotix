import { Signal, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';

import { DeckParams } from './deck-surface';

/**
 * The activated route's path params as a signal.
 *
 * A surface provided through a route's `providers` cannot read the activated route, so the routed
 * shell reads them here and hands the bag to the surface instead.
 */
export function routeParams(): Signal<DeckParams> {
  const route = inject(ActivatedRoute);
  return toSignal(route.params.pipe(map((p) => ({ ...p }) as DeckParams)), {
    initialValue: {} as DeckParams,
  });
}
