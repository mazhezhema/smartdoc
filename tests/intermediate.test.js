import { describe, it, expect } from 'vitest';
import { textToIntermediate, intermediateToText } from '../js/intermediate.js';

describe('textToIntermediate', () => {
  it('short lines become headings', () => {
    const result = textToIntermediate('Chapter 1\nThis is a long paragraph that definitely exceeds forty characters in total length.');
    expect(result.sections[0]).toEqual({ type: 'heading', text: 'Chapter 1' });
    expect(result.sections[1]).toEqual({ type: 'paragraph', text: 'This is a long paragraph that definitely exceeds forty characters in total length.' });
  });

  it('skips empty lines', () => {
    const result = textToIntermediate('Hello\n\n\nWorld');
    expect(result.sections).toHaveLength(2);
  });

  it('uses first heading as title if no title given', () => {
    const result = textToIntermediate('My Title\nSome long content paragraph that goes beyond forty characters easily.');
    expect(result.title).toBe('My Title');
  });

  it('uses provided title', () => {
    const result = textToIntermediate('Heading\nBody text here that is long enough to be a paragraph with more than forty characters.', 'Custom Title');
    expect(result.title).toBe('Custom Title');
  });

  it('defaults to Untitled if no heading found', () => {
    const result = textToIntermediate('This is a very long paragraph that exceeds forty characters and nothing short enough for a heading.');
    expect(result.title).toBe('Untitled');
  });
});

describe('intermediateToText', () => {
  it('produces text with headings separated by newlines', () => {
    const inter = {
      title: 'Test',
      sections: [
        { type: 'heading', text: 'Chapter 1' },
        { type: 'paragraph', text: 'Hello world.' },
      ],
    };
    const text = intermediateToText(inter);
    expect(text).toContain('Chapter 1');
    expect(text).toContain('Hello world.');
  });

  it('round-trips through textToIntermediate', () => {
    const original = 'Title\nA longer body of text that is definitely over forty characters long for testing purposes.';
    const inter = textToIntermediate(original, 'Test');
    const text = intermediateToText(inter);
    expect(text).toContain('Title');
    expect(text).toContain('A longer body of text');
  });
});
