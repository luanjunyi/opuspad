import React from 'react';
import { act, createEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import type { FileNode, LoadFileResult } from './types';

const mockFsService = {
  mountWorkspace: vi.fn(),
  ensurePermission: vi.fn(),
  readDirectory: vi.fn(),
  readEditableFile: vi.fn(),
  writeFile: vi.fn(),
};

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function createFileNode(path: string): FileNode {
  return {
    name: path.split('/').pop() || path,
    kind: 'file',
    path,
    handle: { kind: 'file', name: path.split('/').pop() || path, path } as any,
  };
}

function createTextState(path: string, content: string): LoadFileResult {
  return {
    kind: 'text',
    path,
    content,
    editor: 'text',
  };
}

vi.mock('./services', () => ({
  getFileSystemService: () => mockFsService,
}));

vi.mock('./components/Sidebar', () => ({
  Sidebar: ({ nodes, onFileSelect }: any) => (
    <div>
      {nodes.map((node: FileNode) => (
        <button key={node.path} onClick={() => onFileSelect(node)}>
          {node.name}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('./components/EditorRouter', () => ({
  EditorRouter: ({ activeFile, onDirty, onSave }: any) => (
    <div>
      <div data-testid="active-path">{activeFile.node.path}</div>
      <button onClick={() => onDirty()}>Dirty</button>
      <button onClick={() => onSave(`saved:${activeFile.node.path}`)}>Save</button>
    </div>
  ),
}));

describe('App', () => {
  const rootHandle = { kind: 'directory', name: 'root' } as FileSystemDirectoryHandle;
  const alphaNode = createFileNode('alpha.txt');
  const betaNode = createFileNode('beta.txt');

  beforeEach(() => {
    vi.clearAllMocks();
    mockFsService.mountWorkspace.mockResolvedValue(rootHandle);
    mockFsService.ensurePermission.mockResolvedValue(true);
    mockFsService.readDirectory.mockResolvedValue([alphaNode, betaNode]);
    mockFsService.readEditableFile.mockResolvedValue(createTextState(alphaNode.path, 'alpha'));
    mockFsService.writeFile.mockResolvedValue(undefined);
    window.history.replaceState({}, '', '/');
  });

  it('renders headline', () => {
    render(<App />);
    expect(screen.getByText('OpusPad')).toBeInTheDocument();
    expect(screen.getByText('Bridging AI output and human intent, WYSIWYG, private, local only.')).toBeInTheDocument();
  });

  it('ignores stale file-load results when a newer selection finishes first', async () => {
    const alphaLoad = createDeferred<LoadFileResult>();
    const betaLoad = createDeferred<LoadFileResult>();
    mockFsService.readEditableFile.mockImplementation((_handle: unknown, path: string) => {
      if (path === alphaNode.path) return alphaLoad.promise;
      if (path === betaNode.path) return betaLoad.promise;
      throw new Error(`Unexpected path ${path}`);
    });

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Open Folder' }));
    await screen.findByRole('button', { name: alphaNode.name });

    await user.click(screen.getByRole('button', { name: alphaNode.name }));
    await user.click(screen.getByRole('button', { name: betaNode.name }));

    await act(async () => {
      betaLoad.resolve(createTextState(betaNode.path, 'beta'));
      await betaLoad.promise;
    });

    await waitFor(() => {
      expect(screen.getByTestId('active-path')).toHaveTextContent(betaNode.path);
    });

    await act(async () => {
      alphaLoad.resolve(createTextState(alphaNode.path, 'alpha'));
      await alphaLoad.promise;
    });

    expect(screen.getByTestId('active-path')).toHaveTextContent(betaNode.path);
  });

  it('does not restore the previously saved file after switching while the write is in flight', async () => {
    const writeDeferred = createDeferred<void>();
    mockFsService.readEditableFile.mockImplementation((_handle: unknown, path: string) =>
      Promise.resolve(createTextState(path, path))
    );
    mockFsService.writeFile.mockImplementation(() => writeDeferred.promise);

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Open Folder' }));
    await screen.findByRole('button', { name: alphaNode.name });

    await user.click(screen.getByRole('button', { name: alphaNode.name }));
    await waitFor(() => {
      expect(screen.getByTestId('active-path')).toHaveTextContent(alphaNode.path);
    });

    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(mockFsService.writeFile).toHaveBeenCalledWith(alphaNode.handle, `saved:${alphaNode.path}`);

    await user.click(screen.getByRole('button', { name: betaNode.name }));
    await waitFor(() => {
      expect(screen.getByTestId('active-path')).toHaveTextContent(betaNode.path);
    });

    await act(async () => {
      writeDeferred.resolve();
      await writeDeferred.promise;
    });

    expect(screen.getByTestId('active-path')).toHaveTextContent(betaNode.path);
  });

  it('shows persistent save state badges for clean and dirty files', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Open Folder' }));
    await screen.findByRole('button', { name: alphaNode.name });
    await user.click(screen.getByRole('button', { name: alphaNode.name }));

    await waitFor(() => {
      expect(screen.getByText('All changes saved')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Dirty' }));
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
  });

  it('prevents the browser save shortcut', () => {
    render(<App />);

    const saveEvent = createEvent.keyDown(window, { key: 's', metaKey: true });
    window.dispatchEvent(saveEvent);

    expect(saveEvent.defaultPrevented).toBe(true);
  });
});
