import { Injectable, computed, inject, signal } from '@angular/core';

import { LanguageService } from '../language/language.service';

const MIGRATION_KEY = 'glotix:migrated:pairs';
/** Everything stored before the multi-language split was Italian for Russian speakers. */
const LEGACY_PAIR = 'it-ru';

/**
 * Progress is per language pair — the same headword can mean different things in two courses,
 * so every key is namespaced `glotix:<pair>:…`.
 */
@Injectable({ providedIn: 'root' })
export class MemorizeStorage {
  private readonly language = inject(LanguageService);

  /** Bumped on every write so the `memorized` computed re-reads storage. */
  private readonly revision = signal(0);

  readonly memorized = computed<Set<string>>(() => {
    this.revision();
    return this.readSet(this.key('memorized'));
  });

  constructor() {
    this.migrateLegacyKeys();
  }

  getSkips(scope: string): Set<string> {
    return this.readSet(this.key(`skip:${scope}`));
  }

  addSkip(scope: string, word: string): void {
    const skips = this.getSkips(scope);
    if (skips.has(word)) return;
    skips.add(word);
    this.write(this.key(`skip:${scope}`), JSON.stringify([...skips]));
  }

  clearSkips(scope: string): void {
    this.remove(this.key(`skip:${scope}`));
  }

  getMemorized(): Set<string> {
    return this.memorized();
  }

  addMemorized(word: string): void {
    const current = this.memorized();
    if (current.has(word)) return;
    const next = new Set(current);
    next.add(word);
    this.write(this.key('memorized'), JSON.stringify([...next]));
    this.revision.update((r) => r + 1);
  }

  removeMemorized(word: string): void {
    const current = this.memorized();
    if (!current.has(word)) return;
    const next = new Set(current);
    next.delete(word);
    if (next.size === 0) {
      this.remove(this.key('memorized'));
    } else {
      this.write(this.key('memorized'), JSON.stringify([...next]));
    }
    this.revision.update((r) => r + 1);
  }

  getComment(word: string): string {
    return this.read(this.key(`comment:${word}`)) ?? '';
  }

  setComment(word: string, value: string): void {
    const key = this.key(`comment:${word}`);
    if (value.length === 0) {
      this.remove(key);
    } else {
      this.write(key, value);
    }
  }

  private key(suffix: string): string {
    return `glotix:${this.language.pair()}:${suffix}`;
  }

  private readSet(key: string): Set<string> {
    const raw = this.read(key);
    if (!raw) return new Set();
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? new Set<string>(parsed) : new Set<string>();
    } catch {
      return new Set();
    }
  }

  /** One-time move of the pre-multi-language keys into the `it-ru` namespace. */
  private migrateLegacyKeys(): void {
    try {
      if (localStorage.getItem(MIGRATION_KEY)) return;
      const moves: [string, string][] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (key === 'glotix:memorized') {
          moves.push([key, `glotix:${LEGACY_PAIR}:memorized`]);
        } else if (key.startsWith('glotix:skip:')) {
          moves.push([key, `glotix:${LEGACY_PAIR}:skip:${key.slice('glotix:skip:'.length)}`]);
        } else if (key.startsWith('glotix:comment:')) {
          moves.push([key, `glotix:${LEGACY_PAIR}:comment:${key.slice('glotix:comment:'.length)}`]);
        }
      }
      for (const [from, to] of moves) {
        const value = localStorage.getItem(from);
        if (value !== null) localStorage.setItem(to, value);
        localStorage.removeItem(from);
      }
      localStorage.setItem(MIGRATION_KEY, '1');
    } catch {
      /* unavailable — nothing to migrate */
    }
  }

  private read(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private write(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* quota or unavailable — silently ignore */
    }
  }

  private remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}
