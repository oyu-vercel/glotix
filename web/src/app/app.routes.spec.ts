import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingHarness } from '@angular/router/testing';

import { Router } from '@angular/router';

import { routes } from './app.routes';
import { LanguageService } from './shared/language/language.service';
import { TEST_PAIR, flushLanguages, testProviders } from '../testing/setup';

/**
 * Characterization smoke tests: navigate to every feature's real route and assert it renders its
 * rows or cards. These use the REAL `LanguageService`, so they also cover deriving the active pair
 * from the URL — the one thing the `StubLanguageService` used by the service specs bypasses.
 *
 * They are the broad net under the refactoring plan's later steps, which move the progress table,
 * the deck shell and the deck routes. See docs/refactoring-plan.md.
 */
describe('feature routes', () => {
  const url = (path: string) => `/assets/${TEST_PAIR}/${path}`;

  function word(n: number, target: string) {
    return { n, target, pronunciation: `p${n}`, translation: `t${n}`, examples: `e${n}.` };
  }

  const vocabulary = {
    categories: [
      { key: 'alpha', label: 'Alpha', words: [word(1, 'w1'), word(2, 'w2')] },
      { key: 'beta', label: 'Beta', words: [word(3, 'w3')] },
    ],
  };

  async function navigate(path: string) {
    const http = TestBed.inject(HttpTestingController);
    // `LanguageService` fetches the language index from its constructor, so instantiate it and
    // answer that request before navigating — otherwise the first component to inject it fires
    // the request mid-navigation and the order becomes route-dependent.
    TestBed.inject(LanguageService);
    flushLanguages();
    const harness = await RouterTestingHarness.create(path);
    return { harness, http, el: () => harness.routeNativeElement as HTMLElement };
  }

  /** Answers a request that may or may not have been issued yet, without failing if absent. */
  function flushIfPending(http: HttpTestingController, path: string, body: object): boolean {
    const matches = http.match(url(path));
    matches.forEach((r) => r.flush(body));
    return matches.length > 0;
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: testProviders(routes) });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('sends an unknown first segment back to the picker', async () => {
    await navigate('/not-a-pair/vocabulary');
    expect(TestBed.inject(Router).url).toBe('/');
  });

  it('derives the active pair from the URL', async () => {
    const { http } = await navigate(`/${TEST_PAIR}/books`);
    // The books list fetched under the pair from the URL, not a remembered or default one.
    http.expectOne(url('books-index.json')).flush({ books: [] });
  });

  describe('list screens', () => {
    it('renders the books list', async () => {
      const { http, el } = await navigate(`/${TEST_PAIR}/books`);
      http.expectOne(url('books-index.json')).flush({
        books: [
          { slug: 'b1', name: 'Book One', chapters: 2 },
          { slug: 'b2', name: 'Book Two', chapters: 1 },
        ],
      });
      TestBed.tick();

      expect(el().querySelectorAll('tr.clickable-row').length).toBe(2);
      expect(el().textContent).toContain('Book One');
    });

    it('renders the drills list', async () => {
      const { http, el } = await navigate(`/${TEST_PAIR}/drills`);
      http.expectOne(url('drills-index.json')).flush({
        drills: [{ slug: 'd1', title: 'Drill One', wordCount: 3, patternCount: 4 }],
      });
      TestBed.tick();

      expect(el().querySelectorAll('tr.clickable-row').length).toBe(1);
      expect(el().textContent).toContain('Drill One');
    });

    it('renders the lessons list', async () => {
      const { http, el } = await navigate(`/${TEST_PAIR}/lessons`);
      http.expectOne(url('lessons-index.json')).flush({
        lessons: [
          { slug: 'l1', title: 'Lesson One', wordCount: 2, patternCount: 2 },
          { slug: 'l2', title: 'Lesson Two', wordCount: 1, patternCount: 1 },
        ],
      });
      TestBed.tick();

      expect(el().querySelectorAll('tr.clickable-row').length).toBe(2);
      expect(el().textContent).toContain('Lesson Two');
    });

    it('renders the stories summary with a totals row', async () => {
      const { http, el } = await navigate(`/${TEST_PAIR}/stories`);
      http.expectOne(url('stories-index.json')).flush({
        stories: [{ slug: 's1', title: 'Story One', paragraphs: 2, vocabCount: 2 }],
      });
      TestBed.tick();
      http.expectOne(url('stories/s1.json')).flush({
        slug: 's1',
        title: 'Story One',
        text: 'Title\nBody line.',
        vocabulary: { alpha: [1, 2] },
      });
      flushIfPending(http, 'vocabulary.json', vocabulary);
      TestBed.tick();

      expect(el().querySelectorAll('tr.clickable-row').length).toBe(1);
      expect(el().querySelector('tr.totals-row')).toBeTruthy();
      expect(el().textContent).toContain('Story One');
    });

    it('renders the vocabulary summary, one row per category', async () => {
      const { http, el } = await navigate(`/${TEST_PAIR}/vocabulary/summary`);
      http.expectOne(url('vocabulary.json')).flush(vocabulary);
      TestBed.tick();

      expect(el().querySelectorAll('tr.clickable-row').length).toBe(2);
      expect(el().textContent).toContain('Alpha');
      expect(el().textContent).toContain('Beta');
    });
  });

  describe('vocabulary category and decks', () => {
    it('renders a category word table', async () => {
      const { http, el } = await navigate(`/${TEST_PAIR}/category/alpha`);
      http.expectOne(url('vocabulary.json')).flush(vocabulary);
      TestBed.tick();

      expect(el().textContent).toContain('w1');
      expect(el().textContent).toContain('w2');
    });

    it('renders the memorize deck with the first card', async () => {
      const { http, el } = await navigate(`/${TEST_PAIR}/category/alpha/memorize`);
      http.expectOne(url('vocabulary.json')).flush(vocabulary);
      TestBed.tick();

      const text = el().textContent ?? '';
      expect(text).toMatch(/w1|w2/);
      expect(text).toContain('1 / 2');
    });

    it('renders the repeat deck showing the native side only', async () => {
      const { http, el } = await navigate(`/${TEST_PAIR}/category/alpha/repeat`);
      http.expectOne(url('vocabulary.json')).flush(vocabulary);
      TestBed.tick();

      const text = el().textContent ?? '';
      // The repeat deck prompts with the translation; the learner recalls the headword.
      expect(text).toMatch(/t1|t2/);
      expect(text).not.toMatch(/w1|w2/);
    });

    it('renders the memorized view', async () => {
      const { http, el } = await navigate(`/${TEST_PAIR}/vocabulary/memorized`);
      http.expectOne(url('vocabulary.json')).flush(vocabulary);
      TestBed.tick();

      expect(el()).toBeTruthy();
    });
  });

  describe('detail screens', () => {
    it('renders the story detail with its text', async () => {
      const { http, el } = await navigate(`/${TEST_PAIR}/stories/s1`);
      http.expectOne(url('stories-index.json')).flush({
        stories: [{ slug: 's1', title: 'Story One', paragraphs: 2, vocabCount: 1 }],
      });
      TestBed.tick();
      http.expectOne(url('stories/s1.json')).flush({
        slug: 's1',
        title: 'Story One',
        text: 'Story One\nA body paragraph that is long enough to be prose.',
        vocabulary: { alpha: [1] },
      });
      flushIfPending(http, 'vocabulary.json', vocabulary);
      TestBed.tick();

      expect(el().textContent).toContain('A body paragraph');
    });

    it('renders the drill detail with its word table', async () => {
      const { http, el } = await navigate(`/${TEST_PAIR}/drills/d1`);
      http.expectOne(url('drills-index.json')).flush({
        drills: [{ slug: 'd1', title: 'Drill One', wordCount: 1, patternCount: 1 }],
      });
      TestBed.tick();
      http.expectOne(url('drills/d1.json')).flush({
        slug: 'd1',
        title: 'Drill One',
        wordOrder: [{ category: 'alpha', n: 1 }],
        patterns: [{ target: 'tgt', native: 'nat' }],
      });
      flushIfPending(http, 'vocabulary.json', vocabulary);
      TestBed.tick();

      expect(el().textContent).toContain('Drill One');
      expect(el().textContent).toContain('w1');
    });

    it('renders the lesson detail and asks for its transcript', async () => {
      const { http, el } = await navigate(`/${TEST_PAIR}/lessons/l1`);
      http.expectOne(url('lessons-index.json')).flush({
        lessons: [{ slug: 'l1', title: 'Lesson One', wordCount: 1, patternCount: 1 }],
      });
      TestBed.tick();
      http.expectOne(url('lessons/l1.json')).flush({
        slug: 'l1',
        title: 'Lesson One',
        words: [{ category: 'alpha', target: 'w1', native: 'gloss' }],
        patterns: [{ target: 'tgt', native: 'nat' }],
      });
      flushIfPending(http, 'vocabulary.json', vocabulary);
      http.expectOne(url('lessons/l1.txt')).flush('A transcript line.');
      TestBed.tick();

      expect(el().textContent).toContain('Lesson One');
    });
  });

  describe('feature decks', () => {
    it('renders the drill memorize deck', async () => {
      const { http, el } = await navigate(`/${TEST_PAIR}/drills/d1/memorize`);
      http.expectOne(url('drills-index.json')).flush({
        drills: [{ slug: 'd1', title: 'Drill One', wordCount: 1, patternCount: 1 }],
      });
      TestBed.tick();
      http.expectOne(url('drills/d1.json')).flush({
        slug: 'd1',
        title: 'Drill One',
        wordOrder: [{ category: 'alpha', n: 1 }],
        patterns: [{ target: 'tgt', native: 'nat' }],
      });
      flushIfPending(http, 'vocabulary.json', vocabulary);
      TestBed.tick();

      expect(el().textContent).toContain('w1');
    });

    it('renders the drill patterns repeat deck', async () => {
      const { http, el } = await navigate(`/${TEST_PAIR}/drills/d1/patterns/repeat`);
      http.expectOne(url('drills-index.json')).flush({
        drills: [{ slug: 'd1', title: 'Drill One', wordCount: 1, patternCount: 1 }],
      });
      TestBed.tick();
      http.expectOne(url('drills/d1.json')).flush({
        slug: 'd1',
        title: 'Drill One',
        wordOrder: [{ category: 'alpha', n: 1 }],
        patterns: [{ target: 'pattern target', native: 'pattern native' }],
      });
      flushIfPending(http, 'vocabulary.json', vocabulary);
      TestBed.tick();

      expect(el().textContent).toContain('pattern target');
    });

    it('renders the lesson repeat deck', async () => {
      const { http, el } = await navigate(`/${TEST_PAIR}/lessons/l1/repeat`);
      http.expectOne(url('lessons-index.json')).flush({
        lessons: [{ slug: 'l1', title: 'Lesson One', wordCount: 1, patternCount: 1 }],
      });
      TestBed.tick();
      http.expectOne(url('lessons/l1.json')).flush({
        slug: 'l1',
        title: 'Lesson One',
        words: [{ category: 'alpha', target: 'w1', native: 'gloss' }],
        patterns: [],
      });
      flushIfPending(http, 'vocabulary.json', vocabulary);
      TestBed.tick();

      // The lesson's own gloss overrides the vocabulary translation, and the repeat deck shows
      // that native side rather than the headword.
      expect(el().textContent).toContain('gloss');
    });
  });
});
