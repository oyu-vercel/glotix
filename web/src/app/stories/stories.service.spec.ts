import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';

import { StoriesService } from './stories.service';
import { Story, StoryIndex, StoryIndexEntry, StoryResolved } from './stories.types';
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
 * Characterization spec: locks in the index/story/vocabulary fetch order and the per-pair caches of
 * `StoriesService` before its internals are refactored. Everything here describes what the code
 * does today, not what it arguably should do.
 */
describe('StoriesService', () => {
  const indexUrl = (pair: string) => `/assets/${pair}/stories-index.json`;
  const storyUrl = (pair: string, slug: string) => `/assets/${pair}/stories/${slug}.json`;
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

  function indexEntry(slug: string): StoryIndexEntry {
    return { slug, title: `${slug} title`, paragraphs: 2, vocabCount: 4 };
  }

  function storyIndex(...slugs: string[]): StoryIndex {
    return { stories: slugs.map(indexEntry) };
  }

  function story(slug: string, vocabulary: Record<string, number[]>): Story {
    return { slug, title: `${slug} title`, text: `${slug} text`, vocabulary };
  }

  function setup(initialPair = TEST_PAIR) {
    TestBed.configureTestingModule({
      providers: [...testProviders(), ...provideStubLanguage(initialPair)],
    });
    return {
      service: TestBed.inject(StoriesService),
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
      const body = storyIndex('s1', 's2');

      let emitted: StoryIndex | undefined;
      service.index$.subscribe((i) => (emitted = i));
      http.expectOne(indexUrl(TEST_PAIR)).flush(body);

      expect(emitted).toEqual(body);
    });

    it('fetches the other pair index after the pair switches', () => {
      const { service, http, language } = setup();
      const other = storyIndex('s9');

      let emitted: StoryIndex | undefined;
      service.index$.subscribe((i) => (emitted = i));
      http.expectOne(indexUrl(TEST_PAIR)).flush(storyIndex('s1'));

      language.setPair(OTHER_PAIR);
      http.expectOne(indexUrl(OTHER_PAIR)).flush(other);

      expect(emitted).toEqual(other);
    });

    it('does not refetch the index when the pair switches away and back', () => {
      const { service, http, language } = setup();

      service.index$.subscribe();
      http.expectOne(indexUrl(TEST_PAIR)).flush(storyIndex('s1'));

      language.setPair(OTHER_PAIR);
      http.expectOne(indexUrl(OTHER_PAIR)).flush(storyIndex('s9'));

      language.setPair(TEST_PAIR);
      http.expectNone(indexUrl(TEST_PAIR));
    });
  });

  describe('getStory', () => {
    it('fetches the story JSON once the index confirms the slug', () => {
      const { service, http } = setup();
      const body = story('s1', { alpha: [1] });

      let emitted: Story | undefined;
      service.getStory('s1').subscribe((s) => (emitted = s));

      // The story request must not be issued before the index answers.
      http.expectNone(storyUrl(TEST_PAIR, 's1'));
      http.expectOne(indexUrl(TEST_PAIR)).flush(storyIndex('s1'));

      http.expectOne(storyUrl(TEST_PAIR, 's1')).flush(body);
      expect(emitted).toEqual(body);
    });

    it('emits undefined and issues no story request for a slug not in the index', () => {
      const { service, http } = setup();

      const emissions: (Story | undefined)[] = [];
      service.getStory('missing').subscribe((s) => emissions.push(s));
      http.expectOne(indexUrl(TEST_PAIR)).flush(storyIndex('s1', 's2'));

      expect(emissions).toEqual([undefined]);
      http.expectNone(storyUrl(TEST_PAIR, 'missing'));
    });

    it('builds the story URL from the active pair', () => {
      const { service, http } = setup(OTHER_PAIR);

      service.getStory('s1').subscribe();
      http.expectOne(indexUrl(OTHER_PAIR)).flush(storyIndex('s1'));
      http.expectOne(storyUrl(OTHER_PAIR, 's1')).flush(story('s1', {}));
    });
  });

  describe('caching', () => {
    it('issues one index and one story request for two getStory() calls on the same slug', () => {
      const { service, http } = setup();

      service.getStory('s1').subscribe();
      service.getStory('s1').subscribe();

      const indexRequests = http.match(indexUrl(TEST_PAIR));
      expect(indexRequests.length).toBe(1);
      indexRequests[0].flush(storyIndex('s1'));

      const storyRequests = http.match(storyUrl(TEST_PAIR, 's1'));
      expect(storyRequests.length).toBe(1);
      storyRequests[0].flush(story('s1', { alpha: [1] }));
    });

    it('replays the cached story to a subscriber that arrives after the response', () => {
      const { service, http } = setup();
      const body = story('s1', { alpha: [1] });

      service.getStory('s1').subscribe();
      http.expectOne(indexUrl(TEST_PAIR)).flush(storyIndex('s1'));
      http.expectOne(storyUrl(TEST_PAIR, 's1')).flush(body);

      let late: Story | undefined;
      service.getStory('s1').subscribe((s) => (late = s));
      expect(late).toEqual(body);
      http.expectNone(storyUrl(TEST_PAIR, 's1'));
    });

    it('fetches a second slug separately', () => {
      const { service, http } = setup();

      service.getStory('s1').subscribe();
      http.expectOne(indexUrl(TEST_PAIR)).flush(storyIndex('s1', 's2'));
      http.expectOne(storyUrl(TEST_PAIR, 's1')).flush(story('s1', {}));

      service.getStory('s2').subscribe();
      http.expectNone(indexUrl(TEST_PAIR));
      http.expectOne(storyUrl(TEST_PAIR, 's2')).flush(story('s2', {}));
    });

    it('caches the same slug per pair', () => {
      const { service, http, language } = setup();

      service.getStory('s1').subscribe();
      http.expectOne(indexUrl(TEST_PAIR)).flush(storyIndex('s1'));
      http.expectOne(storyUrl(TEST_PAIR, 's1')).flush(story('s1', {}));

      language.setPair(OTHER_PAIR);
      service.getStory('s1').subscribe();
      http.expectOne(indexUrl(OTHER_PAIR)).flush(storyIndex('s1'));
      http.expectOne(storyUrl(OTHER_PAIR, 's1')).flush(story('s1', {}));
    });
  });

  describe('getStoryResolved', () => {
    it('joins the story refs against the pair vocabulary', () => {
      const { service, http } = setup();

      let resolved: StoryResolved | undefined;
      service.getStoryResolved('s1').subscribe((r) => (resolved = r));

      http.expectOne(indexUrl(TEST_PAIR)).flush(storyIndex('s1'));
      http.expectOne(storyUrl(TEST_PAIR, 's1')).flush(story('s1', { alpha: [2], beta: [3, 4] }));
      http.expectOne(vocabUrl(TEST_PAIR)).flush(sampleVocabulary());

      expect(resolved).toEqual({
        slug: 's1',
        title: 's1 title',
        text: 's1 text',
        vocabulary: {
          categories: [
            { key: 'alpha', label: 'alpha label', words: [word(2, 'w2')] },
            { key: 'beta', label: 'beta label', words: [word(3, 'w3'), word(4, 'w4')] },
          ],
        },
      });
    });

    it('drops categories the story does not reference', () => {
      const { service, http } = setup();

      let resolved: StoryResolved | undefined;
      service.getStoryResolved('s1').subscribe((r) => (resolved = r));

      http.expectOne(indexUrl(TEST_PAIR)).flush(storyIndex('s1'));
      http.expectOne(storyUrl(TEST_PAIR, 's1')).flush(story('s1', { beta: [3] }));
      http.expectOne(vocabUrl(TEST_PAIR)).flush(sampleVocabulary());

      expect(resolved?.vocabulary.categories.map((c) => c.key)).toEqual(['beta']);
    });

    it('emits undefined and fetches neither story nor vocabulary for an unknown slug', () => {
      const { service, http } = setup();

      const emissions: (StoryResolved | undefined)[] = [];
      service.getStoryResolved('missing').subscribe((r) => emissions.push(r));
      http.expectOne(indexUrl(TEST_PAIR)).flush(storyIndex('s1'));

      expect(emissions).toEqual([undefined]);
      http.expectNone(storyUrl(TEST_PAIR, 'missing'));
      http.expectNone(vocabUrl(TEST_PAIR));
    });

    it('does not refetch anything for a second call on the same slug', () => {
      const { service, http } = setup();

      service.getStoryResolved('s1').subscribe();
      http.expectOne(indexUrl(TEST_PAIR)).flush(storyIndex('s1'));
      http.expectOne(storyUrl(TEST_PAIR, 's1')).flush(story('s1', { alpha: [1] }));
      http.expectOne(vocabUrl(TEST_PAIR)).flush(sampleVocabulary());

      let late: StoryResolved | undefined;
      service.getStoryResolved('s1').subscribe((r) => (late = r));
      expect(late?.slug).toBe('s1');
      http.expectNone(indexUrl(TEST_PAIR));
      http.expectNone(storyUrl(TEST_PAIR, 's1'));
      http.expectNone(vocabUrl(TEST_PAIR));
    });
  });

  describe('getStoryResolvedSignal', () => {
    it('exposes the resolved story once every request is answered', () => {
      const { service, http } = setup();
      const slug = signal('s1');
      const resolved = TestBed.runInInjectionContext(() => service.getStoryResolvedSignal(slug));

      TestBed.tick();
      expect(resolved()).toBeUndefined();

      http.expectOne(indexUrl(TEST_PAIR)).flush(storyIndex('s1'));
      http.expectOne(storyUrl(TEST_PAIR, 's1')).flush(story('s1', { alpha: [1] }));
      http.expectOne(vocabUrl(TEST_PAIR)).flush(sampleVocabulary());

      expect(resolved()?.title).toBe('s1 title');
      expect(resolved()?.vocabulary.categories.map((c) => c.key)).toEqual(['alpha']);
    });

    it('follows the slug signal', () => {
      const { service, http } = setup();
      const slug = signal('s1');
      const resolved = TestBed.runInInjectionContext(() => service.getStoryResolvedSignal(slug));

      TestBed.tick();
      http.expectOne(indexUrl(TEST_PAIR)).flush(storyIndex('s1', 's2'));
      http.expectOne(storyUrl(TEST_PAIR, 's1')).flush(story('s1', { alpha: [1] }));
      http.expectOne(vocabUrl(TEST_PAIR)).flush(sampleVocabulary());

      slug.set('s2');
      TestBed.tick();
      http.expectOne(storyUrl(TEST_PAIR, 's2')).flush(story('s2', { beta: [3] }));

      expect(resolved()?.slug).toBe('s2');
      expect(resolved()?.vocabulary.categories.map((c) => c.key)).toEqual(['beta']);
    });

    it('becomes undefined for a slug that is not in the index', () => {
      const { service, http } = setup();
      const slug = signal('missing');
      const resolved = TestBed.runInInjectionContext(() => service.getStoryResolvedSignal(slug));

      TestBed.tick();
      http.expectOne(indexUrl(TEST_PAIR)).flush(storyIndex('s1'));

      expect(resolved()).toBeUndefined();
      http.expectNone(storyUrl(TEST_PAIR, 'missing'));
    });
  });

  describe('getStoryCategorySignal', () => {
    it('returns the matching category of the resolved story', () => {
      const { service, http } = setup();
      const slug = signal('s1');
      const key = signal('alpha');
      const category$ = TestBed.runInInjectionContext(() =>
        service.getStoryCategorySignal(slug, key),
      );

      TestBed.tick();
      http.expectOne(indexUrl(TEST_PAIR)).flush(storyIndex('s1'));
      http.expectOne(storyUrl(TEST_PAIR, 's1')).flush(story('s1', { alpha: [1], beta: [3] }));
      http.expectOne(vocabUrl(TEST_PAIR)).flush(sampleVocabulary());

      expect(category$()?.key).toBe('alpha');
      expect(category$()?.words).toEqual([word(1, 'w1')]);
    });

    it('follows the key signal without refetching', () => {
      const { service, http } = setup();
      const slug = signal('s1');
      const key = signal('alpha');
      const category$ = TestBed.runInInjectionContext(() =>
        service.getStoryCategorySignal(slug, key),
      );

      TestBed.tick();
      http.expectOne(indexUrl(TEST_PAIR)).flush(storyIndex('s1'));
      http.expectOne(storyUrl(TEST_PAIR, 's1')).flush(story('s1', { alpha: [1], beta: [3] }));
      http.expectOne(vocabUrl(TEST_PAIR)).flush(sampleVocabulary());

      key.set('beta');
      TestBed.tick();
      expect(category$()?.key).toBe('beta');
      http.expectNone(vocabUrl(TEST_PAIR));
    });

    it('returns undefined for a key the resolved story dropped', () => {
      const { service, http } = setup();
      const slug = signal('s1');
      const key = signal('beta');
      const category$ = TestBed.runInInjectionContext(() =>
        service.getStoryCategorySignal(slug, key),
      );

      TestBed.tick();
      http.expectOne(indexUrl(TEST_PAIR)).flush(storyIndex('s1'));
      http.expectOne(storyUrl(TEST_PAIR, 's1')).flush(story('s1', { alpha: [1] }));
      http.expectOne(vocabUrl(TEST_PAIR)).flush(sampleVocabulary());

      expect(category$()).toBeUndefined();
    });

    it('returns undefined when the slug is not in the index', () => {
      const { service, http } = setup();
      const slug = signal('missing');
      const key = signal('alpha');
      const category$ = TestBed.runInInjectionContext(() =>
        service.getStoryCategorySignal(slug, key),
      );

      TestBed.tick();
      http.expectOne(indexUrl(TEST_PAIR)).flush(storyIndex('s1'));

      expect(category$()).toBeUndefined();
      http.expectNone(storyUrl(TEST_PAIR, 'missing'));
    });
  });
});
