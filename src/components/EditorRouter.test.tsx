import React from 'react';
import { render, screen } from '@testing-library/react';
import { EditorRouter } from './EditorRouter';
import { describe, it, expect, vi } from 'vitest';
import { ActiveFile } from '../types';

// Mock the MarkdownEditor since BlockNote uses document/window heavily
vi.mock('./MarkdownEditor', () => ({
  MarkdownEditor: () => <div data-testid="markdown-editor">Mock Markdown Editor</div>
}));

describe('EditorRouter', () => {
  it('renders TextEditor for text files', () => {
    const file: ActiveFile = {
      node: { name: 'test.json', kind: 'file', path: 'test.json', handle: null },
      state: { kind: 'text', path: 'test.json', content: 'test', editor: 'text' }
    };
    render(<EditorRouter activeFile={file} onSave={vi.fn()} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument(); // CodeMirror uses role=textbox
  });

  it('renders MarkdownEditor for markdown files', () => {
    const file: ActiveFile = {
      node: { name: 'test.md', kind: 'file', path: 'test.md', handle: null },
      state: { kind: 'text', path: 'test.md', content: '# test', editor: 'markdown' }
    };
    render(<EditorRouter activeFile={file} onSave={vi.fn()} />);
    expect(screen.getByTestId('markdown-editor')).toBeInTheDocument();
  });
});
