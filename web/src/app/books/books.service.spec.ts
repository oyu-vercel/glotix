import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';

import { BooksService } from './books.service';
import {
  Book,
  BookIndex,
  BookIndexEntry,
  ChapterEntry,
  ChapterResolved,
  ChapterVocabFile,
} from './books.types';
import { Category, VocabRefs, Vocabulary, Word } from '../vocabulary/vocabulary.types';
import {
  OTHER_PAIR,
  StubLanguageService,
  TEST_PAIR,
  provideStubLanguage,
  testProviders,
  verifyNoOutstandingRequests,
} from '../../testing/setup';

/**
 * Characterization spec: locks in the three-level index → manifest → chapter fetch order, the
 * text/vocab pair a chapter is assembled from and the per-pair caches of `BooksService` before its
 * internals are refactored. Everything here describes what the code does today, not what it
 * arguably should do.
 */
describe('BooksService', () => {
  const indexUrl = (pair: string) => `/assets/${pair}/books-index.json`;
  const bookUrl = (pair: string, book: string) => `/assets/${pair}/books/${book}.json`;
  const textUrl = (pair: string, book: string, file: string) =>
    `/assets/${pair}/books/${book}/${file}`;
  const refsUrl = (pair: string, book: string, chapter: string) =>
    `/assets/${pair}/books/${book}/${chapter}.vocab.json`;
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

  function bookIndexEntry(slug: string): BookIndexEntry {
    return { slug, name: `${slug} name`, chapters: 2 };
  }

  function bookIndex(...slugs: string[]): BookIndex {
    return { books: slugs.map(bookIndexEntry) };
  }

  /** `file` is stored separately from `slug`, so the text URL is not derivable from the slug. */
  function chapterEntry(slug: string, file = `${slug}.txt`): ChapterEntry {
    return { slug, name: `${slug} name`, file, vocabCount: 2 };
  }

  function book(slug: string, chapters: ChapterEntry[]): Book {
    return { slug, name: `${slug} name`, chapters };
  }

  function vocabFile(vocabulary: VocabRefs): ChapterVocabFile {
    return { vocabulary };
  }

  function setup(initialPair = TEST_PAIR) {
    TestBed.configureTestingModule({
      providers: [...testProviders(), ...provideStubLanguage(initialPair)],
    });
    return {
      service: TestBed.inject(BooksService),
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
      const body = bookIndex('b1', 'b2');

      let emitted: BookIndex | undefined;
      service.index$.subscribe((i) => (emitted = i));
      http.expectOne(indexUrl(TEST_PAIR)).flush(body);

      expect(emitted).toEqual(body);
    });

    it('fetches the other pair index after the pair switches', () => {
      const { service, http, language } = setup();
      const other = bookIndex('b9');

      let emitted: BookIndex | undefined;
      service.index$.subscribe((i) => (emitted = i));
      http.expectOne(indexUrl(TEST_PAIR)).flush(bookIndex('b1'));

      language.setPair(OTHER_PAIR);
      http.expectOne(indexUrl(OTHER_PAIR)).flush(other);

      expect(emitted).toEqual(other);
    });

    it('does not refetch the index when the pair switches away and back', () => {
      const { service, http, language } = setup();

      service.index$.subscribe();
      http.expectOne(indexUrl(TEST_PAIR)).flush(bookIndex('b1'));

      language.setPair(OTHER_PAIR);
      http.expectOne(indexUrl(OTHER_PAIR)).flush(bookIndex('b9'));

      language.setPair(TEST_PAIR);
      http.expectNone(indexUrl(TEST_PAIR));
    });
  });

  describe('getBook', () => {
    it('fetches the manifest once the index confirms the slug', () => {
      const { service, http } = setup();
      const body = book('b1', [chapterEntry('c1')]);

      let emitted: Book | undefined;
      service.getBook('b1').subscribe((b) => (emitted = b));

      // The manifest request must not be issued before the index answers.
      http.expectNone(bookUrl(TEST_PAIR, 'b1'));
      http.expectOne(indexUrl(TEST_PAIR)).flush(bookIndex('b1'));

      http.expectOne(bookUrl(TEST_PAIR, 'b1')).flush(body);
      expect(emitted).toEqual(body);
    });

    it('emits undefined and issues no manifest request for a slug not in the index', () => {
      const { service, http } = setup();

      const emissions: (Book | undefined)[] = [];
      service.getBook('missing').subscribe((b) => emissions.push(b));
      http.expectOne(indexUrl(TEST_PAIR)).flush(bookIndex('b1', 'b2'));

      expect(emissions).toEqual([undefined]);
      http.expectNone(bookUrl(TEST_PAIR, 'missing'));
    });

    it('builds the manifest URL from the active pair', () => {
      const { service, http } = setup(OTHER_PAIR);

      service.getBook('b1').subscribe();
      http.expectOne(indexUrl(OTHER_PAIR)).flush(bookIndex('b1'));
      http.expectOne(bookUrl(OTHER_PAIR, 'b1')).flush(book('b1', []));
    });

    it('issues one manifest request for two getBook() calls on the same slug', () => {
      const { service, http } = setup();

      service.getBook('b1').subscribe();
      service.getBook('b1').subscribe();

      const indexRequests = http.match(indexUrl(TEST_PAIR));
      expect(indexRequests.length).toBe(1);
      indexRequests[0].flush(bookIndex('b1'));

      const bookRequests = http.match(bookUrl(TEST_PAIR, 'b1'));
      expect(bookRequests.length).toBe(1);
      bookRequests[0].flush(book('b1', []));
    });

    it('caches the same slug per pair', () => {
      const { service, http, language } = setup();

      service.getBook('b1').subscribe();
      http.expectOne(indexUrl(TEST_PAIR)).flush(bookIndex('b1'));
      http.expectOne(bookUrl(TEST_PAIR, 'b1')).flush(book('b1', []));

      language.setPair(OTHER_PAIR);
      service.getBook('b1').subscribe();
      http.expectOne(indexUrl(OTHER_PAIR)).flush(bookIndex('b1'));
      http.expectOne(bookUrl(OTHER_PAIR, 'b1')).flush(book('b1', []));
    });
  });

  describe('getChapter', () => {
    it('walks index → manifest → text + refs → vocabulary', () => {
      const { service, http } = setup();

      let resolved: ChapterResolved | undefined;
      service.getChapter('b1', 'c1').subscribe((c) => (resolved = c));

      http.expectOne(indexUrl(TEST_PAIR)).flush(bookIndex('b1'));
      http.expectNone(textUrl(TEST_PAIR, 'b1', 'c1.txt'));

      http.expectOne(bookUrl(TEST_PAIR, 'b1')).flush(book('b1', [chapterEntry('c1')]));

      http.expectOne(textUrl(TEST_PAIR, 'b1', 'c1.txt')).flush('c1 text');
      http.expectOne(refsUrl(TEST_PAIR, 'b1', 'c1')).flush(vocabFile({ alpha: [2], beta: [3, 4] }));
      http.expectOne(vocabUrl(TEST_PAIR)).flush(sampleVocabulary());

      expect(resolved).toEqual({
        bookSlug: 'b1',
        bookName: 'b1 name',
        slug: 'c1',
        name: 'c1 name',
        text: 'c1 text',
        vocabulary: {
          categories: [
            { key: 'alpha', label: 'alpha label', words: [word(2, 'w2')] },
            { key: 'beta', label: 'beta label', words: [word(3, 'w3'), word(4, 'w4')] },
          ],
        },
      });
    });

    it('asks for the chapter body as text and for the refs as JSON', () => {
      const { service, http } = setup();

      service.getChapter('b1', 'c1').subscribe();
      http.expectOne(indexUrl(TEST_PAIR)).flush(bookIndex('b1'));
      http.expectOne(bookUrl(TEST_PAIR, 'b1')).flush(book('b1', [chapterEntry('c1')]));

      const text = http.expectOne(textUrl(TEST_PAIR, 'b1', 'c1.txt'));
      const refs = http.expectOne(refsUrl(TEST_PAIR, 'b1', 'c1'));
      expect(text.request.responseType).toBe('text');
      expect(text.request.method).toBe('GET');
      expect(refs.request.responseType).toBe('json');

      text.flush('c1 text');
      refs.flush(vocabFile({ alpha: [1] }));
      http.expectOne(vocabUrl(TEST_PAIR)).flush(sampleVocabulary());
    });

    it('takes the text URL from the manifest `file` but the refs URL from the chapter slug', () => {
      const { service, http } = setup();

      let resolved: ChapterResolved | undefined;
      service.getChapter('b1', 'c1').subscribe((c) => (resolved = c));

      http.expectOne(indexUrl(TEST_PAIR)).flush(bookIndex('b1'));
      http
        .expectOne(bookUrl(TEST_PAIR, 'b1'))
        .flush(book('b1', [chapterEntry('c1', 'chapter-one.txt')]));

      http.expectOne(textUrl(TEST_PAIR, 'b1', 'chapter-one.txt')).flush('c1 text');
      http.expectOne(refsUrl(TEST_PAIR, 'b1', 'c1')).flush(vocabFile({ alpha: [1] }));
      http.expectOne(vocabUrl(TEST_PAIR)).flush(sampleVocabulary());

      expect(resolved?.text).toBe('c1 text');
    });

    it('drops categories the chapter does not reference', () => {
      const { service, http } = setup();

      let resolved: ChapterResolved | undefined;
      service.getChapter('b1', 'c1').subscribe((c) => (resolved = c));

      http.expectOne(indexUrl(TEST_PAIR)).flush(bookIndex('b1'));
      http.expectOne(bookUrl(TEST_PAIR, 'b1')).flush(book('b1', [chapterEntry('c1')]));
      http.expectOne(textUrl(TEST_PAIR, 'b1', 'c1.txt')).flush('c1 text');
      http.expectOne(refsUrl(TEST_PAIR, 'b1', 'c1')).flush(vocabFile({ beta: [3] }));
      http.expectOne(vocabUrl(TEST_PAIR)).flush(sampleVocabulary());

      expect(resolved?.vocabulary.categories.map((c) => c.key)).toEqual(['beta']);
    });

    it('emits undefined and fetches nothing further for a book not in the index', () => {
      const { service, http } = setup();

      const emissions: (ChapterResolved | undefined)[] = [];
      service.getChapter('missing', 'c1').subscribe((c) => emissions.push(c));
      http.expectOne(indexUrl(TEST_PAIR)).flush(bookIndex('b1'));

      expect(emissions).toEqual([undefined]);
      http.expectNone(bookUrl(TEST_PAIR, 'missing'));
      http.expectNone(textUrl(TEST_PAIR, 'missing', 'c1.txt'));
      http.expectNone(refsUrl(TEST_PAIR, 'missing', 'c1'));
      http.expectNone(vocabUrl(TEST_PAIR));
    });

    it('emits undefined and fetches nothing further for a chapter not in the manifest', () => {
      const { service, http } = setup();

      const emissions: (ChapterResolved | undefined)[] = [];
      service.getChapter('b1', 'missing').subscribe((c) => emissions.push(c));
      http.expectOne(indexUrl(TEST_PAIR)).flush(bookIndex('b1'));
      http.expectOne(bookUrl(TEST_PAIR, 'b1')).flush(book('b1', [chapterEntry('c1')]));

      expect(emissions).toEqual([undefined]);
      http.expectNone(textUrl(TEST_PAIR, 'b1', 'missing.txt'));
      http.expectNone(refsUrl(TEST_PAIR, 'b1', 'missing'));
      http.expectNone(vocabUrl(TEST_PAIR));
    });

    it('issues one text and one refs request for two getChapter() calls on the same chapter', () => {
      const { service, http } = setup();

      service.getChapter('b1', 'c1').subscribe();
      service.getChapter('b1', 'c1').subscribe();

      http.expectOne(indexUrl(TEST_PAIR)).flush(bookIndex('b1'));
      http.expectOne(bookUrl(TEST_PAIR, 'b1')).flush(book('b1', [chapterEntry('c1')]));

      const textRequests = http.match(textUrl(TEST_PAIR, 'b1', 'c1.txt'));
      expect(textRequests.length).toBe(1);
      textRequests[0].flush('c1 text');

      const refsRequests = http.match(refsUrl(TEST_PAIR, 'b1', 'c1'));
      expect(refsRequests.length).toBe(1);
      refsRequests[0].flush(vocabFile({ alpha: [1] }));

      http.expectOne(vocabUrl(TEST_PAIR)).flush(sampleVocabulary());
    });

    it('replays the cached chapter to a subscriber that arrives after the responses', () => {
      const { service, http } = setup();

      service.getChapter('b1', 'c1').subscribe();
      http.expectOne(indexUrl(TEST_PAIR)).flush(bookIndex('b1'));
      http.expectOne(bookUrl(TEST_PAIR, 'b1')).flush(book('b1', [chapterEntry('c1')]));
      http.expectOne(textUrl(TEST_PAIR, 'b1', 'c1.txt')).flush('c1 text');
      http.expectOne(refsUrl(TEST_PAIR, 'b1', 'c1')).flush(vocabFile({ alpha: [1] }));
      http.expectOne(vocabUrl(TEST_PAIR)).flush(sampleVocabulary());

      let late: ChapterResolved | undefined;
      service.getChapter('b1', 'c1').subscribe((c) => (late = c));
      expect(late?.slug).toBe('c1');
      http.expectNone(indexUrl(TEST_PAIR));
      http.expectNone(bookUrl(TEST_PAIR, 'b1'));
      http.expectNone(textUrl(TEST_PAIR, 'b1', 'c1.txt'));
      http.expectNone(refsUrl(TEST_PAIR, 'b1', 'c1'));
      http.expectNone(vocabUrl(TEST_PAIR));
    });

    it('fetches a second chapter of the same book without refetching the manifest', () => {
      const { service, http } = setup();

      service.getChapter('b1', 'c1').subscribe();
      http.expectOne(indexUrl(TEST_PAIR)).flush(bookIndex('b1'));
      http
        .expectOne(bookUrl(TEST_PAIR, 'b1'))
        .flush(book('b1', [chapterEntry('c1'), chapterEntry('c2')]));
      http.expectOne(textUrl(TEST_PAIR, 'b1', 'c1.txt')).flush('c1 text');
      http.expectOne(refsUrl(TEST_PAIR, 'b1', 'c1')).flush(vocabFile({ alpha: [1] }));
      http.expectOne(vocabUrl(TEST_PAIR)).flush(sampleVocabulary());

      service.getChapter('b1', 'c2').subscribe();
      http.expectNone(indexUrl(TEST_PAIR));
      http.expectNone(bookUrl(TEST_PAIR, 'b1'));
      http.expectOne(textUrl(TEST_PAIR, 'b1', 'c2.txt')).flush('c2 text');
      http.expectOne(refsUrl(TEST_PAIR, 'b1', 'c2')).flush(vocabFile({ beta: [3] }));
      http.expectNone(vocabUrl(TEST_PAIR));
    });

    it('caches the same chapter per pair', () => {
      const { service, http, language } = setup();

      service.getChapter('b1', 'c1').subscribe();
      http.expectOne(indexUrl(TEST_PAIR)).flush(bookIndex('b1'));
      http.expectOne(bookUrl(TEST_PAIR, 'b1')).flush(book('b1', [chapterEntry('c1')]));
      http.expectOne(textUrl(TEST_PAIR, 'b1', 'c1.txt')).flush('c1 text');
      http.expectOne(refsUrl(TEST_PAIR, 'b1', 'c1')).flush(vocabFile({ alpha: [1] }));
      http.expectOne(vocabUrl(TEST_PAIR)).flush(sampleVocabulary());

      language.setPair(OTHER_PAIR);
      service.getChapter('b1', 'c1').subscribe();
      http.expectOne(indexUrl(OTHER_PAIR)).flush(bookIndex('b1'));
      http.expectOne(bookUrl(OTHER_PAIR, 'b1')).flush(book('b1', [chapterEntry('c1')]));
      http.expectOne(textUrl(OTHER_PAIR, 'b1', 'c1.txt')).flush('c1 text');
      http.expectOne(refsUrl(OTHER_PAIR, 'b1', 'c1')).flush(vocabFile({ alpha: [1] }));
      http.expectOne(vocabUrl(OTHER_PAIR)).flush(sampleVocabulary());
    });
  });

  describe('getChapterSignal', () => {
    it('exposes the resolved chapter once every request is answered', () => {
      const { service, http } = setup();
      const bookSlug = signal('b1');
      const chapterSlug = signal('c1');
      const chapter = TestBed.runInInjectionContext(() =>
        service.getChapterSignal(bookSlug, chapterSlug),
      );

      TestBed.tick();
      expect(chapter()).toBeUndefined();

      http.expectOne(indexUrl(TEST_PAIR)).flush(bookIndex('b1'));
      http.expectOne(bookUrl(TEST_PAIR, 'b1')).flush(book('b1', [chapterEntry('c1')]));
      http.expectOne(textUrl(TEST_PAIR, 'b1', 'c1.txt')).flush('c1 text');
      http.expectOne(refsUrl(TEST_PAIR, 'b1', 'c1')).flush(vocabFile({ alpha: [1] }));
      http.expectOne(vocabUrl(TEST_PAIR)).flush(sampleVocabulary());

      expect(chapter()?.name).toBe('c1 name');
      expect(chapter()?.text).toBe('c1 text');
      expect(chapter()?.vocabulary.categories.map((c) => c.key)).toEqual(['alpha']);
    });

    it('follows the chapter slug signal', () => {
      const { service, http } = setup();
      const bookSlug = signal('b1');
      const chapterSlug = signal('c1');
      const chapter = TestBed.runInInjectionContext(() =>
        service.getChapterSignal(bookSlug, chapterSlug),
      );

      TestBed.tick();
      http.expectOne(indexUrl(TEST_PAIR)).flush(bookIndex('b1'));
      http
        .expectOne(bookUrl(TEST_PAIR, 'b1'))
        .flush(book('b1', [chapterEntry('c1'), chapterEntry('c2')]));
      http.expectOne(textUrl(TEST_PAIR, 'b1', 'c1.txt')).flush('c1 text');
      http.expectOne(refsUrl(TEST_PAIR, 'b1', 'c1')).flush(vocabFile({ alpha: [1] }));
      http.expectOne(vocabUrl(TEST_PAIR)).flush(sampleVocabulary());

      chapterSlug.set('c2');
      TestBed.tick();
      http.expectOne(textUrl(TEST_PAIR, 'b1', 'c2.txt')).flush('c2 text');
      http.expectOne(refsUrl(TEST_PAIR, 'b1', 'c2')).flush(vocabFile({ beta: [3] }));

      expect(chapter()?.slug).toBe('c2');
      expect(chapter()?.vocabulary.categories.map((c) => c.key)).toEqual(['beta']);
    });

    it('becomes undefined for a chapter that is not in the manifest', () => {
      const { service, http } = setup();
      const bookSlug = signal('b1');
      const chapterSlug = signal('missing');
      const chapter = TestBed.runInInjectionContext(() =>
        service.getChapterSignal(bookSlug, chapterSlug),
      );

      TestBed.tick();
      http.expectOne(indexUrl(TEST_PAIR)).flush(bookIndex('b1'));
      http.expectOne(bookUrl(TEST_PAIR, 'b1')).flush(book('b1', [chapterEntry('c1')]));

      expect(chapter()).toBeUndefined();
      http.expectNone(textUrl(TEST_PAIR, 'b1', 'missing.txt'));
      http.expectNone(refsUrl(TEST_PAIR, 'b1', 'missing'));
    });
  });

  describe('getChapterCategorySignal', () => {
    it('returns the matching category of the resolved chapter', () => {
      const { service, http } = setup();
      const bookSlug = signal('b1');
      const chapterSlug = signal('c1');
      const key = signal('alpha');
      const category$ = TestBed.runInInjectionContext(() =>
        service.getChapterCategorySignal(bookSlug, chapterSlug, key),
      );

      TestBed.tick();
      http.expectOne(indexUrl(TEST_PAIR)).flush(bookIndex('b1'));
      http.expectOne(bookUrl(TEST_PAIR, 'b1')).flush(book('b1', [chapterEntry('c1')]));
      http.expectOne(textUrl(TEST_PAIR, 'b1', 'c1.txt')).flush('c1 text');
      http.expectOne(refsUrl(TEST_PAIR, 'b1', 'c1')).flush(vocabFile({ alpha: [1], beta: [3] }));
      http.expectOne(vocabUrl(TEST_PAIR)).flush(sampleVocabulary());

      expect(category$()?.key).toBe('alpha');
      expect(category$()?.label).toBe('alpha label');
      expect(category$()?.words).toEqual([word(1, 'w1')]);
    });

    it('follows the key signal without refetching', () => {
      const { service, http } = setup();
      const bookSlug = signal('b1');
      const chapterSlug = signal('c1');
      const key = signal('alpha');
      const category$ = TestBed.runInInjectionContext(() =>
        service.getChapterCategorySignal(bookSlug, chapterSlug, key),
      );

      TestBed.tick();
      http.expectOne(indexUrl(TEST_PAIR)).flush(bookIndex('b1'));
      http.expectOne(bookUrl(TEST_PAIR, 'b1')).flush(book('b1', [chapterEntry('c1')]));
      http.expectOne(textUrl(TEST_PAIR, 'b1', 'c1.txt')).flush('c1 text');
      http.expectOne(refsUrl(TEST_PAIR, 'b1', 'c1')).flush(vocabFile({ alpha: [1], beta: [3] }));
      http.expectOne(vocabUrl(TEST_PAIR)).flush(sampleVocabulary());

      key.set('beta');
      TestBed.tick();
      expect(category$()?.key).toBe('beta');
      http.expectNone(textUrl(TEST_PAIR, 'b1', 'c1.txt'));
      http.expectNone(vocabUrl(TEST_PAIR));
    });

    it('returns undefined for a key the resolved chapter dropped', () => {
      const { service, http } = setup();
      const bookSlug = signal('b1');
      const chapterSlug = signal('c1');
      const key = signal('beta');
      const category$ = TestBed.runInInjectionContext(() =>
        service.getChapterCategorySignal(bookSlug, chapterSlug, key),
      );

      TestBed.tick();
      http.expectOne(indexUrl(TEST_PAIR)).flush(bookIndex('b1'));
      http.expectOne(bookUrl(TEST_PAIR, 'b1')).flush(book('b1', [chapterEntry('c1')]));
      http.expectOne(textUrl(TEST_PAIR, 'b1', 'c1.txt')).flush('c1 text');
      http.expectOne(refsUrl(TEST_PAIR, 'b1', 'c1')).flush(vocabFile({ alpha: [1] }));
      http.expectOne(vocabUrl(TEST_PAIR)).flush(sampleVocabulary());

      expect(category$()).toBeUndefined();
    });

    it('returns undefined when the book is not in the index', () => {
      const { service, http } = setup();
      const bookSlug = signal('missing');
      const chapterSlug = signal('c1');
      const key = signal('alpha');
      const category$ = TestBed.runInInjectionContext(() =>
        service.getChapterCategorySignal(bookSlug, chapterSlug, key),
      );

      TestBed.tick();
      http.expectOne(indexUrl(TEST_PAIR)).flush(bookIndex('b1'));

      expect(category$()).toBeUndefined();
      http.expectNone(bookUrl(TEST_PAIR, 'missing'));
    });
  });
});
