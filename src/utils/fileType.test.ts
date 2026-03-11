import { describe, it, expect } from 'vitest';
import { isMarkdownPath, isLikelyBinary } from './fileType';

describe('isMarkdownPath', () => {
  it('returns true for .md files', () => {
    expect(isMarkdownPath('test.md')).toBe(true);
    expect(isMarkdownPath('path/to/test.MD')).toBe(true);
  });

  it('returns true for .markdown files', () => {
    expect(isMarkdownPath('test.markdown')).toBe(true);
  });

  it('returns false for other files', () => {
    expect(isMarkdownPath('test.txt')).toBe(false);
    expect(isMarkdownPath('test.json')).toBe(false);
    expect(isMarkdownPath('test')).toBe(false);
  });
});

describe('isLikelyBinary', () => {
  it('returns false for regular text', () => {
    const encoder = new TextEncoder();
    const buffer = encoder.encode('Hello World').buffer;
    expect(isLikelyBinary(buffer)).toBe(false);
  });

  it('returns true if null byte is present', () => {
    const buffer = new Uint8Array([0x68, 0x65, 0x6c, 0x00, 0x6f]).buffer;
    expect(isLikelyBinary(buffer)).toBe(true);
  });
});
