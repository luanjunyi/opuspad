import React, { startTransition, useDeferredValue, useEffect, useRef, useState } from 'react';
import { FileNode } from '../types';
import { ChevronRight, ChevronDown, File, Folder, Plus, Search, Sparkles, X } from 'lucide-react';
import { getFileSystemService } from '../services';
import { fuzzyMatchPath, sortFuzzyMatches } from '../utils/fuzzySearch';
import { isMarkdownPath } from '../utils/fileType';

interface SidebarProps {
  nodes: FileNode[];
  onCreateFile: (directory: FileNode | null, fileName: string) => Promise<FileNode>;
  onFileSelect: (node: FileNode) => void;
  onNodesChange: (nodes: FileNode[]) => void;
  rootHandle: FileSystemDirectoryHandle | null;
}

const SEARCH_IGNORED_DIRECTORY_NAMES = new Set([
  '.git',
  '.next',
  '.nuxt',
  '.turbo',
  '.yarn',
  'build',
  'coverage',
  'dist',
  'node_modules',
]);
const SEARCH_INDEX_FLUSH_SIZE = 200;

export function Sidebar({
  nodes: initialNodes,
  onCreateFile,
  onFileSelect,
  onNodesChange,
  rootHandle,
}: SidebarProps) {
  const [nodes, setNodes] = useState<FileNode[]>(initialNodes);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [loadingPaths, setLoadingPaths] = useState<Set<string>>(new Set());
  const [selectedDirectoryPath, setSelectedDirectoryPath] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [markdownOnly, setMarkdownOnly] = useState(false);
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const hasActiveSearch = searchQuery.trim().length > 0;
  const [indexedFiles, setIndexedFiles] = useState<FileNode[]>([]);
  const [indexingState, setIndexingState] = useState<'idle' | 'indexing' | 'ready'>('idle');
  const [activeSearchResultIndex, setActiveSearchResultIndex] = useState<number | null>(null);
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const resultButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const updateNodes = (updater: (currentNodes: FileNode[]) => FileNode[]) => {
    setNodes((currentNodes) => {
      const nextNodes = updater(currentNodes);
      onNodesChange(nextNodes);
      return nextNodes;
    });
  };

  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes]);

  useEffect(() => {
    setIndexedFiles(collectSearchableFiles(initialNodes));
    setIndexingState('idle');
  }, [initialNodes]);

  useEffect(() => {
    if (!selectedDirectoryPath) {
      return;
    }

    if (!findNodeByPath(initialNodes, selectedDirectoryPath)) {
      setSelectedDirectoryPath(null);
    }
  }, [initialNodes, selectedDirectoryPath]);

  useEffect(() => {
    if (!rootHandle || !hasActiveSearch || indexingState !== 'idle') {
      return;
    }

    let cancelled = false;

    const indexWorkspace = async () => {
      setIndexingState('indexing');

      const fsService = getFileSystemService();
      const indexedByPath = new Map<string, FileNode>();
      let filesSinceLastFlush = 0;

      const flushIndexedFiles = () => {
        if (cancelled) {
          return;
        }

        const nextIndexedFiles = Array.from(indexedByPath.values());
        filesSinceLastFlush = 0;
        startTransition(() => {
          setIndexedFiles(nextIndexedFiles);
        });
      };

      const pushFiles = (entries: FileNode[]) => {
        for (const entry of entries) {
          if (entry.kind === 'file') {
            indexedByPath.set(entry.path, entry);
            filesSinceLastFlush += 1;
          }
        }

        if (filesSinceLastFlush >= SEARCH_INDEX_FLUSH_SIZE) {
          flushIndexedFiles();
        }
      };

      const walkDirectory = async (
        directoryHandle: FileSystemDirectoryHandle,
        currentPath?: string
      ) => {
        const entries = await fsService.readDirectory(directoryHandle, currentPath);
        pushFiles(entries);

        for (const entry of entries) {
          if (entry.kind === 'directory' && entry.handle && !shouldSkipSearchDirectory(entry)) {
            await walkDirectory(entry.handle as FileSystemDirectoryHandle, entry.path);
          }
        }
      };

      pushFiles(collectSearchableFiles(initialNodes));
      flushIndexedFiles();

      for (const node of initialNodes) {
        if (node.kind === 'directory' && node.handle && !shouldSkipSearchDirectory(node)) {
          await walkDirectory(node.handle as FileSystemDirectoryHandle, node.path);
        }
      }

      if (!cancelled) {
        flushIndexedFiles();
        setIndexingState('ready');
      }
    };

    indexWorkspace();

    return () => {
      cancelled = true;
    };
  }, [hasActiveSearch, initialNodes, rootHandle]);

  const trimmedSearchQuery = deferredSearchQuery.trim();
  const searchResults = trimmedSearchQuery
    ? sortFuzzyMatches(
        indexedFiles.flatMap((node) => {
          if (markdownOnly && !isMarkdownPath(node.path)) {
            return [];
          }

          const match = fuzzyMatchPath(node.path, trimmedSearchQuery);
          if (!match) {
            return [];
          }

          return [{ node, score: match.score }];
        })
      )
    : [];

  useEffect(() => {
    if (!trimmedSearchQuery) {
      setActiveSearchResultIndex(null);
      resultButtonRefs.current = [];
      return;
    }

    if (searchResults.length === 0) {
      setActiveSearchResultIndex(null);
      return;
    }

    setActiveSearchResultIndex((currentIndex) => {
      if (currentIndex === null) {
        return null;
      }

      return Math.min(currentIndex, searchResults.length - 1);
    });
  }, [searchResults, trimmedSearchQuery]);

  useEffect(() => {
    if (activeSearchResultIndex === null) {
      return;
    }

    resultButtonRefs.current[activeSearchResultIndex]?.focus();
  }, [activeSearchResultIndex]);

  const toggleDirectory = async (node: FileNode) => {
    const isExpanded = expandedPaths.has(node.path);
    const newExpanded = new Set(expandedPaths);
    
    if (isExpanded) {
      newExpanded.delete(node.path);
      setExpandedPaths(newExpanded);
    } else {
      newExpanded.add(node.path);
      setExpandedPaths(newExpanded);

      if (!node.childrenLoaded && rootHandle) {
        setLoadingPaths(prev => new Set(prev).add(node.path));
        const fsService = getFileSystemService();
        // Read directory children
        // In real FS, we should pass the directory handle. We assume the handle on node is it.
        const children = await fsService.readDirectory(node.handle as FileSystemDirectoryHandle, node.path);

        updateNodes((currentNodes) => replaceDirectoryChildren(currentNodes, node.path, children));
        
        setLoadingPaths(prev => {
          const next = new Set(prev);
          next.delete(node.path);
          return next;
        });
      }
    }
  };

  const handleCreateFile = async () => {
    const fileName = newFileName.trim();
    if (!fileName) {
      setCreateError('File name is required');
      return;
    }

    const selectedDirectory = selectedDirectoryPath
      ? findNodeByPath(nodes, selectedDirectoryPath)
      : null;

    if (selectedDirectoryPath && (!selectedDirectory || selectedDirectory.kind !== 'directory')) {
      setCreateError('Selected folder is no longer available');
      return;
    }

    try {
      setCreateError(null);
      const createdNode = await onCreateFile(
        selectedDirectory && selectedDirectory.kind === 'directory' ? selectedDirectory : null,
        fileName
      );
      updateNodes((currentNodes) => insertNodeIntoTree(currentNodes, selectedDirectoryPath, createdNode));
      setIsCreatingFile(false);
      setNewFileName('');
    } catch (error: any) {
      setCreateError(error.message || 'Failed to create file');
    }
  };

  const renderNode = (node: FileNode, depth: number = 0) => {
    const isExpanded = expandedPaths.has(node.path);
    const isLoading = loadingPaths.has(node.path);
    const isSelectedDirectory = node.kind === 'directory' && node.path === selectedDirectoryPath;

    return (
      <div key={node.path}>
        <div
          aria-selected={isSelectedDirectory}
          style={{ paddingLeft: `${depth * 14 + 16}px` }}
          onClick={() => {
            if (node.kind === 'directory') {
              setSelectedDirectoryPath(node.path);
              return;
            }

            onFileSelect(node);
          }}
          className={`sidebar-item${isSelectedDirectory ? ' sidebar-item--selected' : ''}`}
        >
          {node.kind === 'directory' ? (
            <button
              aria-label={isExpanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
              className="sidebar-item__toggle"
              onClick={(event) => {
                event.stopPropagation();
                void toggleDirectory(node);
              }}
              type="button"
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : (
             <span className="sidebar-item__spacer" />
          )}
          {node.kind === 'directory' ? <Folder size={14} /> : <File size={14} />}
          <span className="sidebar-item__label">{node.name}</span>
          {isLoading && <span className="sidebar-item__loading">loading</span>}
        </div>
        {isExpanded && node.children && (
          <div>
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="sidebar-shell">
      <div className="sidebar-shell__header">
        <p className="sidebar-shell__eyebrow">Workspace</p>
        <h2>{rootHandle ? rootHandle.name : 'Local files'}</h2>
        <button
          className="ghost-button sidebar-shell__action"
          onClick={() => {
            setCreateError(null);
            setIsCreatingFile((current) => !current);
          }}
          type="button"
        >
          <Plus aria-hidden="true" size={14} />
          <span>New file</span>
        </button>
        {isCreatingFile ? (
          <div className="sidebar-create">
            <p className="sidebar-create__target">
              Create in {selectedDirectoryPath ?? rootHandle?.name ?? 'root'}
            </p>
            <div className="sidebar-create__row">
              <input
                aria-label="New file name"
                className="sidebar-create__input"
                onChange={(event) => {
                  setNewFileName(event.target.value);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void handleCreateFile();
                  }

                  if (event.key === 'Escape') {
                    event.preventDefault();
                    setCreateError(null);
                    setIsCreatingFile(false);
                    setNewFileName('');
                  }
                }}
                placeholder="notes.md"
                type="text"
                value={newFileName}
              />
              <button className="ghost-button sidebar-create__button" onClick={() => void handleCreateFile()} type="button">
                Create file
              </button>
              <button
                aria-label="Cancel new file"
                className="ghost-button sidebar-create__icon"
                onClick={() => {
                  setCreateError(null);
                  setIsCreatingFile(false);
                  setNewFileName('');
                }}
                type="button"
              >
                <X aria-hidden="true" size={14} />
              </button>
            </div>
            {createError ? <p className="sidebar-create__error">{createError}</p> : null}
          </div>
        ) : null}
      </div>
      <div className="sidebar-search">
        <label className="sidebar-search__field" htmlFor="sidebar-file-search">
          <Search aria-hidden="true" size={15} />
          <input
            aria-label="Search files"
            className="sidebar-search__input"
            id="sidebar-file-search"
            onChange={(event) => {
              setSearchQuery(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown' && searchResults.length > 0) {
                event.preventDefault();
                setActiveSearchResultIndex(0);
              }
            }}
            placeholder="Search files by path"
            role="searchbox"
            type="search"
            value={searchQuery}
          />
        </label>
        <label className="sidebar-search__filter">
          <input
            checked={markdownOnly}
            onChange={(event) => {
              setMarkdownOnly(event.target.checked);
            }}
            type="checkbox"
          />
          <span>Markdown only</span>
        </label>
        {trimmedSearchQuery ? (
          <div className="sidebar-search__meta">
            <span>
              {searchResults.length} match{searchResults.length === 1 ? '' : 'es'}
            </span>
            {indexingState === 'indexing' ? (
              <span className="sidebar-search__status">
                <Sparkles aria-hidden="true" size={12} />
                Indexing workspace
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="sidebar-shell__content">
        {trimmedSearchQuery ? (
          searchResults.length > 0 ? (
            <div className="sidebar-search-results" role="list">
              {searchResults.map(({ node }, index) => (
                <button
                  aria-selected={activeSearchResultIndex === index}
                  className="sidebar-search-result"
                  key={node.path}
                  onFocus={() => {
                    setActiveSearchResultIndex(index);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowDown') {
                      event.preventDefault();
                      setActiveSearchResultIndex((currentIndex) => {
                        const baseIndex = currentIndex === null ? index : currentIndex;
                        return Math.min(baseIndex + 1, searchResults.length - 1);
                      });
                    }

                    if (event.key === 'ArrowUp') {
                      event.preventDefault();
                      if (index === 0) {
                        setActiveSearchResultIndex(null);
                        const searchInput = document.getElementById('sidebar-file-search');
                        if (searchInput instanceof HTMLInputElement) {
                          searchInput.focus();
                        }
                        return;
                      }

                      setActiveSearchResultIndex((currentIndex) => {
                        const baseIndex = currentIndex === null ? index : currentIndex;
                        return Math.max(baseIndex - 1, 0);
                      });
                    }
                  }}
                  onClick={() => onFileSelect(node as FileNode)}
                  ref={(element) => {
                    resultButtonRefs.current[index] = element;
                  }}
                  type="button"
                >
                  <File aria-hidden="true" size={14} />
                  <span className="sidebar-search-result__name">{node.name}</span>
                  <span className="sidebar-search-result__path">{node.path}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="sidebar-search-empty">
              <p className="sidebar-search-empty__title">No matching files</p>
              <p className="sidebar-search-empty__copy">
                Try part of the relative path or a looser fuzzy pattern.
              </p>
            </div>
          )
        ) : (
          nodes.map(n => renderNode(n))
        )}
      </div>
    </aside>
  );
}

function collectSearchableFiles(nodes: FileNode[]): FileNode[] {
  return nodes.flatMap((node) => {
    if (node.kind === 'file') {
      return [node];
    }

    if (shouldSkipSearchDirectory(node)) {
      return [];
    }

    if (!node.children) {
      return [];
    }

    return collectSearchableFiles(node.children);
  });
}

function shouldSkipSearchDirectory(node: Pick<FileNode, 'kind' | 'name'>): boolean {
  return node.kind === 'directory' && SEARCH_IGNORED_DIRECTORY_NAMES.has(node.name);
}

function findNodeByPath(nodes: FileNode[], path: string): FileNode | null {
  for (const node of nodes) {
    if (node.path === path) {
      return node;
    }

    if (node.children) {
      const nestedMatch = findNodeByPath(node.children, path);
      if (nestedMatch) {
        return nestedMatch;
      }
    }
  }

  return null;
}

function insertNodeIntoTree(
  nodes: FileNode[],
  directoryPath: string | null,
  nodeToInsert: FileNode
): FileNode[] {
  if (!directoryPath) {
    return sortFileNodes([...nodes, nodeToInsert]);
  }

  return nodes.map((node) => {
    if (node.path === directoryPath && node.kind === 'directory') {
      return {
        ...node,
        children: sortFileNodes([...(node.children ?? []), nodeToInsert]),
        childrenLoaded: true,
      };
    }

    if (!node.children) {
      return node;
    }

    return {
      ...node,
      children: insertNodeIntoTree(node.children, directoryPath, nodeToInsert),
    };
  });
}

function replaceDirectoryChildren(nodes: FileNode[], directoryPath: string, children: FileNode[]): FileNode[] {
  return nodes.map((node) => {
    if (node.path === directoryPath) {
      return {
        ...node,
        children,
        childrenLoaded: true,
      };
    }

    if (!node.children) {
      return node;
    }

    return {
      ...node,
      children: replaceDirectoryChildren(node.children, directoryPath, children),
    };
  });
}

function sortFileNodes(nodes: FileNode[]): FileNode[] {
  return [...nodes].sort((left, right) => {
    if (left.kind === right.kind) {
      return left.name.localeCompare(right.name);
    }

    return left.kind === 'directory' ? -1 : 1;
  });
}
