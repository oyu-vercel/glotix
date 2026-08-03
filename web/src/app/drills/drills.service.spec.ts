import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';

import { DrillsService } from './drills.service';
import { Drill, DrillIndex, DrillWordRef } from './drills.types';
import { PatternPair, PracticeIndexEntry, PracticeResolved } from '../shared/types/practice';
import { Category, Vocabulary, Word } from '../vocabulary/vocabulary.types';
import {
  OTHER_PAIR,
  StubLanguageService,
  TEST_PAIR,
  provideStubLanguage,
  testProviders,
  verifyNoOutstandingRequests,
} from '../../testing/setup';

/**
 * Characterization spec: locks in the index/drill/vocabulary fetch order, the `wordOrder` join and
 * the per-pair caches of `DrillsService` before its internals are refactored. Everything here
 * describes what the code does today, not what it arguably should do.
 */
describe('DrillsService', () => {
  const indexUrl = (pair: string) => `/assets/${pair}/drills-index.json`;
  const drillUrl = (pair: string, slug: string) => `/assets/${pair}/drills/${slug}.json`;
  const vocabUrl = (pair: string) => `/assets/${pair}/vocabulary.json`;

  function word(n: number, target: string): Word {
    return { n, target, pronunciation: `p${n}`, translation: `t${n}`, examples: `e${n}` };
  }

  function category(key: string, words: Word[]): Category {
    return { key, label: `${key} label`, words };
  }

  function sampleVocabulary(): Vocabulary {
    return {
      categories: [
        category('alpha', [word(1, 'w1'), word(2, 'w2')]),
        category('beta', [word(3, 'w3'), word(4, 'w4')]),
      ],
    };
  }

  function indexEntry(slug: string): PracticeIndexEntry {
    return { slug, title: `${slug} title`, wordCount: 2, patternCount: 1 };
  }

  function drillIndex(...slugs: string[]): DrillIndex {
    return { drills: slugs.map(indexEntry) };
  }

  function ref(categoryKey: string, n: number): DrillWordRef {
    return { category: categoryKey, n };
  }

  function pattern(id: string): PatternPair {
    return { target: `${id} target`, native: `${id} native` };
  }

  function drill(slug: string, wordOrder: DrillWordRef[], patterns: PatternPair[] = []): Drill {
    return { slug, title: `${slug} title`, wordOrder, patterns };
  }

  function setup(initialPair = TEST_PAIR) {
    TestBed.configureTestingModule({
      providers: [...testProviders(), ...provideStubLanguage(initialPair)],
    });
    return {
      service: TestBed.inject(DrillsService),
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

  describe('index$', () => {
    it('fetches the active pair index and emits the parsed body', () => {
      const { service, http } = setup();
      const body = drillIndex('d1', 'd2');

      let emitted: DrillIndex | undefined;
      service.index$.subscribe((i) => (emitted = i));
      http.expectOne(indexUrl(TEST_PAIR)).flush(body);

      expect(emitted).toEqual(body);
    });

    it('fetches the other pair index after the pair switches', () => {
      const { service, http, language } = setup();
      const other = drillIndex('d9');

      let emitted: DrillIndex | undefined;
      service.index$.subscribe((i) => (emitted = i));
      http.expectOne(indexUrl(TEST_PAIR)).flush(drillIndex('d1'));

      language.setPair(OTHER_PAIR);
      http.expectOne(indexUrl(OTHER_PAIR)).flush(other);

      expect(emitted).toEqual(other);
    });

    it('does not refetch the index when the pair switches away and back', () => {
      const { service, http, language } = setup();

      service.index$.subscribe();
      http.expectOne(indexUrl(TEST_PAIR)).flush(drillIndex('d1'));

      language.setPair(OTHER_PAIR);
      http.expectOne(indexUrl(OTHER_PAIR)).flush(drillIndex('d9'));

      language.setPair(TEST_PAIR);
      http.expectNone(indexUrl(TEST_PAIR));
    });
  });

  describe('getDrill', () => {
    it('fetches the drill JSON once the index confirms the slug', () => {
      const { service, http } = setup();
      const body = drill('d1', [ref('alpha', 1)]);

      let emitted: Drill | undefined;
      service.getDrill('d1').subscribe((d) => (emitted = d));

      // The drill request must not be issued before the index answers.
      http.expectNone(drillUrl(TEST_PAIR, 'd1'));
      http.expectOne(indexUrl(TEST_PAIR)).flush(drillIndex('d1'));

      http.expectOne(drillUrl(TEST_PAIR, 'd1')).flush(body);
      expect(emitted).toEqual(body);
    });

    it('emits undefined and issues no drill request for a slug not in the index', () => {
      const { service, http } = setup();

      const emissions: (Drill | undefined)[] = [];
      service.getDrill('missing').subscribe((d) => emissions.push(d));
      http.expectOne(indexUrl(TEST_PAIR)).flush(drillIndex('d1', 'd2'));

      expect(emissions).toEqual([undefined]);
      http.expectNone(drillUrl(TEST_PAIR, 'missing'));
    });

    it('builds the drill URL from the active pair', () => {
      const { service, http } = setup(OTHER_PAIR);

      service.getDrill('d1').subscribe();
      http.expectOne(indexUrl(OTHER_PAIR)).flush(drillIndex('d1'));
      http.expectOne(drillUrl(OTHER_PAIR, 'd1')).flush(drill('d1', []));
    });
  });

  describe('caching', () => {
    it('issues one index and one drill request for two getDrill() calls on the same slug', () => {
      const { service, http } = setup();

      service.getDrill('d1').subscribe();
      service.getDrill('d1').subscribe();

      const indexRequests = http.match(indexUrl(TEST_PAIR));
      expect(indexRequests.length).toBe(1);
      indexRequests[0].flush(drillIndex('d1'));

      const drillRequests = http.match(drillUrl(TEST_PAIR, 'd1'));
      expect(drillRequests.length).toBe(1);
      drillRequests[0].flush(drill('d1', [ref('alpha', 1)]));
    });

    it('replays the cached drill to a subscriber that arrives after the response', () => {
      const { service, http } = setup();
      const body = drill('d1', [ref('alpha', 1)]);

      service.getDrill('d1').subscribe();
      http.expectOne(indexUrl(TEST_PAIR)).flush(drillIndex('d1'));
      http.expectOne(drillUrl(TEST_PAIR, 'd1')).flush(body);

      let late: Drill | undefined;
      service.getDrill('d1').subscribe((d) => (late = d));
      expect(late).toEqual(body);
      http.expectNone(drillUrl(TEST_PAIR, 'd1'));
    });

    it('fetches a second slug separately', () => {
      const { service, http } = setup();

      service.getDrill('d1').subscribe();
      http.expectOne(indexUrl(TEST_PAIR)).flush(drillIndex('d1', 'd2'));
      http.expectOne(drillUrl(TEST_PAIR, 'd1')).flush(drill('d1', []));

      service.getDrill('d2').subscribe();
      http.expectNone(indexUrl(TEST_PAIR));
      http.expectOne(drillUrl(TEST_PAIR, 'd2')).flush(drill('d2', []));
    });

    it('caches the same slug per pair', () => {
      const { service, http, language } = setup();

      service.getDrill('d1').subscribe();
      http.expectOne(indexUrl(TEST_PAIR)).flush(drillIndex('d1'));
      http.expectOne(drillUrl(TEST_PAIR, 'd1')).flush(drill('d1', []));

      language.setPair(OTHER_PAIR);
      service.getDrill('d1').subscribe();
      http.expectOne(indexUrl(OTHER_PAIR)).flush(drillIndex('d1'));
      http.expectOne(drillUrl(OTHER_PAIR, 'd1')).flush(drill('d1', []));
    });

    it('caches the resolved drill per pair', () => {
      const { service, http, language } = setup();

      service.getDrillResolved('d1').subscribe();
      http.expectOne(indexUrl(TEST_PAIR)).flush(drillIndex('d1'));
      http.expectOne(drillUrl(TEST_PAIR, 'd1')).flush(drill('d1', [ref('alpha', 1)]));
      http.expectOne(vocabUrl(TEST_PAIR)).flush(sampleVocabulary());

      language.setPair(OTHER_PAIR);
      service.getDrillResolved('d1').subscribe();
      http.expectOne(indexUrl(OTHER_PAIR)).flush(drillIndex('d1'));
      http.expectOne(drillUrl(OTHER_PAIR, 'd1')).flush(drill('d1', [ref('alpha', 1)]));
      http.expectOne(vocabUrl(OTHER_PAIR)).flush(sampleVocabulary());
    });
  });

  describe('getDrillResolved', () => {
    it('joins wordOrder against the pair vocabulary and keeps the wordOrder sequence', () => {
      const { service, http } = setup();
      const patterns = [pattern('p1')];

      let resolved: PracticeResolved | undefined;
      service.getDrillResolved('d1').subscribe((r) => (resolved = r));

      http.expectOne(indexUrl(TEST_PAIR)).flush(drillIndex('d1'));
      http
        .expectOne(drillUrl(TEST_PAIR, 'd1'))
        .flush(drill('d1', [ref('beta', 4), ref('alpha', 1), ref('beta', 3)], patterns));
      http.expectOne(vocabUrl(TEST_PAIR)).flush(sampleVocabulary());

      // Not vocabulary order (w1, w2, w3, w4) — the drill's own order wins.
      expect(resolved?.words.map((w) => w.target)).toEqual(['w4', 'w1', 'w3']);
      expect(resolved).toEqual({
        slug: 'd1',
        title: 'd1 title',
        words: [word(4, 'w4'), word(1, 'w1'), word(3, 'w3')],
        patterns,
      });
    });

    it('keeps a word repeated in wordOrder at each of its positions', () => {
      const { service, http } = setup();

      let resolved: PracticeResolved | undefined;
      service.getDrillResolved('d1').subscribe((r) => (resolved = r));

      http.expectOne(indexUrl(TEST_PAIR)).flush(drillIndex('d1'));
      http
        .expectOne(drillUrl(TEST_PAIR, 'd1'))
        .flush(drill('d1', [ref('alpha', 1), ref('beta', 3), ref('alpha', 1)]));
      http.expectOne(vocabUrl(TEST_PAIR)).flush(sampleVocabulary());

      expect(resolved?.words.map((w) => w.target)).toEqual(['w1', 'w3', 'w1']);
    });

    it('silently drops a ref whose n is missing from its category', () => {
      const { service, http } = setup();

      let resolved: PracticeResolved | undefined;
      service.getDrillResolved('d1').subscribe((r) => (resolved = r));

      http.expectOne(indexUrl(TEST_PAIR)).flush(drillIndex('d1'));
      http
        .expectOne(drillUrl(TEST_PAIR, 'd1'))
        .flush(drill('d1', [ref('alpha', 1), ref('alpha', 99), ref('beta', 3)]));
      http.expectOne(vocabUrl(TEST_PAIR)).flush(sampleVocabulary());

      expect(resolved?.words.map((w) => w.target)).toEqual(['w1', 'w3']);
    });

    it('silently drops a ref whose category is missing from the vocabulary', () => {
      const { service, http } = setup();

      let resolved: PracticeResolved | undefined;
      service.getDrillResolved('d1').subscribe((r) => (resolved = r));

      http.expectOne(indexUrl(TEST_PAIR)).flush(drillIndex('d1'));
      http
        .expectOne(drillUrl(TEST_PAIR, 'd1'))
        .flush(drill('d1', [ref('gamma', 1), ref('beta', 3)]));
      http.expectOne(vocabUrl(TEST_PAIR)).flush(sampleVocabulary());

      expect(resolved?.words.map((w) => w.target)).toEqual(['w3']);
    });

    it('emits undefined and fetches neither drill nor vocabulary for an unknown slug', () => {
      const { service, http } = setup();

      const emissions: (PracticeResolved | undefined)[] = [];
      service.getDrillResolved('missing').subscribe((r) => emissions.push(r));
      http.expectOne(indexUrl(TEST_PAIR)).flush(drillIndex('d1'));

      expect(emissions).toEqual([undefined]);
      http.expectNone(drillUrl(TEST_PAIR, 'missing'));
      http.expectNone(vocabUrl(TEST_PAIR));
    });

    it('does not refetch anything for a second call on the same slug', () => {
      const { service, http } = setup();

      service.getDrillResolved('d1').subscribe();
      http.expectOne(indexUrl(TEST_PAIR)).flush(drillIndex('d1'));
      http.expectOne(drillUrl(TEST_PAIR, 'd1')).flush(drill('d1', [ref('alpha', 1)]));
      http.expectOne(vocabUrl(TEST_PAIR)).flush(sampleVocabulary());

      let late: PracticeResolved | undefined;
      service.getDrillResolved('d1').subscribe((r) => (late = r));
      expect(late?.slug).toBe('d1');
      http.expectNone(indexUrl(TEST_PAIR));
      http.expectNone(drillUrl(TEST_PAIR, 'd1'));
      http.expectNone(vocabUrl(TEST_PAIR));
    });
  });

  describe('getDrillResolvedSignal', () => {
    it('exposes the resolved drill once every request is answered', () => {
      const { service, http } = setup();
      const slug = signal('d1');
      const resolved = TestBed.runInInjectionContext(() => service.getDrillResolvedSignal(slug));

      TestBed.tick();
      expect(resolved()).toBeUndefined();

      http.expectOne(indexUrl(TEST_PAIR)).flush(drillIndex('d1'));
      http.expectOne(drillUrl(TEST_PAIR, 'd1')).flush(drill('d1', [ref('alpha', 1)]));
      http.expectOne(vocabUrl(TEST_PAIR)).flush(sampleVocabulary());

      expect(resolved()?.title).toBe('d1 title');
      expect(resolved()?.words).toEqual([word(1, 'w1')]);
    });

    it('follows the slug signal', () => {
      const { service, http } = setup();
      const slug = signal('d1');
      const resolved = TestBed.runInInjectionContext(() => service.getDrillResolvedSignal(slug));

      TestBed.tick();
      http.expectOne(indexUrl(TEST_PAIR)).flush(drillIndex('d1', 'd2'));
      http.expectOne(drillUrl(TEST_PAIR, 'd1')).flush(drill('d1', [ref('alpha', 1)]));
      http.expectOne(vocabUrl(TEST_PAIR)).flush(sampleVocabulary());

      slug.set('d2');
      TestBed.tick();
      http.expectOne(drillUrl(TEST_PAIR, 'd2')).flush(drill('d2', [ref('beta', 3)]));

      expect(resolved()?.slug).toBe('d2');
      expect(resolved()?.words).toEqual([word(3, 'w3')]);
    });

    it('becomes undefined for a slug that is not in the index', () => {
      const { service, http } = setup();
      const slug = signal('missing');
      const resolved = TestBed.runInInjectionContext(() => service.getDrillResolvedSignal(slug));

      TestBed.tick();
      http.expectOne(indexUrl(TEST_PAIR)).flush(drillIndex('d1'));

      expect(resolved()).toBeUndefined();
      http.expectNone(drillUrl(TEST_PAIR, 'missing'));
      http.expectNone(vocabUrl(TEST_PAIR));
    });
  });

  describe('getDrillCategorySignal', () => {
    it('synthesises a single category with the literal key "drill"', () => {
      const { service, http } = setup();
      const slug = signal('d1');
      const category$ = TestBed.runInInjectionContext(() => service.getDrillCategorySignal(slug));

      TestBed.tick();
      http.expectOne(indexUrl(TEST_PAIR)).flush(drillIndex('d1'));
      http
        .expectOne(drillUrl(TEST_PAIR, 'd1'))
        .flush(drill('d1', [ref('beta', 3), ref('alpha', 1)]));
      http.expectOne(vocabUrl(TEST_PAIR)).flush(sampleVocabulary());

      // The key is a literal, not the drill slug and not a vocabulary category key.
      expect(category$()).toEqual({
        key: 'drill',
        label: 'd1 title',
        words: [word(3, 'w3'), word(1, 'w1')],
      });
    });

    it('follows the slug signal and keeps the literal key', () => {
      const { service, http } = setup();
      const slug = signal('d1');
      const category$ = TestBed.runInInjectionContext(() => service.getDrillCategorySignal(slug));

      TestBed.tick();
      http.expectOne(indexUrl(TEST_PAIR)).flush(drillIndex('d1', 'd2'));
      http.expectOne(drillUrl(TEST_PAIR, 'd1')).flush(drill('d1', [ref('alpha', 1)]));
      http.expectOne(vocabUrl(TEST_PAIR)).flush(sampleVocabulary());

      slug.set('d2');
      TestBed.tick();
      http.expectOne(drillUrl(TEST_PAIR, 'd2')).flush(drill('d2', [ref('beta', 4)]));

      expect(category$()?.key).toBe('drill');
      expect(category$()?.label).toBe('d2 title');
      expect(category$()?.words).toEqual([word(4, 'w4')]);
    });

    it('returns undefined for a slug that is not in the index', () => {
      const { service, http } = setup();
      const slug = signal('missing');
      const category$ = TestBed.runInInjectionContext(() => service.getDrillCategorySignal(slug));

      TestBed.tick();
      http.expectOne(indexUrl(TEST_PAIR)).flush(drillIndex('d1'));

      expect(category$()).toBeUndefined();
      http.expectNone(drillUrl(TEST_PAIR, 'missing'));
    });
  });
});
