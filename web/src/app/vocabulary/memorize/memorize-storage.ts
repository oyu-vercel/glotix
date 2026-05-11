import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MemorizeStorage {
  private skipKey(categoryKey: string): string {
    return `glotix:skip:${categoryKey}`;
  }

  private commentKey(categoryKey: string, italian: string): string {
    return `glotix:comment:${categoryKey}:${italian}`;
  }

  getSkips(categoryKey: string): Set<string> {
    const raw = this.read(this.skipKey(categoryKey));
    if (!raw) return new Set();
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? new Set(parsed) : new Set();
    } catch {
      return new Set();
    }
  }

  addSkip(categoryKey: string, italian: string): void {
    const skips = this.getSkips(categoryKey);
    if (skips.has(italian)) return;
    skips.add(italian);
    this.write(this.skipKey(categoryKey), JSON.stringify([...skips]));
  }

  clearSkips(categoryKey: string): void {
    this.remove(this.skipKey(categoryKey));
  }

  getComment(categoryKey: string, italian: string): string {
    return this.read(this.commentKey(categoryKey, italian)) ?? '';
  }

  setComment(categoryKey: string, italian: string, value: string): void {
    const key = this.commentKey(categoryKey, italian);
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
