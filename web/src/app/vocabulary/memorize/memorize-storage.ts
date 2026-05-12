import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MemorizeStorage {
  private skipKey(scope: string): string {
    return `glotix:skip:${scope}`;
  }

  private commentKey(scope: string, italian: string): string {
    return `glotix:comment:${scope}:${italian}`;
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

  getComment(scope: string, italian: string): string {
    return this.read(this.commentKey(scope, italian)) ?? '';
  }

  setComment(scope: string, italian: string, value: string): void {
    const key = this.commentKey(scope, italian);
    if (value.length === 0) {
      this.remove(key);
    } else {
      this.write(key, value);
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
