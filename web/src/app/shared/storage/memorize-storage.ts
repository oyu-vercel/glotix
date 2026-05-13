import { Injectable } from '@angular/core';

const COMMENT_PREFIX = 'glotix:comment:';
const SKIP_PREFIX = 'glotix:skip:';
const MEMORIZED_KEY = 'glotix:memorized';
const LEGACY_WIPED_FLAG = 'glotix:legacy-comments-wiped-v1';

@Injectable({ providedIn: 'root' })
export class MemorizeStorage {
  constructor() {
    this.wipeLegacyCommentsOnce();
  }

  getSkips(scope: string): Set<string> {
    const raw = this.read(this.skipKey(scope));
    if (!raw) return new Set();
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? new Set(parsed) : new Set();
    } catch {
      return new Set();
    }
  }

  addSkip(scope: string, italian: string): void {
    const skips = this.getSkips(scope);
    if (skips.has(italian)) return;
    skips.add(italian);
    this.write(this.skipKey(scope), JSON.stringify([...skips]));
  }

  clearSkips(scope: string): void {
    this.remove(this.skipKey(scope));
  }

  getMemorized(): Set<string> {
    const raw = this.read(MEMORIZED_KEY);
    if (!raw) return new Set();
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? new Set(parsed) : new Set();
    } catch {
      return new Set();
    }
  }

  addMemorized(italian: string): void {
    const memorized = this.getMemorized();
    if (memorized.has(italian)) return;
    memorized.add(italian);
    this.write(MEMORIZED_KEY, JSON.stringify([...memorized]));
  }

  removeMemorized(italian: string): void {
    const memorized = this.getMemorized();
    if (!memorized.has(italian)) return;
    memorized.delete(italian);
    if (memorized.size === 0) {
      this.remove(MEMORIZED_KEY);
    } else {
      this.write(MEMORIZED_KEY, JSON.stringify([...memorized]));
    }
  }

  getComment(italian: string): string {
    return this.read(this.commentKey(italian)) ?? '';
  }

  setComment(italian: string, value: string): void {
    const key = this.commentKey(italian);
    if (value.length === 0) {
      this.remove(key);
    } else {
      this.write(key, value);
    }
  }

  private skipKey(scope: string): string {
    return `${SKIP_PREFIX}${scope}`;
  }

  private commentKey(italian: string): string {
    return `${COMMENT_PREFIX}${italian}`;
  }

  private wipeLegacyCommentsOnce(): void {
    try {
      if (localStorage.getItem(LEGACY_WIPED_FLAG)) return;
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(COMMENT_PREFIX)) toRemove.push(k);
      }
      toRemove.forEach((k) => localStorage.removeItem(k));
      localStorage.setItem(LEGACY_WIPED_FLAG, '1');
    } catch {
      /* localStorage unavailable or quota — ignore */
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
