import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Sidebar } from './Sidebar';
import type { FileNode } from '../types';

const mockFsService = {
  readDirectory: vi.fn(),
};

vi.mock('../services', () => ({
  getFileSystemService: () => mockFsService,
}));

function createFile(path: string): FileNode {
  return {
    name: path.split('/').pop() || path,
    kind: 'file',
    path,
    handle: { kind: 'file', name: path.split('/').pop() || path } as any,
  };
}

function createDirectory(path: string): FileNode {
  return {
    name: path.split('/').pop() || path,
    kind: 'directory',
    path,
    handle: { kind: 'directory', name: path.split('/').pop() || path } as any,
    childrenLoaded: false,
  };
}

describe('Sidebar', () => {
  const rootHandle = { kind: 'directory', name: 'workspace' } as FileSystemDirectoryHandle;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('filters file results in real time using fuzzy matching across nested directories', async () => {
    const docsDir = createDirectory('docs');
    const notesDir = createDirectory('notes');
    const onFileSelect = vi.fn();

    mockFsService.readDirectory.mockImplementation((_handle: unknown, path?: string) => {
      if (path === 'docs') {
        return Promise.resolve([
          createFile('docs/getting-started.md'),
          createFile('docs/guide-to-markdown.md'),
        ]);
      }

      if (path === 'notes') {
        return Promise.resolve([
          createFile('notes/meeting-log.md'),
        ]);
      }

      return Promise.resolve([]);
    });

    render(
      <Sidebar
        nodes={[docsDir, notesDir, createFile('readme.md')]}
        onCreateFile={vi.fn()}
        onFileSelect={onFileSelect}
        onNodesChange={vi.fn()}
        rootHandle={rootHandle}
      />
    );

    const search = screen.getByRole('searchbox', { name: 'Search files' });
    await userEvent.type(search, 'dgm');

    await waitFor(() => {
      expect(screen.getByText('docs/guide-to-markdown.md')).toBeInTheDocument();
    });

    expect(screen.queryByText('readme.md')).not.toBeInTheDocument();

    await userEvent.click(screen.getByText('docs/guide-to-markdown.md'));
    expect(onFileSelect).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'docs/guide-to-markdown.md' })
    );
  });

  it('shows an empty state when no files match the query', async () => {
    render(
      <Sidebar
        nodes={[createFile('readme.md')]}
        onCreateFile={vi.fn()}
        onFileSelect={vi.fn()}
        onNodesChange={vi.fn()}
        rootHandle={rootHandle}
      />
    );

    await userEvent.type(screen.getByRole('searchbox', { name: 'Search files' }), 'zzz');

    expect(screen.getByText('No matching files')).toBeInTheDocument();
  });

  it('can restrict search results to markdown files only', async () => {
    const docsDir = createDirectory('docs');

    mockFsService.readDirectory.mockImplementation((_handle: unknown, path?: string) => {
      if (path === 'docs') {
        return Promise.resolve([
          createFile('docs/getting-started.md'),
          createFile('docs/getting-started.txt'),
        ]);
      }

      return Promise.resolve([]);
    });

    render(
      <Sidebar
        nodes={[docsDir]}
        onCreateFile={vi.fn()}
        onFileSelect={vi.fn()}
        onNodesChange={vi.fn()}
        rootHandle={rootHandle}
      />
    );

    await userEvent.type(screen.getByRole('searchbox', { name: 'Search files' }), 'dgs');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Markdown only' }));

    await waitFor(() => {
      expect(screen.getByText('docs/getting-started.md')).toBeInTheDocument();
    });

    expect(screen.queryByText('docs/getting-started.txt')).not.toBeInTheDocument();
  });

  it('matches files through directory names, not just the file name', async () => {
    const docsDir = createDirectory('docs');

    mockFsService.readDirectory.mockImplementation((_handle: unknown, path?: string) => {
      if (path === 'docs') {
        return Promise.resolve([createFile('docs/getting-started.md')]);
      }

      return Promise.resolve([]);
    });

    render(
      <Sidebar
        nodes={[docsDir]}
        onCreateFile={vi.fn()}
        onFileSelect={vi.fn()}
        onNodesChange={vi.fn()}
        rootHandle={rootHandle}
      />
    );

    await userEvent.type(screen.getByRole('searchbox', { name: 'Search files' }), 'dgs');

    await waitFor(() => {
      expect(screen.getByText('docs/getting-started.md')).toBeInTheDocument();
    });
  });

  it('skips common generated directories when building the search index', async () => {
    const docsDir = createDirectory('docs');
    const nodeModulesDir = createDirectory('node_modules');

    mockFsService.readDirectory.mockImplementation((_handle: unknown, path?: string) => {
      if (path === 'docs') {
        return Promise.resolve([createFile('docs/getting-started.md')]);
      }

      if (path === 'node_modules') {
        return Promise.resolve([createFile('node_modules/react/index.js')]);
      }

      return Promise.resolve([]);
    });

    render(
      <Sidebar
        nodes={[docsDir, nodeModulesDir]}
        onCreateFile={vi.fn()}
        onFileSelect={vi.fn()}
        onNodesChange={vi.fn()}
        rootHandle={rootHandle}
      />
    );

    await userEvent.type(screen.getByRole('searchbox', { name: 'Search files' }), 'react');

    await waitFor(() => {
      expect(screen.getByText('No matching files')).toBeInTheDocument();
    });

    expect(screen.queryByText('node_modules/react/index.js')).not.toBeInTheDocument();
  });

  it('moves focus to the first search result when pressing ArrowDown in the search box', async () => {
    const docsDir = createDirectory('docs');

    mockFsService.readDirectory.mockImplementation((_handle: unknown, path?: string) => {
      if (path === 'docs') {
        return Promise.resolve([
          createFile('docs/getting-started.md'),
          createFile('docs/guide-to-markdown.md'),
        ]);
      }

      return Promise.resolve([]);
    });

    render(
      <Sidebar
        nodes={[docsDir]}
        onCreateFile={vi.fn()}
        onFileSelect={vi.fn()}
        onNodesChange={vi.fn()}
        rootHandle={rootHandle}
      />
    );

    const search = screen.getByRole('searchbox', { name: 'Search files' });
    await userEvent.type(search, 'dg');

    await waitFor(() => {
      expect(screen.getByText('docs/getting-started.md')).toBeInTheDocument();
    });

    search.focus();
    await userEvent.keyboard('{ArrowDown}');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /getting-started\.md/i })).toHaveFocus();
    });
  });

  it('creates a new file in the root directory when no folder is selected', async () => {
    const onCreateFile = vi.fn().mockResolvedValue(createFile('root.md'));

    render(
      <Sidebar
        nodes={[createFile('readme.md')]}
        onCreateFile={onCreateFile}
        onFileSelect={vi.fn()}
        onNodesChange={vi.fn()}
        rootHandle={rootHandle}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'New file' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'New file name' }), 'root.md');
    await userEvent.click(screen.getByRole('button', { name: 'Create file' }));

    await waitFor(() => {
      expect(onCreateFile).toHaveBeenCalledWith(null, 'root.md');
    });
  });

  it('creates a new file inside the selected directory', async () => {
    const docsDir = createDirectory('docs');
    const onCreateFile = vi.fn().mockResolvedValue(createFile('docs/notes.md'));

    render(
      <Sidebar
        nodes={[docsDir]}
        onCreateFile={onCreateFile}
        onFileSelect={vi.fn()}
        onNodesChange={vi.fn()}
        rootHandle={rootHandle}
      />
    );

    await userEvent.click(screen.getByText('docs'));
    await userEvent.click(screen.getByRole('button', { name: 'New file' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'New file name' }), 'notes.md');
    await userEvent.click(screen.getByRole('button', { name: 'Create file' }));

    await waitFor(() => {
      expect(onCreateFile).toHaveBeenCalledWith(expect.objectContaining({ path: 'docs' }), 'notes.md');
    });
  });
});
