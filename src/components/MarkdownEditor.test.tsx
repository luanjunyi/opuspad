import React from 'react';
import { act, createEvent, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MarkdownEditor } from './MarkdownEditor';
import type { ActiveFile } from '../types';

type MockBlock = { type: string; id?: string };

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function createActiveFile(path: string, content: string): ActiveFile {
  return {
    node: {
      name: path.split('/').pop() || path,
      kind: 'file',
      path,
      handle: { kind: 'file', name: path.split('/').pop() || path, path } as any,
    },
    state: {
      kind: 'text',
      path,
      content,
      editor: 'markdown',
    },
  };
}

function createMockEditor(id: string, parsePromise: Promise<MockBlock[]>) {
  const editor: {
    id: string;
    document: MockBlock[];
    tryParseMarkdownToBlocks: ReturnType<typeof vi.fn>;
    replaceBlocks: ReturnType<typeof vi.fn>;
    blocksToMarkdownLossy: ReturnType<typeof vi.fn>;
  } = {
    id,
    document: [{ type: 'doc', id }],
    tryParseMarkdownToBlocks: vi.fn(() => parsePromise),
    replaceBlocks: vi.fn((document: MockBlock[], blocks: MockBlock[]) => {
      editor.document = blocks.length > 0 ? blocks : document;
    }),
    blocksToMarkdownLossy: vi.fn().mockResolvedValue(`serialized:${id}`),
  };
  return editor;
}

const { blockNoteCreate } = vi.hoisted(() => ({
  blockNoteCreate: vi.fn(),
}));

vi.mock('@blocknote/core', () => ({
  BlockNoteEditor: {
    create: blockNoteCreate,
  },
}));

vi.mock('@blocknote/mantine', () => ({
  BlockNoteView: ({ editor, onChange }: any) => (
    <div>
      <button data-testid="blocknote-view" data-editor-id={editor.id} onClick={() => onChange()}>
        {editor.id}
      </button>
      <div data-testid="blocknote-content" contentEditable suppressContentEditableWarning>
        editor-content-{editor.id}
      </div>
    </div>
  ),
}));

describe('MarkdownEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces markdown saves by 500ms', async () => {
    vi.useFakeTimers();
    const editor = createMockEditor('editor-1', Promise.resolve([{ type: 'paragraph' }]));
    blockNoteCreate.mockReturnValue(editor);
    const onSave = vi.fn();

    render(<MarkdownEditor activeFile={createActiveFile('notes.md', '# hello')} onSave={onSave} onOpenInSourceMode={vi.fn()} />);

    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByTestId('blocknote-view')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('blocknote-view'));
    fireEvent.click(screen.getByTestId('blocknote-view'));
    fireEvent.click(screen.getByTestId('blocknote-view'));

    expect(onSave).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(499);
    });
    expect(onSave).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith('serialized:editor-1');
  });

  it('flushes pending markdown changes when the editor unmounts before debounce completes', async () => {
    vi.useFakeTimers();
    const editor = createMockEditor('editor-1', Promise.resolve([{ type: 'paragraph' }]));
    blockNoteCreate.mockReturnValue(editor);
    const onSave = vi.fn();

    const { unmount } = render(
      <MarkdownEditor
        activeFile={createActiveFile('notes.md', '# hello')}
        onSave={onSave}
        onOpenInSourceMode={vi.fn()}
      />
    );

    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.click(screen.getByTestId('blocknote-view'));
    expect(onSave).not.toHaveBeenCalled();

    unmount();

    await act(async () => {
      await Promise.resolve();
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith('serialized:editor-1');
  });

  it('clears the previous editor while a new markdown file is loading', async () => {
    const firstEditor = createMockEditor('editor-1', Promise.resolve([{ type: 'paragraph' }]));
    const secondLoad = createDeferred<MockBlock[]>();
    const secondEditor = createMockEditor('editor-2', secondLoad.promise);
    blockNoteCreate.mockReturnValueOnce(firstEditor).mockReturnValueOnce(secondEditor);

    const { rerender } = render(
      <MarkdownEditor
        activeFile={createActiveFile('first.md', '# first')}
        onSave={vi.fn()}
        onOpenInSourceMode={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('blocknote-view')).toHaveTextContent('editor-1');
    });

    rerender(<MarkdownEditor activeFile={createActiveFile('second.md', '# second')} onSave={vi.fn()} onOpenInSourceMode={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Loading editor...')).toBeInTheDocument();
    });
    expect(screen.queryByText('editor-1')).not.toBeInTheDocument();

    await act(async () => {
      secondLoad.resolve([{ type: 'heading' }]);
      await secondLoad.promise;
    });

    await waitFor(() => {
      expect(screen.getByTestId('blocknote-view')).toHaveTextContent('editor-2');
    });
  });

  it('ignores late editor loads from a previously selected file', async () => {
    const firstLoad = createDeferred<MockBlock[]>();
    const firstEditor = createMockEditor('editor-1', firstLoad.promise);
    const secondEditor = createMockEditor('editor-2', Promise.resolve([{ type: 'paragraph' }]));
    blockNoteCreate.mockReturnValueOnce(firstEditor).mockReturnValueOnce(secondEditor);

    const { rerender } = render(
      <MarkdownEditor
        activeFile={createActiveFile('first.md', '# first')}
        onSave={vi.fn()}
        onOpenInSourceMode={vi.fn()}
      />
    );

    rerender(<MarkdownEditor activeFile={createActiveFile('second.md', '# second')} onSave={vi.fn()} onOpenInSourceMode={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('blocknote-view')).toHaveTextContent('editor-2');
    });

    await act(async () => {
      firstLoad.resolve([{ type: 'heading' }]);
      await firstLoad.promise;
    });

    expect(screen.getByTestId('blocknote-view')).toHaveTextContent('editor-2');
    expect(screen.queryByText('editor-1')).not.toBeInTheDocument();
  });

  it('does not recreate the editor when only the save callback changes', async () => {
    const editor = createMockEditor('editor-1', Promise.resolve([{ type: 'paragraph' }]));
    blockNoteCreate.mockReturnValue(editor);

    const { rerender } = render(
      <MarkdownEditor
        activeFile={createActiveFile('notes.md', '# hello')}
        onSave={vi.fn()}
        onOpenInSourceMode={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('blocknote-view')).toHaveTextContent('editor-1');
    });

    rerender(
      <MarkdownEditor
        activeFile={createActiveFile('notes.md', '# hello')}
        onSave={vi.fn()}
        onOpenInSourceMode={vi.fn()}
      />
    );

    expect(blockNoteCreate).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('blocknote-view')).toHaveTextContent('editor-1');
  });

  it('keeps space input working inside the rich editor content', async () => {
    const editor = createMockEditor('editor-1', Promise.resolve([{ type: 'paragraph' }]));
    blockNoteCreate.mockReturnValue(editor);

    render(
      <MarkdownEditor
        activeFile={createActiveFile('notes.md', '# hello')}
        onSave={vi.fn()}
        onOpenInSourceMode={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('blocknote-content')).toBeInTheDocument();
    });

    const spaceEvent = createEvent.keyDown(screen.getByTestId('blocknote-content'), { key: ' ' });
    fireEvent(screen.getByTestId('blocknote-content'), spaceEvent);

    expect(spaceEvent.defaultPrevented).toBe(false);
  });
});
