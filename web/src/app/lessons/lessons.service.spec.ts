import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';

import { LessonsService } from './lessons.service';
import { Lesson, LessonIndex, LessonWordRef } from './lessons.types';
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
 * Characterization spec: locks in the index/lesson/vocabulary fetch order, the lowercased-headword
 * join, the transcript fallback and the per-pair caches of `LessonsService` before its internals are
 * refactored. Everything here describes what the code does today, not what it arguably should do.
 */
describe('LessonsService', () => {
  const indexUrl = (pair: string) => `/assets/${pair}/lessons-index.json`;
  const lessonUrl = (pair: string, slug: string) => `/assets/${pair}/lessons/${slug}.json`;
  const textUrl = (pair: string, slug: string) => `/assets/${pair}/lessons/${slug}.txt`;
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

  function lessonIndex(...slugs: string[]): LessonIndex {
    return { lessons: slugs.map(indexEntry) };
  }

  /** A lesson word is authored inline: headword, the lesson's own gloss, and its category key. */
  function ref(target: string, native: string, categoryKey: string): LessonWordRef {
    return { target, native, category: categoryKey };
  }

  function pattern(id: string): PatternPair {
    return { target: `${id} target`, native: `${id} native` };
  }

  function lesson(slug: string, words: LessonWordRef[], patterns: PatternPair[] = []): Lesson {
    return { slug, title: `${slug} title`, words, patterns };
  }

  function setup(initialPair = TEST_PAIR) {
    TestBed.configureTestingModule({
      providers: [...testProviders(), ...provideStubLanguage(initialPair)],
    });
    return {
      service: TestBed.inject(LessonsService),
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
      const body = lessonIndex('l1', 'l2');

      let emitted: LessonIndex | undefined;
      service.index$.subscribe((i) => (emitted = i));
      http.expectOne(indexUrl(TEST_PAIR)).flush(body);

      expect(emitted).toEqual(body);
    });

    it('fetches the other pair index after the pair switches', () => {
      const { service, http, language } = setup();
      const other = lessonIndex('l9');

      let emitted: LessonIndex | undefined;
      service.index$.subscribe((i) => (emitted = i));
      http.expectOne(indexUrl(TEST_PAIR)).flush(lessonIndex('l1'));

      language.setPair(OTHER_PAIR);
      http.expectOne(indexUrl(OTHER_PAIR)).flush(other);

      expect(emitted).toEqual(other);
    });

    it('does not refetch the index when the pair switches away and back', () => {
      const { service, http, language } = setup();

      service.index$.subscribe();
      http.expectOne(indexUrl(TEST_PAIR)).flush(lessonIndex('l1'));

      language.setPair(OTHER_PAIR);
      http.expectOne(indexUrl(OTHER_PAIR)).flush(lessonIndex('l9'));

      language.setPair(TEST_PAIR);
      http.expectNone(indexUrl(TEST_PAIR));
    });
  });

  describe('lessons$', () => {
    it('unwraps the index to its entry list', () => {
      const { service, http } = setup();

      let emitted: PracticeIndexEntry[] | undefined;
      service.lessons$.subscribe((l) => (emitted = l));
      http.expectOne(indexUrl(TEST_PAIR)).flush(lessonIndex('l1', 'l2'));

      expect(emitted).toEqual([indexEntry('l1'), indexEntry('l2')]);
    });

    it('shares the index request with index$', () => {
      const { service, http } = setup();

      service.index$.subscribe();
      service.lessons$.subscribe();

      const indexRequests = http.match(indexUrl(TEST_PAIR));
      expect(indexRequests.length).toBe(1);
      indexRequests[0].flush(lessonIndex('l1'));
    });
  });

  describe('getLesson', () => {
    it('fetches the lesson JSON once the index confirms the slug', () => {
      const { service, http } = setup();
      const body = lesson('l1', [ref('w1', 'g1', 'alpha')]);

      let emitted: Lesson | undefined;
      service.getLesson('l1').subscribe((l) => (emitted = l));

      // The lesson request must not be issued before the index answers.
      http.expectNone(lessonUrl(TEST_PAIR, 'l1'));
      http.expectOne(indexUrl(TEST_PAIR)).flush(lessonIndex('l1'));

      http.expectOne(lessonUrl(TEST_PAIR, 'l1')).flush(body);
      expect(emitted).toEqual(body);
    });

    it('emits undefined and issues no lesson request for a slug not in the index', () => {
      const { service, http } = setup();

      const emissions: (Lesson | undefined)[] = [];
      service.getLesson('missing').subscribe((l) => emissions.push(l));
      http.expectOne(indexUrl(TEST_PAIR)).flush(lessonIndex('l1', 'l2'));

      expect(emissions).toEqual([undefined]);
      http.expectNone(lessonUrl(TEST_PAIR, 'missing'));
    });

    it('builds the lesson URL from the active pair', () => {
      const { service, http } = setup(OTHER_PAIR);

      service.getLesson('l1').subscribe();
      http.expectOne(indexUrl(OTHER_PAIR)).flush(lessonIndex('l1'));
      http.expectOne(lessonUrl(OTHER_PAIR, 'l1')).flush(lesson('l1', []));
    });
  });

  describe('caching', () => {
    it('issues one index and one lesson request for two getLesson() calls on the same slug', () => {
      const { service, http } = setup();

      service.getLesson('l1').subscribe();
      service.getLesson('l1').subscribe();

      const indexRequests = http.match(indexUrl(TEST_PAIR));
      expect(indexRequests.length).toBe(1);
      indexRequests[0].flush(lessonIndex('l1'));

      const lessonRequests = http.match(lessonUrl(TEST_PAIR, 'l1'));
      expect(lessonRequests.length).toBe(1);
      lessonRequests[0].flush(lesson('l1', []));
    });

    it('replays the cached lesson to a subscriber that arrives after the response', () => {
      const { service, http } = setup();
      const body = lesson('l1', [ref('w1', 'g1', 'alpha')]);

      service.getLesson('l1').subscribe();
      http.expectOne(indexUrl(TEST_PAIR)).flush(lessonIndex('l1'));
      http.expectOne(lessonUrl(TEST_PAIR, 'l1')).flush(body);

      let late: Lesson | undefined;
      service.getLesson('l1').subscribe((l) => (late = l));
      expect(late).toEqual(body);
      http.expectNone(lessonUrl(TEST_PAIR, 'l1'));
    });

    it('fetches a second slug separately', () => {
      const { service, http } = setup();

      service.getLesson('l1').subscribe();
      http.expectOne(indexUrl(TEST_PAIR)).flush(lessonIndex('l1', 'l2'));
      http.expectOne(lessonUrl(TEST_PAIR, 'l1')).flush(lesson('l1', []));

      service.getLesson('l2').subscribe();
      http.expectNone(indexUrl(TEST_PAIR));
      http.expectOne(lessonUrl(TEST_PAIR, 'l2')).flush(lesson('l2', []));
    });

    it('caches the same slug per pair', () => {
      const { service, http, language } = setup();

      service.getLesson('l1').subscribe();
      http.expectOne(indexUrl(TEST_PAIR)).flush(lessonIndex('l1'));
      http.expectOne(lessonUrl(TEST_PAIR, 'l1')).flush(lesson('l1', []));

      language.setPair(OTHER_PAIR);
      service.getLesson('l1').subscribe();
      http.expectOne(indexUrl(OTHER_PAIR)).flush(lessonIndex('l1'));
      http.expectOne(lessonUrl(OTHER_PAIR, 'l1')).flush(lesson('l1', []));
    });

    it('caches the transcript per pair', () => {
      const { service, http, language } = setup();

      service.getLessonText('l1').subscribe();
      http.expectOne(indexUrl(TEST_PAIR)).flush(lessonIndex('l1'));
      http.expectOne(textUrl(TEST_PAIR, 'l1')).flush('l1 transcript');

      language.setPair(OTHER_PAIR);
      service.getLessonText('l1').subscribe();
      http.expectOne(indexUrl(OTHER_PAIR)).flush(lessonIndex('l1'));
      http.expectOne(textUrl(OTHER_PAIR, 'l1')).flush('other transcript');
    });
  });

  describe('getLessonResolved', () => {
    it('takes pronunciation and examples from the vocabulary but the gloss from the lesson', () => {
      const { service, http } = setup();
      const patterns = [pattern('p1')];

      let resolved: PracticeResolved | undefined;
      service.getLessonResolved('l1').subscribe((r) => (resolved = r));

      http.expectOne(indexUrl(TEST_PAIR)).flush(lessonIndex('l1'));
      http
        .expectOne(lessonUrl(TEST_PAIR, 'l1'))
        .flush(lesson('l1', [ref('w3', 'lesson gloss', 'beta')], patterns));
      http.expectOne(vocabUrl(TEST_PAIR)).flush(sampleVocabulary());

      expect(resolved).toEqual({
        slug: 'l1',
        title: 'l1 title',
        // `translation` is the lesson's own gloss, not the vocabulary's `t3`.
        words: [
          { n: 3, target: 'w3', pronunciation: 'p3', translation: 'lesson gloss', examples: 'e3' },
        ],
        patterns,
      });
    });

    it('matches the headword case-insensitively and keeps the lesson spelling', () => {
      const { service, http } = setup();

      let resolved: PracticeResolved | undefined;
      service.getLessonResolved('l1').subscribe((r) => (resolved = r));

      http.expectOne(indexUrl(TEST_PAIR)).flush(lessonIndex('l1'));
      http.expectOne(lessonUrl(TEST_PAIR, 'l1')).flush(lesson('l1', [ref('W1', 'g1', 'alpha')]));
      http.expectOne(vocabUrl(TEST_PAIR)).flush(sampleVocabulary());

      // The vocabulary entry is 'w1'; the join succeeds, but the emitted target is 'W1'.
      expect(resolved?.words).toEqual([
        { n: 1, target: 'W1', pronunciation: 'p1', translation: 'g1', examples: 'e1' },
      ]);
    });

    it('matches by target, not by n, so vocabulary order is irrelevant', () => {
      const { service, http } = setup();

      let resolved: PracticeResolved | undefined;
      service.getLessonResolved('l1').subscribe((r) => (resolved = r));

      http.expectOne(indexUrl(TEST_PAIR)).flush(lessonIndex('l1'));
      http
        .expectOne(lessonUrl(TEST_PAIR, 'l1'))
        .flush(lesson('l1', [ref('w4', 'g4', 'beta'), ref('w2', 'g2', 'alpha')]));
      http.expectOne(vocabUrl(TEST_PAIR)).flush(sampleVocabulary());

      expect(resolved?.words.map((w) => [w.target, w.n])).toEqual([
        ['w4', 4],
        ['w2', 2],
      ]);
    });

    it('falls back to the 1-based position and empty strings when the headword is unknown', () => {
      const { service, http } = setup();

      let resolved: PracticeResolved | undefined;
      service.getLessonResolved('l1').subscribe((r) => (resolved = r));

      http.expectOne(indexUrl(TEST_PAIR)).flush(lessonIndex('l1'));
      http
        .expectOne(lessonUrl(TEST_PAIR, 'l1'))
        .flush(lesson('l1', [ref('w3', 'g3', 'beta'), ref('w9', 'g9', 'alpha')]));
      http.expectOne(vocabUrl(TEST_PAIR)).flush(sampleVocabulary());

      expect(resolved?.words).toEqual([
        { n: 3, target: 'w3', pronunciation: 'p3', translation: 'g3', examples: 'e3' },
        { n: 2, target: 'w9', pronunciation: '', translation: 'g9', examples: '' },
      ]);
    });

    it('does not match a headword listed under a different category', () => {
      const { service, http } = setup();

      let resolved: PracticeResolved | undefined;
      service.getLessonResolved('l1').subscribe((r) => (resolved = r));

      http.expectOne(indexUrl(TEST_PAIR)).flush(lessonIndex('l1'));
      http.expectOne(lessonUrl(TEST_PAIR, 'l1')).flush(lesson('l1', [ref('w1', 'g1', 'beta')]));
      http.expectOne(vocabUrl(TEST_PAIR)).flush(sampleVocabulary());

      // 'w1' lives in `alpha`; the lesson claims `beta`, so nothing is joined.
      expect(resolved?.words).toEqual([
        { n: 1, target: 'w1', pronunciation: '', translation: 'g1', examples: '' },
      ]);
    });

    it('keeps every lesson word, unlike the drill join which drops unresolved refs', () => {
      const { service, http } = setup();

      let resolved: PracticeResolved | undefined;
      service.getLessonResolved('l1').subscribe((r) => (resolved = r));

      http.expectOne(indexUrl(TEST_PAIR)).flush(lessonIndex('l1'));
      http
        .expectOne(lessonUrl(TEST_PAIR, 'l1'))
        .flush(lesson('l1', [ref('w9', 'g9', 'gamma'), ref('w8', 'g8', 'gamma')]));
      http.expectOne(vocabUrl(TEST_PAIR)).flush(sampleVocabulary());

      expect(resolved?.words.map((w) => w.target)).toEqual(['w9', 'w8']);
    });

    it('emits undefined and fetches neither lesson nor vocabulary for an unknown slug', () => {
      const { service, http } = setup();

      const emissions: (PracticeResolved | undefined)[] = [];
      service.getLessonResolved('missing').subscribe((r) => emissions.push(r));
      http.expectOne(indexUrl(TEST_PAIR)).flush(lessonIndex('l1'));

      expect(emissions).toEqual([undefined]);
      http.expectNone(lessonUrl(TEST_PAIR, 'missing'));
      http.expectNone(vocabUrl(TEST_PAIR));
    });

    it('does not refetch anything for a second call on the same slug', () => {
      const { service, http } = setup();

      service.getLessonResolved('l1').subscribe();
      http.expectOne(indexUrl(TEST_PAIR)).flush(lessonIndex('l1'));
      http.expectOne(lessonUrl(TEST_PAIR, 'l1')).flush(lesson('l1', [ref('w1', 'g1', 'alpha')]));
      http.expectOne(vocabUrl(TEST_PAIR)).flush(sampleVocabulary());

      let late: PracticeResolved | undefined;
      service.getLessonResolved('l1').subscribe((r) => (late = r));
      expect(late?.slug).toBe('l1');
      http.expectNone(indexUrl(TEST_PAIR));
      http.expectNone(lessonUrl(TEST_PAIR, 'l1'));
      http.expectNone(vocabUrl(TEST_PAIR));
    });

    it('caches the resolved lesson per pair', () => {
      const { service, http, language } = setup();

      service.getLessonResolved('l1').subscribe();
      http.expectOne(indexUrl(TEST_PAIR)).flush(lessonIndex('l1'));
      http.expectOne(lessonUrl(TEST_PAIR, 'l1')).flush(lesson('l1', [ref('w1', 'g1', 'alpha')]));
      http.expectOne(vocabUrl(TEST_PAIR)).flush(sampleVocabulary());

      language.setPair(OTHER_PAIR);
      service.getLessonResolved('l1').subscribe();
      http.expectOne(indexUrl(OTHER_PAIR)).flush(lessonIndex('l1'));
      http.expectOne(lessonUrl(OTHER_PAIR, 'l1')).flush(lesson('l1', [ref('w1', 'g1', 'alpha')]));
      http.expectOne(vocabUrl(OTHER_PAIR)).flush(sampleVocabulary());
    });
  });

  describe('getLessonText', () => {
    it('fetches the transcript as plain text from the active pair', () => {
      const { service, http } = setup();

      let emitted: string | null | undefined;
      service.getLessonText('l1').subscribe((t) => (emitted = t));

      http.expectOne(indexUrl(TEST_PAIR)).flush(lessonIndex('l1'));
      const req = http.expectOne(textUrl(TEST_PAIR, 'l1'));
      expect(req.request.responseType).toBe('text');
      req.flush('l1 transcript');

      expect(emitted).toBe('l1 transcript');
    });

    it('maps a failed transcript request to null', () => {
      const { service, http } = setup();

      let emitted: string | null | undefined;
      service.getLessonText('l1').subscribe((t) => (emitted = t));

      http.expectOne(indexUrl(TEST_PAIR)).flush(lessonIndex('l1'));
      http
        .expectOne(textUrl(TEST_PAIR, 'l1'))
        .flush('nope', { status: 404, statusText: 'Not Found' });

      expect(emitted).toBeNull();
    });

    it('caches the null of a failed transcript instead of retrying', () => {
      const { service, http } = setup();

      service.getLessonText('l1').subscribe();
      http.expectOne(indexUrl(TEST_PAIR)).flush(lessonIndex('l1'));
      http
        .expectOne(textUrl(TEST_PAIR, 'l1'))
        .flush('nope', { status: 404, statusText: 'Not Found' });

      let late: string | null | undefined;
      service.getLessonText('l1').subscribe((t) => (late = t));
      expect(late).toBeNull();
      http.expectNone(textUrl(TEST_PAIR, 'l1'));
    });

    it('issues one request for two getLessonText() calls on the same slug', () => {
      const { service, http } = setup();

      service.getLessonText('l1').subscribe();
      service.getLessonText('l1').subscribe();

      http.expectOne(indexUrl(TEST_PAIR)).flush(lessonIndex('l1'));
      const requests = http.match(textUrl(TEST_PAIR, 'l1'));
      expect(requests.length).toBe(1);
      requests[0].flush('l1 transcript');
    });

    it('is guarded by the index: an unknown slug emits null without fetching', () => {
      const { service, http } = setup();

      let emitted: string | null | undefined;
      service.getLessonText('missing').subscribe((t) => (emitted = t));

      http.expectOne(indexUrl(TEST_PAIR)).flush(lessonIndex('l1'));
      http.expectNone(textUrl(TEST_PAIR, 'missing'));

      expect(emitted).toBeNull();
    });
  });

  describe('getLessonTextSignal', () => {
    it('exposes the transcript once the request is answered', () => {
      const { service, http } = setup();
      const slug = signal('l1');
      const text = TestBed.runInInjectionContext(() => service.getLessonTextSignal(slug));

      TestBed.tick();
      expect(text()).toBeUndefined();

      http.expectOne(indexUrl(TEST_PAIR)).flush(lessonIndex('l1', 'l2'));
      http.expectOne(textUrl(TEST_PAIR, 'l1')).flush('l1 transcript');
      expect(text()).toBe('l1 transcript');
    });

    it('follows the slug signal', () => {
      const { service, http } = setup();
      const slug = signal('l1');
      const text = TestBed.runInInjectionContext(() => service.getLessonTextSignal(slug));

      TestBed.tick();
      http.expectOne(indexUrl(TEST_PAIR)).flush(lessonIndex('l1', 'l2'));
      http.expectOne(textUrl(TEST_PAIR, 'l1')).flush('l1 transcript');

      slug.set('l2');
      TestBed.tick();
      http.expectOne(textUrl(TEST_PAIR, 'l2')).flush('l2 transcript');

      expect(text()).toBe('l2 transcript');
    });

    it('exposes null when the transcript request fails', () => {
      const { service, http } = setup();
      const slug = signal('l1');
      const text = TestBed.runInInjectionContext(() => service.getLessonTextSignal(slug));

      TestBed.tick();
      http.expectOne(indexUrl(TEST_PAIR)).flush(lessonIndex('l1'));
      http
        .expectOne(textUrl(TEST_PAIR, 'l1'))
        .flush('nope', { status: 404, statusText: 'Not Found' });

      expect(text()).toBeNull();
    });
  });

  describe('getLessonResolvedSignal', () => {
    it('exposes the resolved lesson once every request is answered', () => {
      const { service, http } = setup();
      const slug = signal('l1');
      const resolved = TestBed.runInInjectionContext(() => service.getLessonResolvedSignal(slug));

      TestBed.tick();
      expect(resolved()).toBeUndefined();

      http.expectOne(indexUrl(TEST_PAIR)).flush(lessonIndex('l1'));
      http.expectOne(lessonUrl(TEST_PAIR, 'l1')).flush(lesson('l1', [ref('w1', 'g1', 'alpha')]));
      http.expectOne(vocabUrl(TEST_PAIR)).flush(sampleVocabulary());

      expect(resolved()?.title).toBe('l1 title');
      expect(resolved()?.words.map((w) => w.target)).toEqual(['w1']);
    });

    it('follows the slug signal', () => {
      const { service, http } = setup();
      const slug = signal('l1');
      const resolved = TestBed.runInInjectionContext(() => service.getLessonResolvedSignal(slug));

      TestBed.tick();
      http.expectOne(indexUrl(TEST_PAIR)).flush(lessonIndex('l1', 'l2'));
      http.expectOne(lessonUrl(TEST_PAIR, 'l1')).flush(lesson('l1', [ref('w1', 'g1', 'alpha')]));
      http.expectOne(vocabUrl(TEST_PAIR)).flush(sampleVocabulary());

      slug.set('l2');
      TestBed.tick();
      http.expectOne(lessonUrl(TEST_PAIR, 'l2')).flush(lesson('l2', [ref('w3', 'g3', 'beta')]));

      expect(resolved()?.slug).toBe('l2');
      expect(resolved()?.words.map((w) => w.target)).toEqual(['w3']);
    });

    it('becomes undefined for a slug that is not in the index', () => {
      const { service, http } = setup();
      const slug = signal('missing');
      const resolved = TestBed.runInInjectionContext(() => service.getLessonResolvedSignal(slug));

      TestBed.tick();
      http.expectOne(indexUrl(TEST_PAIR)).flush(lessonIndex('l1'));

      expect(resolved()).toBeUndefined();
      http.expectNone(lessonUrl(TEST_PAIR, 'missing'));
      http.expectNone(vocabUrl(TEST_PAIR));
    });
  });

  describe('getLessonCategorySignal', () => {
    it('synthesises a single category with the literal key "lesson"', () => {
      const { service, http } = setup();
      const slug = signal('l1');
      const category$ = TestBed.runInInjectionContext(() => service.getLessonCategorySignal(slug));

      TestBed.tick();
      http.expectOne(indexUrl(TEST_PAIR)).flush(lessonIndex('l1'));
      http
        .expectOne(lessonUrl(TEST_PAIR, 'l1'))
        .flush(lesson('l1', [ref('w3', 'g3', 'beta'), ref('w1', 'g1', 'alpha')]));
      http.expectOne(vocabUrl(TEST_PAIR)).flush(sampleVocabulary());

      // The key is a literal, not the lesson slug and not a vocabulary category key.
      expect(category$()).toEqual({
        key: 'lesson',
        label: 'l1 title',
        words: [
          { n: 3, target: 'w3', pronunciation: 'p3', translation: 'g3', examples: 'e3' },
          { n: 1, target: 'w1', pronunciation: 'p1', translation: 'g1', examples: 'e1' },
        ],
      });
    });

    it('follows the slug signal and keeps the literal key', () => {
      const { service, http } = setup();
      const slug = signal('l1');
      const category$ = TestBed.runInInjectionContext(() => service.getLessonCategorySignal(slug));

      TestBed.tick();
      http.expectOne(indexUrl(TEST_PAIR)).flush(lessonIndex('l1', 'l2'));
      http.expectOne(lessonUrl(TEST_PAIR, 'l1')).flush(lesson('l1', [ref('w1', 'g1', 'alpha')]));
      http.expectOne(vocabUrl(TEST_PAIR)).flush(sampleVocabulary());

      slug.set('l2');
      TestBed.tick();
      http.expectOne(lessonUrl(TEST_PAIR, 'l2')).flush(lesson('l2', [ref('w4', 'g4', 'beta')]));

      expect(category$()?.key).toBe('lesson');
      expect(category$()?.label).toBe('l2 title');
      expect(category$()?.words.map((w) => w.target)).toEqual(['w4']);
    });

    it('returns undefined for a slug that is not in the index', () => {
      const { service, http } = setup();
      const slug = signal('missing');
      const category$ = TestBed.runInInjectionContext(() => service.getLessonCategorySignal(slug));

      TestBed.tick();
      http.expectOne(indexUrl(TEST_PAIR)).flush(lessonIndex('l1'));

      expect(category$()).toBeUndefined();
      http.expectNone(lessonUrl(TEST_PAIR, 'missing'));
    });
  });
});
