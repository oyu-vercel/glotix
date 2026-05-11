import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { switchMap } from 'rxjs';

import { Word } from '../vocabulary.types';
import { VocabularyService } from '../vocabulary.service';
import { MemorizeStorage } from './memorize-storage';

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isFormField(event: Event): boolean {
  const target = event.target as HTMLElement | null;
  return !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
}

@Component({
  selector: 'app-memorize',
  imports: [MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './memorize.html',
  styleUrl: './memorize.scss',
  host: {
    '(document:keydown.space)': 'onSpace($event)',
    '(document:keydown.enter)': 'onEnter($event)',
    '(document:keydown.escape)': 'onEscape($event)',
  },
})
export class Memorize {
  readonly key = input.required<string>();
  readonly direction = input<string>('italian');
  readonly isReverse = computed(() => this.direction() === 'russian');

  private readonly service = inject(VocabularyService);
  private readonly router = inject(Router);
  private readonly storage = inject(MemorizeStorage);

  readonly category = toSignal(
    toObservable(this.key).pipe(switchMap((k) => this.service.getCategory(k))),
  );

  private readonly fullShuffled = signal<Word[]>([]);
  readonly skips = signal<Set<string>>(new Set());
  readonly cards = computed(() =>
    this.fullShuffled().filter((w) => !this.skips().has(w.italian)),
  );
  readonly index = signal(0);
  readonly stage = signal<'front' | 'back'>('front');

  readonly current = computed(() => this.cards()[this.index()]);
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
        this.skips.set(this.storage.getSkips(cat.key));
        this.index.set(0);
        this.stage.set('front');
      }
    });

    effect(() => {
      const card = this.current();
      const cat = this.category();
      if (card && cat) {
        const saved = this.storage.getComment(cat.key, card.italian);
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
    const cat = this.category();
    const card = this.current();
    if (!cat || !card) return;
    this.storage.addSkip(cat.key, card.italian);
    this.skips.update((s) => new Set([...s, card.italian]));
    if (this.index() >= this.cards().length) {
      this.index.set(0);
    }
    this.stage.set('front');
  }

  resetSkips(): void {
    const cat = this.category();
    if (!cat) return;
    this.storage.clearSkips(cat.key);
    this.skips.set(new Set());
    this.index.set(0);
    this.stage.set('front');
  }

  saveComment(): void {
    const cat = this.category();
    const card = this.current();
    if (!cat || !card) return;
    this.storage.setComment(cat.key, card.italian, this.commentDraft());
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

  onEscape(event: Event): void {
    if (isFormField(event)) return;
    event.preventDefault();
    this.skip();
  }

  exit(): void {
    this.router.navigate(['/category', this.key()]);
  }

  splitExamples(s: string): string[] {
    return s
      .split(/(?<=[.!?])\s+/)
      .map((x) => x.trim())
      .filter((x) => x.length > 0);
  }
}
