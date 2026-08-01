import { CanMatchFn } from '@angular/router';

const PAIR_PATTERN = /^[a-z]{2}-[a-z]{2}$/;

/**
 * Every feature route hangs off a `:pair` segment, so without this an unknown first segment
 * (`/foo`) would match and leave the app fetching `/assets/foo/…`. Rejecting it here lets the
 * `**` route send the visitor back to the picker instead.
 */
export const pairMatch: CanMatchFn = (_route, segments) =>
  segments.length > 0 && PAIR_PATTERN.test(segments[0].path);
