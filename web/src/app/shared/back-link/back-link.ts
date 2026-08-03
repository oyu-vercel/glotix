import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

import { LanguageService } from '../language/language.service';
import { feature } from '../features/feature-registry';

/**
 * The "← Books" link at the top of every detail screen. The markup and its styling were verbatim
 * in seven templates; the label and target now come from the feature registry.
 */
@Component({
  selector: 'app-back-link',
  imports: [MatButtonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="back-row">
    <a mat-button [routerLink]="link()">← {{ label() }}</a>
  </div>`,
  styleUrl: './back-link.scss',
})
export class BackLink {
  /** A feature segment from the registry, e.g. `drills`. */
  readonly to = input.required<string>();
  /** Extra segments appended after the feature, for a nested screen such as a book chapter. */
  readonly extraSegments = input<readonly string[]>([]);
  /** Overrides the registry's plural label — used where the link points at a nested list. */
  readonly labelOverride = input<string>('');

  private readonly language = inject(LanguageService);

  readonly label = computed(() => this.labelOverride() || feature(this.to()).labelPlural);

  readonly link = computed(() => ['/', this.language.pair(), this.to(), ...this.extraSegments()]);
}
