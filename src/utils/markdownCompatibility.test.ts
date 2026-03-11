import { describe, it, expect } from 'vitest';
import { normalizeComparableMarkdown } from './markdownCompatibility';

describe('normalizeComparableMarkdown', () => {
  it('normalizes CRLF to LF', () => {
    expect(normalizeComparableMarkdown('line1\r\nline2')).toBe('line1\nline2');
  });

  it('trims trailing whitespace on lines', () => {
    expect(normalizeComparableMarkdown('line1 \nline2\t\nline3  ')).toBe('line1\nline2\nline3');
  });

  it('trims the end of the file', () => {
    expect(normalizeComparableMarkdown('line1\n\n\n')).toBe('line1');
  });
});
