import React, { useDeferredValue, useEffect, useRef, useState } from 'react';
import { FileNode } from '../types';
import { ChevronRight, ChevronDown, File, Folder, Search, Sparkles } from 'lucide-react';
import { getFileSystemService } from '../services';
import { fuzzyMatchPath, sortFuzzyMatches } from '../utils/fuzzySearch';
import { isMarkdownPath } from '../utils/fileType';

interface SidebarProps {
  nodes: FileNode[];
  onFileSelect: (node: FileNode) => void;
  rootHandle: FileSystemDirectoryHandle | null;
}

export function Sidebar({ nodes: initialNodes, onFileSelect, rootHandle }: SidebarProps) {
  const [nodes, setNodes] = useState<FileNode[]>(initialNodes);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [loadingPaths, setLoadingPaths] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [markdownOnly, setMarkdownOnly] = useState(false);
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const hasActiveSearch = searchQuery.trim().length > 0;
  const [indexedFiles, setIndexedFiles] = useState<FileNode[]>([]);
  const [indexingState, setIndexingState] = useState<'idle' | 'indexing' | 'ready'>('idle');
  const [activeSearchResultIndex, setActiveSearchResultIndex] = useState<number | null>(null);
  const resultButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes]);

  useEffect(() => {
    setIndexedFiles(collectFiles(initialNodes));
    setIndexingState('idle');
  }, [initialNodes]);

  useEffect(() => {
    if (!rootHandle || !hasActiveSearch || indexingState !== 'idle') {
      return;
    }

    let cancelled = false;

    const indexWorkspace = async () => {
      setIndexingState('indexing');

      const fsService = getFileSystemService();
      const indexedByPath = new Map<string, FileNode>();

      const pushFiles = (entries: FileNode[]) => {
        for (const entry of entries) {
          if (entry.kind === 'file') {
            indexedByPath.set(entry.path, entry);
          }
        }

        if (!cancelled) {
          setIndexedFiles(Array.from(indexedByPath.values()));
        }
      };

      const walkDirectory = async (
        directoryHandle: FileSystemDirectoryHandle,
        currentPath?: string
      ) => {
        const entries = await fsService.readDirectory(directoryHandle, currentPath);
        pushFiles(entries);

        for (const entry of entries) {
          if (entry.kind === 'directory' && entry.handle) {
            await walkDirectory(entry.handle as FileSystemDirectoryHandle, entry.path);
          }
        }
      };

      pushFiles(initialNodes);

      for (const node of initialNodes) {
        if (node.kind === 'directory' && node.handle) {
          await walkDirectory(node.handle as FileSystemDirectoryHandle, node.path);
        }
      }

      if (!cancelled) {
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
        
        // Update nodes tree
        setNodes(prevNodes => {
          const updateTree = (currentNodes: FileNode[]): FileNode[] => {
            return currentNodes.map(n => {
              if (n.path === node.path) {
                return { ...n, children, childrenLoaded: true };
              }
              if (n.children) {
                return { ...n, children: updateTree(n.children) };
              }
              return n;
            });
          };
          return updateTree(prevNodes);
        });
        
        setLoadingPaths(prev => {
          const next = new Set(prev);
          next.delete(node.path);
          return next;
        });
      }
    }
  };

  const renderNode = (node: FileNode, depth: number = 0) => {
    const isExpanded = expandedPaths.has(node.path);
    const isLoading = loadingPaths.has(node.path);

    return (
      <div key={node.path}>
        <div
          style={{ paddingLeft: `${depth * 14 + 16}px` }}
          onClick={() => node.kind === 'directory' ? toggleDirectory(node) : onFileSelect(node)}
          className="sidebar-item"
        >
          {node.kind === 'directory' ? (
            isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
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

function collectFiles(nodes: FileNode[]): FileNode[] {
  return nodes.flatMap((node) => {
    if (node.kind === 'file') {
      return [node];
    }

    if (!node.children) {
      return [];
    }

    return collectFiles(node.children);
  });
}
