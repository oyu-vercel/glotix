import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import { Category, Word } from '../../vocabulary/vocabulary.types';
import { MemorizeStorage } from '../storage/memorize-storage';
import { DeckShell } from '../deck/deck-shell';
import { deckCursor } from '../deck/deck-cursor';
import { shuffle } from '../utils/shuffle';
import { isFormField } from '../utils/is-form-field';
import { splitExamples } from '../utils/split-examples';
import { Direction } from '../utils/direction';

/** Distinguishes the comment field's `id` per instance, so two decks never collide. */
let deckInstance = 0;

@Component({
  selector: 'app-memorize-deck',
  imports: [MatButtonModule, DeckShell],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './memorize-deck.html',
  styleUrl: './memorize-deck.scss',
  host: {
    '(document:keydown.space)': 'onSpace($event)',
    '(document:keydown.enter)': 'onEnter($event)',
    '(document:keydown.s)': 'onS($event)',
  },
})
export class MemorizeDeck {
  readonly category = input<Category | undefined>(undefined);
  readonly scope = input.required<string>();
  readonly direction = input<Direction>('target');
  readonly isReverse = computed(() => this.direction() === 'native');

  readonly exit = output<void>();

  private readonly storage = inject(MemorizeStorage);

  private readonly fullShuffled = signal<Word[]>([]);
  readonly skips = signal<Set<string>>(new Set());
  private readonly cards = computed(() =>
    this.fullShuffled().filter(
      (w) => !this.skips().has(w.target) && !this.storage.memorized().has(w.target),
    ),
  );
  protected readonly cursor = deckCursor(this.cards);
  readonly stage = signal<'front' | 'back'>('front');

  readonly currentExamples = computed(() => {
    const card = this.cursor.current();
    return card ? splitExamples(card.examples) : [];
  });
  readonly skipCount = computed(() => this.skips().size);

  /** Every card skipped is a distinct state from "not loaded yet". */
  protected readonly shellEmptyMessage = computed(() => (this.category() ? '' : null));

  readonly savedComment = signal('');
  readonly commentDraft = signal('');
  readonly commentDirty = computed(() => this.savedComment() !== this.commentDraft());

  readonly commentId = `memorize-comment-${++deckInstance}`;

  constructor() {
    // Only a new category or scope may reset the deck. The body is `untracked` so the skip read
    // inside it cannot make a later write re-run this effect and throw away the reader's place.
    effect(() => {
      const cat = this.category();
      const scope = this.scope();
      if (!cat) return;
      untracked(() => {
        this.fullShuffled.set(shuffle(cat.words));
        this.skips.set(this.storage.getSkips(scope));
        this.cursor.reset();
        this.stage.set('front');
      });
    });

    effect(() => {
      const card = this.cursor.current();
      const saved = card ? this.storage.getComment(card.target) : '';
      this.savedComment.set(saved);
      this.commentDraft.set(saved);
    });
  }

  advance(): void {
    if (!this.cursor.hasCards()) return;
    if (this.stage() === 'front') {
      this.stage.set('back');
    } else {
      this.stage.set('front');
      this.cursor.advance();
    }
  }

  skip(): void {
    const card = this.cursor.current();
    if (!card) return;
    this.storage.addSkip(this.scope(), card.target);
    this.skips.update((s) => new Set([...s, card.target]));
    this.cursor.clamp();
    this.stage.set('front');
  }

  markMemorized(): void {
    const card = this.cursor.current();
    if (!card) return;
    this.storage.addMemorized(card.target);
    this.cursor.clamp();
    this.stage.set('front');
  }

  resetSkips(): void {
    this.storage.clearSkips(this.scope());
    this.skips.set(new Set());
    this.cursor.reset();
    this.stage.set('front');
  }

  saveComment(): void {
    const card = this.cursor.current();
    if (!card) return;
    this.storage.setComment(card.target, this.commentDraft());
    this.savedComment.set(this.commentDraft());
  }

  cancelComment(): void {
    this.commentDraft.set(this.savedComment());
  }

  onCommentInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.commentDraft.set(target.value);
  }

  onContextMenu(event: MouseEvent): void {
    event.preventDefault();
    this.skip();
  }

  onSpace(event: Event): void {
    if (isFormField(event)) return;
    event.preventDefault();
    this.advance();
  }

  onEnter(event: Event): void {
    if (isFormField(event)) return;
    this.advance();
  }

  onS(event: Event): void {
    if (isFormField(event)) return;
    event.preventDefault();
    this.skip();
  }
}
