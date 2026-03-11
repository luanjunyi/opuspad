import React from 'react';
import { act, createEvent, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TextEditor } from './TextEditor';
import type { ActiveFile } from '../types';
import { getSourceLanguage } from '../utils/sourceLanguage';

const codeMirrorMock = vi.hoisted(() => ({
  renderCodeMirror: vi.fn(),
}));

vi.mock('@uiw/react-codemirror', () => ({
  default: (props: any) => codeMirrorMock.renderCodeMirror(props),
}));

function createActiveFile(path: string, content: string): ActiveFile {
  return {
    node: { name: path.split('/').pop() || path, kind: 'file', path, handle: null },
    state: { kind: 'text', path, content, editor: 'text' },
  };
}

describe('TextEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    codeMirrorMock.renderCodeMirror.mockImplementation(({ value, onChange }: any) => (
      <textarea
        aria-label="Code editor"
        data-testid="code-editor"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    ));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders error state for binary files', () => {
    const activeFile: ActiveFile = {
      node: { name: 'img.png', kind: 'file', path: 'img.png', handle: null },
      state: { kind: 'error', path: 'img.png', reason: 'binary', message: 'Binary files cannot be edited' }
    };
    render(<TextEditor activeFile={activeFile} onSave={vi.fn()} onOpenInRichMode={vi.fn()} />);
    expect(screen.getByText('Unsupported File')).toBeInTheDocument();
    expect(screen.getByText('Binary files cannot be edited')).toBeInTheDocument();
  });

  it('renders warning if present', () => {
    const activeFile: ActiveFile = {
      node: { name: 'notes.md', kind: 'file', path: 'notes.md', handle: null },
      state: { kind: 'text', path: 'notes.md', content: 'test', editor: 'text', warning: 'Markdown warning', canOpenInRichMode: true }
    };
    render(<TextEditor activeFile={activeFile} onSave={vi.fn()} onOpenInRichMode={vi.fn()} />);
    expect(screen.getByText(/Markdown warning/)).toBeInTheDocument();
  });

  it('flushes pending source edits when the editor unmounts before debounce completes', async () => {
    vi.useFakeTimers();
    const onSave = vi.fn();
    const { unmount } = render(
      <TextEditor activeFile={createActiveFile('notes.md', 'hello')} onSave={onSave} onOpenInRichMode={vi.fn()} />
    );

    fireEvent.change(screen.getByTestId('code-editor'), { target: { value: 'hello world' } });
    expect(onSave).not.toHaveBeenCalled();

    unmount();

    await act(async () => {
      await Promise.resolve();
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith('hello world');
  });

  it('keeps space input working inside the source editor content', () => {
    render(<TextEditor activeFile={createActiveFile('notes.md', 'hello')} onSave={vi.fn()} onOpenInRichMode={vi.fn()} />);

    const spaceEvent = createEvent.keyDown(screen.getByTestId('code-editor'), { key: ' ' });
    fireEvent(screen.getByTestId('code-editor'), spaceEvent);

    expect(spaceEvent.defaultPrevented).toBe(false);
  });

  it('classifies source files for syntax highlighting', () => {
    expect(getSourceLanguage('notes.md')).toBe('markdown');
    expect(getSourceLanguage('data.json')).toBe('json');
    expect(getSourceLanguage('component.tsx')).toBe('tsx');
    expect(getSourceLanguage('server.ts')).toBe('typescript');
    expect(getSourceLanguage('script.jsx')).toBe('jsx');
    expect(getSourceLanguage('script.js')).toBe('javascript');
    expect(getSourceLanguage('README.txt')).toBe('plain');
  });
});
