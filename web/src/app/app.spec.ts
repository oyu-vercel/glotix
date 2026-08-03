import { TestBed } from '@angular/core/testing';

import { App } from './app';
import { flushLanguages, testProviders, verifyNoOutstandingRequests } from '../testing/setup';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: testProviders(),
    }).compileComponents();
  });

  afterEach(() => {
    verifyNoOutstandingRequests();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    flushLanguages();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(App);
    flushLanguages();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.app-title')?.textContent).toContain('Glotix');
  });
});
