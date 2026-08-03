import { TestBed } from '@angular/core/testing';

import { MemorizeStorage } from './memorize-storage';
import {
  OTHER_PAIR,
  StubLanguageService,
  TEST_PAIR,
  provideStubLanguage,
} from '../../../testing/setup';

/**
 * Characterization spec: locks in the storage contract before the refactoring plan rewires how
 * the memorized set is read. See docs/refactoring-plan.md, Steps 2 and 7.
 */
describe('MemorizeStorage', () => {
  function setup(initialPair = TEST_PAIR) {
    TestBed.configureTestingModule({ providers: provideStubLanguage(initialPair) });
    return {
      storage: TestBed.inject(MemorizeStorage),
      language: TestBed.inject(StubLanguageService),
    };
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('memorized set', () => {
    it('starts empty', () => {
      const { storage } = setup();
      expect(storage.memorized().size).toBe(0);
    });

    it('adds a word and exposes it through the signal', () => {
      const { storage } = setup();
      storage.addMemorized('w1');
      expect(storage.memorized().has('w1')).toBe(true);
      expect(storage.memorized().size).toBe(1);
    });

    it('ignores a duplicate add', () => {
      const { storage } = setup();
      storage.addMemorized('w1');
      storage.addMemorized('w1');
      expect(storage.memorized().size).toBe(1);
    });

    it('removes a word', () => {
      const { storage } = setup();
      storage.addMemorized('w1');
      storage.addMemorized('w2');
      storage.removeMemorized('w1');
      expect(storage.memorized().has('w1')).toBe(false);
      expect(storage.memorized().has('w2')).toBe(true);
    });

    it('drops the storage key entirely once the last word is removed', () => {
      const { storage } = setup();
      storage.addMemorized('w1');
      storage.removeMemorized('w1');
      expect(localStorage.getItem(`glotix:${TEST_PAIR}:memorized`)).toBeNull();
    });

    it('ignores removing a word that was never added', () => {
      const { storage } = setup();
      storage.addMemorized('w1');
      storage.removeMemorized('w2');
      expect(storage.memorized().size).toBe(1);
    });

    it('survives a rebuild of the service from the same storage', () => {
      const { storage } = setup();
      storage.addMemorized('w1');

      TestBed.resetTestingModule();
      const { storage: rebuilt } = setup();
      expect(rebuilt.memorized().has('w1')).toBe(true);
    });

    it('recovers from a corrupt payload instead of throwing', () => {
      localStorage.setItem(`glotix:${TEST_PAIR}:memorized`, '{not json');
      const { storage } = setup();
      expect(storage.memorized().size).toBe(0);
    });

    it('recovers from a payload that is valid JSON but not an array', () => {
      localStorage.setItem(`glotix:${TEST_PAIR}:memorized`, '{"a":1}');
      const { storage } = setup();
      expect(storage.memorized().size).toBe(0);
    });

    it('exposes a new Set instance on each change, so signal consumers re-run', () => {
      const { storage } = setup();
      const before = storage.memorized();
      storage.addMemorized('w1');
      expect(storage.memorized()).not.toBe(before);
    });
  });

  describe('pair namespacing', () => {
    it('writes under the active pair', () => {
      const { storage } = setup();
      storage.addMemorized('w1');
      expect(localStorage.getItem(`glotix:${TEST_PAIR}:memorized`)).toBe('["w1"]');
    });

    it('keeps two pairs independent', () => {
      const { storage, language } = setup();
      storage.addMemorized('w1');

      language.setPair(OTHER_PAIR);
      expect(storage.memorized().size).toBe(0);

      storage.addMemorized('w9');
      expect(storage.memorized().has('w9')).toBe(true);

      language.setPair(TEST_PAIR);
      expect(storage.memorized().has('w1')).toBe(true);
      expect(storage.memorized().has('w9')).toBe(false);
    });

    it('namespaces skips and comments by pair too', () => {
      const { storage, language } = setup();
      storage.addSkip('drill:d1', 'w1');
      storage.setComment('w1', 'a note');

      language.setPair(OTHER_PAIR);
      expect(storage.getSkips('drill:d1').size).toBe(0);
      expect(storage.getComment('w1')).toBe('');
    });
  });

  describe('skips', () => {
    it('starts empty for an unknown scope', () => {
      const { storage } = setup();
      expect(storage.getSkips('drill:d1').size).toBe(0);
    });

    it('adds a skip within a scope', () => {
      const { storage } = setup();
      storage.addSkip('drill:d1', 'w1');
      expect(storage.getSkips('drill:d1').has('w1')).toBe(true);
    });

    it('ignores a duplicate skip', () => {
      const { storage } = setup();
      storage.addSkip('drill:d1', 'w1');
      storage.addSkip('drill:d1', 'w1');
      expect(storage.getSkips('drill:d1').size).toBe(1);
    });

    it('keeps scopes independent', () => {
      const { storage } = setup();
      storage.addSkip('drill:d1', 'w1');
      expect(storage.getSkips('drill:d2').size).toBe(0);
    });

    it('clears one scope without touching another', () => {
      const { storage } = setup();
      storage.addSkip('drill:d1', 'w1');
      storage.addSkip('drill:d2', 'w2');
      storage.clearSkips('drill:d1');
      expect(storage.getSkips('drill:d1').size).toBe(0);
      expect(storage.getSkips('drill:d2').has('w2')).toBe(true);
    });

    it('does not mix skips into the memorized set', () => {
      const { storage } = setup();
      storage.addSkip('drill:d1', 'w1');
      expect(storage.memorized().size).toBe(0);
    });
  });

  describe('comments', () => {
    it('returns an empty string for a word with no comment', () => {
      const { storage } = setup();
      expect(storage.getComment('w1')).toBe('');
    });

    it('stores and reads back a comment', () => {
      const { storage } = setup();
      storage.setComment('w1', 'a gloss');
      expect(storage.getComment('w1')).toBe('a gloss');
    });

    it('deletes the key when the comment is set to empty', () => {
      const { storage } = setup();
      storage.setComment('w1', 'a gloss');
      storage.setComment('w1', '');
      expect(storage.getComment('w1')).toBe('');
      expect(localStorage.getItem(`glotix:${TEST_PAIR}:comment:w1`)).toBeNull();
    });
  });

  describe('legacy key migration', () => {
    it('moves pre-multi-language keys into the it-ru namespace', () => {
      localStorage.setItem('glotix:memorized', '["w1"]');
      localStorage.setItem('glotix:skip:cat1', '["w2"]');
      localStorage.setItem('glotix:comment:w1', 'a note');

      setup('it-ru');

      expect(localStorage.getItem('glotix:it-ru:memorized')).toBe('["w1"]');
      expect(localStorage.getItem('glotix:it-ru:skip:cat1')).toBe('["w2"]');
      expect(localStorage.getItem('glotix:it-ru:comment:w1')).toBe('a note');
    });

    it('removes the old keys once moved', () => {
      localStorage.setItem('glotix:memorized', '["w1"]');
      setup('it-ru');
      expect(localStorage.getItem('glotix:memorized')).toBeNull();
    });

    it('runs only once, so a later write is not clobbered by a rebuild', () => {
      localStorage.setItem('glotix:memorized', '["w1"]');
      const { storage } = setup('it-ru');
      storage.removeMemorized('w1');

      TestBed.resetTestingModule();
      localStorage.setItem('glotix:memorized', '["stale"]');
      const { storage: rebuilt } = setup('it-ru');

      expect(rebuilt.memorized().has('stale')).toBe(false);
      expect(localStorage.getItem('glotix:memorized')).toBe('["stale"]');
    });

    it('leaves already-namespaced keys alone', () => {
      localStorage.setItem('glotix:it-ru:memorized', '["w1"]');
      const { storage } = setup('it-ru');
      expect(storage.memorized().has('w1')).toBe(true);
    });
  });
});
