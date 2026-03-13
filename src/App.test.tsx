import React from 'react';
import { act, createEvent, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import type { FileNode, LoadFileResult } from './types';

const mockFsService = {
  mountWorkspace: vi.fn(),
  ensurePermission: vi.fn(),
  readDirectory: vi.fn(),
  readEditableFile: vi.fn(),
  createFile: vi.fn(),
  deleteFile: vi.fn(),
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
  Sidebar: ({ nodes, onFileSelect, onCreateFile, onDeleteFile }: any) => (
    <div>
      {nodes.map((node: FileNode) => (
        <div key={node.path}>
          <button onClick={() => onFileSelect(node)}>{node.name}</button>
          {node.kind === 'file' ? (
            <button onClick={() => onDeleteFile(node)}>Delete {node.name}</button>
          ) : null}
        </div>
      ))}
      <button onClick={() => onCreateFile(null, 'root.md')}>New File In Root</button>
      {nodes
        .filter((node: FileNode) => node.kind === 'directory')
        .map((node: FileNode) => (
          <button key={`create-${node.path}`} onClick={() => onCreateFile(node, 'child.md')}>
            New File In {node.name}
          </button>
        ))}
    </div>
  ),
}));

vi.mock('./components/EditorRouter', () => ({
  EditorRouter: ({ activeFile, onDirty, onSave }: any) => (
    <div>
      <div data-testid="active-path">{activeFile.node.path}</div>
      {activeFile.state.kind === 'text' ? (
        <div data-testid="active-content">{activeFile.state.content}</div>
      ) : null}
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
    mockFsService.createFile.mockImplementation((_handle: unknown, currentPath: string, name: string) =>
      Promise.resolve(createFileNode(currentPath ? `${currentPath}/${name}` : name))
    );
    mockFsService.deleteFile.mockResolvedValue(undefined);
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

  it('creates a new file in the root directory when no folder is selected', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Open Folder' }));
    await screen.findByRole('button', { name: alphaNode.name });

    await user.click(screen.getByRole('button', { name: 'New File In Root' }));

    expect(mockFsService.createFile).toHaveBeenCalledWith(rootHandle, '', 'root.md');

    await waitFor(() => {
      expect(screen.getByTestId('active-path')).toHaveTextContent('root.md');
    });
  });

  it('creates a new file inside the selected folder', async () => {
    const docsNode: FileNode = {
      name: 'docs',
      kind: 'directory',
      path: 'docs',
      handle: { kind: 'directory', name: 'docs', path: 'docs' } as any,
      childrenLoaded: false,
    };
    mockFsService.readDirectory.mockResolvedValue([docsNode]);

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Open Folder' }));
    await screen.findByRole('button', { name: 'docs' });

    await user.click(screen.getByRole('button', { name: 'New File In docs' }));

    expect(mockFsService.createFile).toHaveBeenCalledWith(docsNode.handle, 'docs', 'child.md');

    await waitFor(() => {
      expect(screen.getByTestId('active-path')).toHaveTextContent('docs/child.md');
    });
  });

  it('deletes a file from the workspace and clears the editor when that file was open', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Open Folder' }));
    await screen.findByRole('button', { name: alphaNode.name });

    await user.click(screen.getByRole('button', { name: alphaNode.name }));
    await waitFor(() => {
      expect(screen.getByTestId('active-path')).toHaveTextContent(alphaNode.path);
    });

    await user.click(screen.getByRole('button', { name: `Delete ${alphaNode.name}` }));

    expect(mockFsService.deleteFile).toHaveBeenCalledWith(rootHandle, alphaNode.path);
    expect(screen.queryByTestId('active-path')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: alphaNode.name })).not.toBeInTheDocument();
  });

  it('lets the user resize the sidebar by dragging the divider', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Open Folder' }));
    await screen.findByRole('button', { name: alphaNode.name });

    const workspaceShell = screen.getByTestId('workspace-shell');
    const resizeHandle = screen.getByRole('separator', { name: 'Resize sidebar' });

    expect(workspaceShell).toHaveStyle({ gridTemplateColumns: '300px 14px minmax(0, 1fr)' });

    act(() => {
      resizeHandle.dispatchEvent(new PointerEvent('pointerdown', { clientX: 300, bubbles: true }));
      window.dispatchEvent(new PointerEvent('pointermove', { clientX: 420, bubbles: true }));
      window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    });

    expect(workspaceShell).toHaveStyle({ gridTemplateColumns: '420px 14px minmax(0, 1fr)' });
  });

  it('prevents the browser save shortcut', () => {
    render(<App />);

    const saveEvent = createEvent.keyDown(window, { key: 's', metaKey: true });
    window.dispatchEvent(saveEvent);

    expect(saveEvent.defaultPrevented).toBe(true);
  });

  it('reloads the active file when requested and there are no local edits', async () => {
    mockFsService.readEditableFile
      .mockResolvedValueOnce(createTextState(alphaNode.path, 'alpha'))
      .mockResolvedValueOnce(createTextState(alphaNode.path, 'alpha updated elsewhere'));

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Open Folder' }));
    await screen.findByRole('button', { name: alphaNode.name });
    await user.click(screen.getByRole('button', { name: alphaNode.name }));

    expect(screen.getByTestId('active-content')).toHaveTextContent('alpha');

    await user.click(screen.getByRole('button', { name: 'Reload workspace' }));

    await waitFor(() => {
      expect(screen.getByTestId('active-content')).toHaveTextContent('alpha updated elsewhere');
    });
  });

  it('reloads the mounted tree when files are added externally', async () => {
    const gammaNode = createFileNode('gamma.txt');
    mockFsService.readDirectory
      .mockResolvedValueOnce([alphaNode, betaNode])
      .mockResolvedValueOnce([alphaNode, betaNode, gammaNode]);

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Open Folder' }));
    await screen.findByRole('button', { name: alphaNode.name });
    expect(screen.getByRole('button', { name: alphaNode.name })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: gammaNode.name })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reload workspace' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: gammaNode.name })).toBeInTheDocument();
    });
  });
});
