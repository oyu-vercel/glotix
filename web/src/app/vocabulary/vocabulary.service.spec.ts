import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';

import { VocabularyService } from './vocabulary.service';
import { Category, Vocabulary, Word } from './vocabulary.types';
import {
  OTHER_PAIR,
  StubLanguageService,
  TEST_PAIR,
  provideStubLanguage,
  testProviders,
  verifyNoOutstandingRequests,
} from '../../testing/setup';

/**
 * Characterization spec: locks in the fetch/cache contract of `VocabularyService` before its
 * internals are refactored. Everything here describes what the code does today, not what it
 * arguably should do.
 */
describe('VocabularyService', () => {
  const vocabUrl = (pair: string) => `/assets/${pair}/vocabulary.json`;

  function word(n: number, target: string): Word {
    return { n, target, pronunciation: `p${n}`, translation: `t${n}`, examples: `e${n}` };
  }

  function category(key: string, words: Word[]): Category {
    return { key, label: `${key} label`, words };
  }

  function vocabulary(...categories: Category[]): Vocabulary {
    return { categories };
  }

  /** Two categories, four words — enough to prove filtering, dropping and field preservation. */
  function sampleVocabulary(): Vocabulary {
    return vocabulary(
      category('alpha', [word(1, 'w1'), word(2, 'w2')]),
      category('beta', [word(3, 'w3'), word(4, 'w4')]),
    );
  }

  function setup(initialPair = TEST_PAIR) {
    TestBed.configureTestingModule({
      providers: [...testProviders(), ...provideStubLanguage(initialPair)],
    });
    return {
      service: TestBed.inject(VocabularyService),
      http: TestBed.inject(HttpTestingController),
      language: TestBed.inject(StubLanguageService),
    };
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    verifyNoOutstandingRequests();
  });

  describe('vocabulary$', () => {
    it('fetches the active pair vocabulary and emits the parsed body', () => {
      const { service, http } = setup();
      const body = sampleVocabulary();

      let emitted: Vocabulary | undefined;
      service.vocabulary$.subscribe((v) => (emitted = v));
      http.expectOne(vocabUrl(TEST_PAIR)).flush(body);

      expect(emitted).toEqual(body);
    });

    it('emits nothing until the request is answered', () => {
      const { service, http } = setup();

      let emissions = 0;
      service.vocabulary$.subscribe(() => emissions++);
      expect(emissions).toBe(0);

      http.expectOne(vocabUrl(TEST_PAIR)).flush(sampleVocabulary());
      expect(emissions).toBe(1);
    });

    it('fetches the other pair after the pair switches', () => {
      const { service, http, language } = setup();
      const other = vocabulary(category('gamma', [word(9, 'w9')]));

      let emitted: Vocabulary | undefined;
      service.vocabulary$.subscribe((v) => (emitted = v));
      http.expectOne(vocabUrl(TEST_PAIR)).flush(sampleVocabulary());

      language.setPair(OTHER_PAIR);
      http.expectOne(vocabUrl(OTHER_PAIR)).flush(other);

      expect(emitted).toEqual(other);
    });

    it('builds the URL from the pair the service started on', () => {
      const { service, http } = setup(OTHER_PAIR);

      service.vocabulary$.subscribe();
      http.expectOne(vocabUrl(OTHER_PAIR)).flush(sampleVocabulary());
    });
  });

  describe('caching', () => {
    it('issues exactly one request for two vocabularyFor() calls on the same pair', () => {
      const { service, http } = setup();

      service.vocabularyFor(TEST_PAIR).subscribe();
      service.vocabularyFor(TEST_PAIR).subscribe();

      const requests = http.match(vocabUrl(TEST_PAIR));
      expect(requests.length).toBe(1);
      requests[0].flush(sampleVocabulary());
    });

    it('replays the cached body to a subscriber that arrives after the response', () => {
      const { service, http } = setup();
      const body = sampleVocabulary();

      service.vocabularyFor(TEST_PAIR).subscribe();
      http.expectOne(vocabUrl(TEST_PAIR)).flush(body);

      let late: Vocabulary | undefined;
      service.vocabularyFor(TEST_PAIR).subscribe((v) => (late = v));
      expect(late).toEqual(body);
      http.expectNone(vocabUrl(TEST_PAIR));
    });

    it('keeps one cache entry per pair', () => {
      const { service, http } = setup();

      service.vocabularyFor(TEST_PAIR).subscribe();
      http.expectOne(vocabUrl(TEST_PAIR)).flush(sampleVocabulary());

      service.vocabularyFor(OTHER_PAIR).subscribe();
      http.expectOne(vocabUrl(OTHER_PAIR)).flush(vocabulary());
    });

    it('does not refetch when the pair switches away and back', () => {
      const { service, http, language } = setup();
      const first = sampleVocabulary();
      const other = vocabulary(category('gamma', [word(9, 'w9')]));

      let emitted: Vocabulary | undefined;
      service.vocabulary$.subscribe((v) => (emitted = v));
      http.expectOne(vocabUrl(TEST_PAIR)).flush(first);

      language.setPair(OTHER_PAIR);
      http.expectOne(vocabUrl(OTHER_PAIR)).flush(other);

      language.setPair(TEST_PAIR);
      http.expectNone(vocabUrl(TEST_PAIR));
      expect(emitted).toEqual(first);
    });

    it('does not refetch for a second subscriber of vocabulary$', () => {
      const { service, http } = setup();

      service.vocabulary$.subscribe();
      http.expectOne(vocabUrl(TEST_PAIR)).flush(sampleVocabulary());

      service.vocabulary$.subscribe();
      http.expectNone(vocabUrl(TEST_PAIR));
    });
  });

  describe('getCategorySignal', () => {
    it('returns the matching category', () => {
      const { service, http } = setup();
      const key = signal('alpha');
      const category$ = TestBed.runInInjectionContext(() => service.getCategorySignal(key));

      TestBed.tick();
      http.expectOne(vocabUrl(TEST_PAIR)).flush(sampleVocabulary());

      expect(category$()?.key).toBe('alpha');
      expect(category$()?.words.length).toBe(2);
    });

    it('is undefined before the vocabulary arrives', () => {
      const { service, http } = setup();
      const key = signal('alpha');
      const category$ = TestBed.runInInjectionContext(() => service.getCategorySignal(key));

      TestBed.tick();
      expect(category$()).toBeUndefined();

      http.expectOne(vocabUrl(TEST_PAIR)).flush(sampleVocabulary());
    });

    it('returns undefined for an unknown key', () => {
      const { service, http } = setup();
      const key = signal('nope');
      const category$ = TestBed.runInInjectionContext(() => service.getCategorySignal(key));

      TestBed.tick();
      http.expectOne(vocabUrl(TEST_PAIR)).flush(sampleVocabulary());

      expect(category$()).toBeUndefined();
    });

    it('follows the key signal without refetching', () => {
      const { service, http } = setup();
      const key = signal('alpha');
      const category$ = TestBed.runInInjectionContext(() => service.getCategorySignal(key));

      TestBed.tick();
      http.expectOne(vocabUrl(TEST_PAIR)).flush(sampleVocabulary());

      key.set('beta');
      TestBed.tick();
      expect(category$()?.key).toBe('beta');
      http.expectNone(vocabUrl(TEST_PAIR));
    });

    it('re-reads from the new pair after a pair switch', () => {
      const { service, http, language } = setup();
      const key = signal('alpha');
      const category$ = TestBed.runInInjectionContext(() => service.getCategorySignal(key));

      TestBed.tick();
      http.expectOne(vocabUrl(TEST_PAIR)).flush(sampleVocabulary());

      language.setPair(OTHER_PAIR);
      http.expectOne(vocabUrl(OTHER_PAIR)).flush(vocabulary(category('alpha', [word(7, 'w7')])));

      expect(category$()?.words).toEqual([word(7, 'w7')]);
    });
  });

  describe('resolveVocabRefs', () => {
    function resolve(refs: Record<string, number[]>, body = sampleVocabulary()) {
      const { service, http } = setup();
      let resolved: Vocabulary | undefined;
      service.resolveVocabRefs(TEST_PAIR, refs).subscribe((v) => (resolved = v));
      http.expectOne(vocabUrl(TEST_PAIR)).flush(body);
      return resolved;
    }

    it('keeps only the words whose n is referenced', () => {
      const resolved = resolve({ alpha: [2] });
      expect(resolved).toEqual({
        categories: [{ key: 'alpha', label: 'alpha label', words: [word(2, 'w2')] }],
      });
    });

    it('preserves the other category fields', () => {
      const resolved = resolve({ beta: [3] });
      expect(resolved?.categories[0].label).toBe('beta label');
      expect(resolved?.categories[0].key).toBe('beta');
    });

    it('drops a category whose refs match no word', () => {
      const resolved = resolve({ alpha: [1], beta: [999] });
      expect(resolved?.categories.map((c) => c.key)).toEqual(['alpha']);
    });

    it('drops a category with an empty ref list', () => {
      const resolved = resolve({ alpha: [1], beta: [] });
      expect(resolved?.categories.map((c) => c.key)).toEqual(['alpha']);
    });

    it('drops every category when there are no refs at all', () => {
      const resolved = resolve({});
      expect(resolved).toEqual({ categories: [] });
    });

    it('ignores refs for a category key that the vocabulary does not have', () => {
      const resolved = resolve({ alpha: [1], ghost: [1, 2] });
      expect(resolved?.categories.map((c) => c.key)).toEqual(['alpha']);
    });

    it('keeps the vocabulary order of the surviving categories and words', () => {
      const resolved = resolve({ beta: [4, 3], alpha: [2, 1] });
      expect(resolved?.categories.map((c) => c.key)).toEqual(['alpha', 'beta']);
      expect(resolved?.categories[0].words.map((w) => w.n)).toEqual([1, 2]);
      expect(resolved?.categories[1].words.map((w) => w.n)).toEqual([3, 4]);
    });

    it('does not mutate the cached vocabulary', () => {
      const { service, http } = setup();
      const body = sampleVocabulary();

      service.resolveVocabRefs(TEST_PAIR, { alpha: [1] }).subscribe();
      http.expectOne(vocabUrl(TEST_PAIR)).flush(body);

      let full: Vocabulary | undefined;
      service.vocabulary$.subscribe((v) => (full = v));
      expect(full).toEqual(sampleVocabulary());
    });
  });
});
