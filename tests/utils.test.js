import { describe, it, expect } from 'vitest';
import { getExtension, isSupportedFormat, needsBackend, escapeHtml, baseName } from '../js/utils.js';

describe('getExtension', () => {
  it('extracts pdf extension', () => {
    expect(getExtension('book.pdf')).toBe('pdf');
  });
  it('extracts epub extension', () => {
    expect(getExtension('novel.epub')).toBe('epub');
  });
  it('handles uppercase', () => {
    expect(getExtension('FILE.MOBI')).toBe('mobi');
  });
  it('handles multiple dots', () => {
    expect(getExtension('my.book.azw3')).toBe('azw3');
  });
  it('returns empty for no extension', () => {
    expect(getExtension('noext')).toBe('');
  });
});

describe('isSupportedFormat', () => {
  it('returns true for pdf', () => expect(isSupportedFormat('pdf')).toBe(true));
  it('returns true for epub', () => expect(isSupportedFormat('epub')).toBe(true));
  it('returns true for txt', () => expect(isSupportedFormat('txt')).toBe(true));
  it('returns true for mobi', () => expect(isSupportedFormat('mobi')).toBe(true));
  it('returns true for azw3', () => expect(isSupportedFormat('azw3')).toBe(true));
  it('returns false for doc', () => expect(isSupportedFormat('doc')).toBe(false));
  it('returns false for docx', () => expect(isSupportedFormat('docx')).toBe(false));
});

describe('needsBackend', () => {
  it('mobi needs backend', () => expect(needsBackend('mobi')).toBe(true));
  it('azw3 needs backend', () => expect(needsBackend('azw3')).toBe(true));
  it('epub does not need backend', () => expect(needsBackend('epub')).toBe(false));
  it('pdf does not need backend', () => expect(needsBackend('pdf')).toBe(false));
  it('txt does not need backend', () => expect(needsBackend('txt')).toBe(false));
});

describe('escapeHtml', () => {
  it('escapes angle brackets', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
  });
  it('escapes ampersand', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });
  it('escapes quotes', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
  });
  it('leaves normal text unchanged', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });
});

describe('baseName', () => {
  it('removes extension', () => {
    expect(baseName('book.pdf')).toBe('book');
  });
  it('removes only last extension', () => {
    expect(baseName('my.book.epub')).toBe('my.book');
  });
  it('handles no extension', () => {
    expect(baseName('noext')).toBe('noext');
  });
});
