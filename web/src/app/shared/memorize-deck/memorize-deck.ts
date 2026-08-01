import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import { Category, Word } from '../../vocabulary/vocabulary.types';
import { MemorizeStorage } from '../storage/memorize-storage';
import { shuffle } from '../utils/shuffle';
import { isFormField } from '../utils/is-form-field';
import { splitExamples } from '../utils/split-examples';
import { Direction } from '../utils/direction';

@Component({
  selector: 'app-memorize-deck',
  imports: [MatButtonModule],
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
  readonly memorized = signal<Set<string>>(new Set());
  readonly cards = computed(() =>
    this.fullShuffled().filter(
      (w) => !this.skips().has(w.target) && !this.memorized().has(w.target),
    ),
  );
  readonly index = signal(0);
  readonly stage = signal<'front' | 'back'>('front');

  readonly current = computed(() => this.cards()[this.index()]);
  readonly currentExamples = computed(() => {
    const card = this.current();
    return card ? splitExamples(card.examples) : [];
  });
  readonly progress = computed(() => `${this.index() + 1} / ${this.cards().length}`);
  readonly skipCount = computed(() => this.skips().size);
  readonly hasCards = computed(() => this.cards().length > 0);

  readonly savedComment = signal('');
  readonly commentDraft = signal('');
  readonly commentDirty = computed(() => this.savedComment() !== this.commentDraft());

  constructor() {
    effect(() => {
      const cat = this.category();
      if (cat) {
        this.fullShuffled.set(shuffle(cat.words));
        this.skips.set(this.storage.getSkips(this.scope()));
        this.memorized.set(this.storage.getMemorized());
        this.index.set(0);
        this.stage.set('front');
      }
    });

    effect(() => {
      const card = this.current();
      if (card) {
        const saved = this.storage.getComment(card.target);
        this.savedComment.set(saved);
        this.commentDraft.set(saved);
      } else {
        this.savedComment.set('');
        this.commentDraft.set('');
      }
    });
  }

  advance(): void {
    if (!this.hasCards()) return;
    if (this.stage() === 'front') {
      this.stage.set('back');
    } else {
      this.stage.set('front');
      this.index.update((i) => (i + 1) % this.cards().length);
    }
  }

  skip(): void {
    if (!this.hasCards()) return;
    const card = this.current();
    if (!card) return;
    this.storage.addSkip(this.scope(), card.target);
    this.skips.update((s) => new Set([...s, card.target]));
    if (this.index() >= this.cards().length) {
      this.index.set(0);
    }
    this.stage.set('front');
  }

  markMemorized(): void {
    if (!this.hasCards()) return;
    const card = this.current();
    if (!card) return;
    this.storage.addMemorized(card.target);
    this.memorized.update((s) => new Set([...s, card.target]));
    if (this.index() >= this.cards().length) {
      this.index.set(0);
    }
    this.stage.set('front');
  }

  resetSkips(): void {
    this.storage.clearSkips(this.scope());
    this.skips.set(new Set());
    this.index.set(0);
    this.stage.set('front');
  }

  saveComment(): void {
    const card = this.current();
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
