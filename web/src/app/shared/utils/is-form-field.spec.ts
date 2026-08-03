import { isFormField } from './is-form-field';

/**
 * Characterization spec: locks in the `tagName`-only definition of "form field" used to suppress
 * keyboard shortcuts. Real jsdom elements and real dispatched events are used throughout.
 */
describe('isFormField', () => {
  /** Dispatches a real keydown on `el` and evaluates the predicate inside the listener. */
  function isFormFieldFor(el: Element, listenOn: EventTarget = el): boolean {
    let result: boolean | undefined;
    const listener = (event: Event) => {
      result = isFormField(event);
    };
    listenOn.addEventListener('keydown', listener);
    el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
    listenOn.removeEventListener('keydown', listener);
    if (result === undefined) throw new Error('keydown was never delivered');
    return result;
  }

  describe('form fields', () => {
    it('is true for an input', () => {
      expect(isFormFieldFor(document.createElement('input'))).toBe(true);
    });

    it('is true for a textarea', () => {
      expect(isFormFieldFor(document.createElement('textarea'))).toBe(true);
    });

    it('is true for an input regardless of its type attribute', () => {
      const el = document.createElement('input');
      el.type = 'checkbox';
      expect(isFormFieldFor(el)).toBe(true);
    });

    it('is true for a disabled input', () => {
      const el = document.createElement('input');
      el.disabled = true;
      expect(isFormFieldFor(el)).toBe(true);
    });
  });

  describe('non form fields', () => {
    it('is false for a div', () => {
      expect(isFormFieldFor(document.createElement('div'))).toBe(false);
    });

    it('is false for a button', () => {
      expect(isFormFieldFor(document.createElement('button'))).toBe(false);
    });

    it('is false for a select, even though it is a real form control', () => {
      // The check is tagName-only and lists just INPUT and TEXTAREA.
      expect(isFormFieldFor(document.createElement('select'))).toBe(false);
    });

    it('is false for a contenteditable div', () => {
      const el = document.createElement('div');
      el.setAttribute('contenteditable', 'true');
      expect(isFormFieldFor(el)).toBe(false);
    });
  });

  describe('missing target', () => {
    it('is false for an event that was never dispatched', () => {
      expect(isFormField(new KeyboardEvent('keydown'))).toBe(false);
    });

    it('is false for a plain Event with no target', () => {
      expect(isFormField(new Event('keydown'))).toBe(false);
    });
  });

  describe('target vs currentTarget', () => {
    it('follows event.target, so a bubbled input event is true on a div listener', () => {
      const wrapper = document.createElement('div');
      const input = document.createElement('input');
      wrapper.appendChild(input);
      expect(isFormFieldFor(input, wrapper)).toBe(true);
    });

    it('follows event.target, so a bubbled span event is false on an input listener', () => {
      const wrapper = document.createElement('input');
      const span = document.createElement('span');
      wrapper.appendChild(span);
      expect(isFormFieldFor(span, wrapper)).toBe(false);
    });

    it('is false when the target is the document itself', () => {
      let result: boolean | undefined;
      const listener = (event: Event) => {
        result = isFormField(event);
      };
      document.addEventListener('keydown', listener);
      document.dispatchEvent(new KeyboardEvent('keydown'));
      document.removeEventListener('keydown', listener);
      // `document` has no tagName, so the cast to HTMLElement yields undefined and the check fails.
      expect(result).toBe(false);
    });
  });
});
