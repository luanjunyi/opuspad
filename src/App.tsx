import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getFileSystemService } from './services';
import { FileNode, ActiveFile } from './types';
import { Sidebar } from './components/Sidebar';
import { EditorRouter } from './components/EditorRouter';
import { applySavedTextFileState } from './utils/activeFileSave';

const DEFAULT_SIDEBAR_WIDTH = 300;
const MIN_SIDEBAR_WIDTH = 220;
const MAX_SIDEBAR_WIDTH = 540;

export default function App() {
  const [rootHandle, setRootHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [nodes, setNodes] = useState<FileNode[]>([]);
  const [activeFile, setActiveFile] = useState<ActiveFile | null>(null);
  const [activeFileReloadNonce, setActiveFileReloadNonce] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<boolean>(false);
  const latestFileSelectionId = useRef(0);
  const activeFileRef = useRef<ActiveFile | null>(null);
  const nodesRef = useRef<FileNode[]>([]);
  const saveStatusRef = useRef<'idle' | 'dirty' | 'saving' | 'saved'>('idle');
  const isReloadingWorkspaceRef = useRef(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'dirty' | 'saving' | 'saved'>('idle');
  const editVersionRef = useRef(0);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const isResizingSidebarRef = useRef(false);

  useEffect(() => {
    activeFileRef.current = activeFile;
  }, [activeFile]);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    saveStatusRef.current = saveStatus;
  }, [saveStatus]);

  useEffect(() => {
    if (rootHandle && activeFile) {
      document.title = `${rootHandle.name}/${activeFile.node.name}`;
      return;
    }

    if (rootHandle) {
      document.title = rootHandle.name;
      return;
    }

    document.title = 'OpusPad';
  }, [activeFile, rootHandle]);

  useEffect(() => {
    if (!activeFile || activeFile.state.kind !== 'text') {
      setSaveStatus('idle');
      editVersionRef.current = 0;
      return;
    }

    setSaveStatus('saved');
    editVersionRef.current = 0;
  }, [activeFile?.node.path, activeFile?.state.kind]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!isResizingSidebarRef.current) {
        return;
      }

      setSidebarWidth(Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, event.clientX)));
    };

    const stopResizingSidebar = () => {
      isResizingSidebarRef.current = false;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopResizingSidebar);
    window.addEventListener('pointercancel', stopResizingSidebar);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopResizingSidebar);
      window.removeEventListener('pointercancel', stopResizingSidebar);
    };
  }, []);

  const mountWorkspace = async () => {
    try {
      setError(null);
      setPermissionError(false);
      const fsService = getFileSystemService();
      const handle = await fsService.mountWorkspace();
      
      if (handle) {
        // Ensure read permission immediately on root if needed
        const hasPermission = await fsService.ensurePermission(handle, 'read');
        if (!hasPermission) {
          setPermissionError(true);
          return;
        }
        
        setRootHandle(handle);
        const children = await fsService.readDirectory(handle);
        setNodes(children);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to mount workspace');
    }
  };

  const handleFileSelect = useCallback(async (node: FileNode) => {
    if (node.kind !== 'file' || !node.handle) return;

    const selectionId = ++latestFileSelectionId.current;
    const fsService = getFileSystemService();
    const state = await fsService.readEditableFile(node.handle as FileSystemFileHandle, node.path);
    setActiveFile((current) => {
      if (selectionId !== latestFileSelectionId.current) {
        return current;
      }
      return { node, state };
    });
    setActiveFileReloadNonce(0);
  }, []);

  const handleCreateFile = useCallback(async (directory: FileNode | null, rawName: string) => {
    if (!rootHandle) {
      throw new Error('Open a workspace before creating files');
    }

    const fsService = getFileSystemService();
    const targetHandle = (directory?.handle as FileSystemDirectoryHandle | null) ?? rootHandle;
    const targetPath = directory?.path ?? '';
    const createdNode = await fsService.createFile(targetHandle, targetPath, rawName);

    await handleFileSelect(createdNode);
    return createdNode;
  }, [handleFileSelect, rootHandle]);

  const handleDeleteFile = useCallback(async (node: FileNode) => {
    if (!rootHandle || node.kind !== 'file') {
      return;
    }

    const fsService = getFileSystemService();
    await fsService.deleteFile(rootHandle, node.path);

    setNodes((currentNodes) => removeNodeByPath(currentNodes, node.path));
    setActiveFile((current) => (current?.node.path === node.path ? null : current));
  }, [rootHandle]);

  const handleSave = useCallback(async (content: string) => {
    const currentActiveFile = activeFileRef.current;
    if (!currentActiveFile) return;
    const saveVersion = editVersionRef.current;

    const originalPath = currentActiveFile.node.path;
    let fileHandle = currentActiveFile.node.handle as FileSystemFileHandle;
    let savePath = originalPath;

    if (!fileHandle) {
      if (!('showSaveFilePicker' in window)) return;
      try {
        fileHandle = await (window as any).showSaveFilePicker({
          suggestedName: currentActiveFile.node.name,
          types: [{
            description: 'Text File',
            accept: { 'text/plain': ['.txt', '.md', '.markdown'] }
          }]
        });
        savePath = fileHandle.name;
      } catch (e) {
        return;
      }
    }

    try {
      setSaveStatus('saving');
      const fsService = getFileSystemService();
      await fsService.writeFile(fileHandle, content);

      setActiveFile((current) =>
        applySavedTextFileState(current, {
          content,
          fileHandle,
          originalPath,
          savePath,
        })
      );

      setSaveStatus(saveVersion === editVersionRef.current ? 'saved' : 'dirty');
    } catch (e) {
      console.error('Save failed:', e);
      setSaveStatus('dirty');
    }
  }, []);

  const handleDirty = useCallback(() => {
    editVersionRef.current += 1;
    setSaveStatus('dirty');
  }, []);

  const reloadWorkspace = useCallback(async (rootHandleToReload: FileSystemDirectoryHandle | null) => {
    if (!rootHandleToReload || isReloadingWorkspaceRef.current) {
      return;
    }

    isReloadingWorkspaceRef.current = true;

    try {
      const fsService = getFileSystemService();
      const refreshedNodes = await refreshLoadedWorkspaceNodes(rootHandleToReload, nodesRef.current, fsService);
      setNodes(refreshedNodes);

      const currentActiveFile = activeFileRef.current;
      if (
        !currentActiveFile ||
        currentActiveFile.state.kind !== 'text' ||
        saveStatusRef.current !== 'saved' ||
        !currentActiveFile.node.handle
      ) {
        return;
      }

      const refreshedState = await fsService.readEditableFile(
        currentActiveFile.node.handle as FileSystemFileHandle,
        currentActiveFile.node.path
      );

      if (areLoadFileResultsEqual(currentActiveFile.state, refreshedState)) {
        return;
      }

      setActiveFile((current) => {
        if (
          !current ||
          current.node.path !== currentActiveFile.node.path ||
          saveStatusRef.current !== 'saved'
        ) {
          return current;
        }

        if (areLoadFileResultsEqual(current.state, refreshedState)) {
          return current;
        }

        if (current.state.kind === 'text' && refreshedState.kind === 'text') {
          refreshedState.editor = current.state.editor;
          refreshedState.canOpenInRichMode = current.state.canOpenInRichMode;
          refreshedState.canOpenInSourceMode = current.state.canOpenInSourceMode;

          if (areLoadFileResultsEqual(current.state, refreshedState)) {
            return current;
          }
        }

        return {
          ...current,
          state: refreshedState,
        };
      });
      setActiveFileReloadNonce((current) => current + 1);
    } catch (error) {
      console.error('Workspace reload failed:', error);
    } finally {
      isReloadingWorkspaceRef.current = false;
    }
  }, []);

  const handleReloadWorkspace = useCallback(async () => {
    await reloadWorkspace(rootHandle);
  }, [reloadWorkspace, rootHandle]);

  const renderSaveIndicator = () => {
    if (!activeFile || activeFile.state.kind !== 'text') {
      return null;
    }

    const variant = saveStatus === 'idle' ? 'saved' : saveStatus;
    const label = variant === 'saving'
      ? 'Saving'
      : variant === 'dirty'
        ? 'Unsaved changes'
        : 'All changes saved';

    return (
      <span className={`save-indicator save-indicator--${variant}`}>
        <span className="save-indicator__dot" aria-hidden="true" />
        <span>{label}</span>
      </span>
    );
  };

  const openInSourceMode = useCallback(() => {
    setActiveFile((current) => {
      if (!current || current.state.kind !== 'text') return current;
      return {
        ...current,
        state: {
          ...current.state,
          editor: 'text',
          canOpenInRichMode: true,
        },
      };
    });
  }, []);

  const openInRichMode = useCallback(() => {
    setActiveFile((current) => {
      if (!current || current.state.kind !== 'text') return current;
      return {
        ...current,
        state: {
          ...current.state,
          editor: 'markdown',
          canOpenInSourceMode: true,
        },
      };
    });
  }, []);

  const modeToggleButton = activeFile?.state.kind === 'text'
    ? activeFile.state.editor === 'markdown' && activeFile.state.canOpenInSourceMode
      ? (
        <button className="ghost-button workspace-toolbar__button" onClick={openInSourceMode} type="button">
          Open source
        </button>
      )
      : activeFile.state.editor === 'text' && activeFile.state.canOpenInRichMode
        ? (
          <button className="ghost-button workspace-toolbar__button" onClick={openInRichMode} type="button">
            Open rich
          </button>
        )
        : null
    : null;

  const isMock = new URLSearchParams(window.location.search).get('fs') === 'mock';

  return (
    <div className="app-shell">
      {!rootHandle ? (
        <main className="landing-shell">
          <div className="landing-container">
            <div className="landing-hero">
              <div className="landing-logo-container">
                <img src="/icon128.png" alt="OpusPad Logo" className="landing-logo" />
              </div>
              
              <h2 className="landing-brand">OpusPad</h2>
              <h1 className="landing-title">
                Spec-Driven Development,<br />
                Directly in Your Browser.
              </h1>
              
              <button className="landing-button" onClick={mountWorkspace} type="button">
                <span className="landing-button-text">{isMock ? 'Open Fixture Workspace' : 'Open Local Folder'}</span>
                <svg className="landing-button-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
              <p className="landing-action-hint">Select your project root to start editing local Markdown specs.</p>

              {(error || permissionError) && (
                <div className="landing-error">
                  {error && <p>{error}</p>}
                  {permissionError && <p>Permission denied to read the workspace.</p>}
                </div>
              )}
            </div>
            
            <hr className="landing-divider" />
            
            <div className="landing-features">
              <div className="landing-feature-card">
                <h3>Repo-Native Review</h3>
                <p>Read and write directly to your local file system using the Chrome File System API.</p>
              </div>
              <div className="landing-feature-card">
                <h3>Spec & Source Modes</h3>
                <p>Seamlessly toggle between distraction-free reading and precise raw Markdown editing.</p>
              </div>
              <div className="landing-feature-card">
                <h3>Agent Sync</h3>
                <p>Auto-reloads when external agents update implementation plans on disk.</p>
              </div>
            </div>
          </div>
        </main>
      ) : (
        <div
          className="workspace-shell"
          data-testid="workspace-shell"
          style={{ gridTemplateColumns: `${sidebarWidth}px 14px minmax(0, 1fr)` }}
        >
          <Sidebar 
            nodes={nodes} 
            onCreateFile={handleCreateFile}
            onDeleteFile={handleDeleteFile}
            onFileSelect={handleFileSelect} 
            onNodesChange={setNodes}
            rootHandle={rootHandle}
          />
          <div
            aria-label="Resize sidebar"
            aria-orientation="vertical"
            className="workspace-shell__resize-handle"
            onPointerDown={() => {
              isResizingSidebarRef.current = true;
            }}
            role="separator"
            tabIndex={0}
          />
          <main className="workspace-main">
            <div className="workspace-toolbar">
              {modeToggleButton}
              <button
                className="ghost-button workspace-toolbar__button"
                onClick={handleReloadWorkspace}
                type="button"
              >
                Reload workspace
              </button>
            </div>
            {activeFile ? (
              <div className="editor-panel">
                <header className="editor-panel__header">
                  <div>
                    <p className="editor-panel__eyebrow">
                      {activeFile.state.kind === 'text' ? activeFile.state.editor === 'markdown' ? 'Rich mode' : 'Source mode' : 'Unavailable'}
                    </p>
                    <strong>{activeFile.node.name}</strong>
                  </div>
                  <div className="editor-panel__meta">
                    {renderSaveIndicator()}
                    <span className="editor-panel__path">{rootHandle?.name}/{activeFile.node.path}</span>
                  </div>
                </header>
                <div className="editor-panel__body">
                  <EditorRouter
                    activeFile={activeFile}
                    reloadNonce={activeFileReloadNonce}
                    onSave={handleSave}
                    onDirty={handleDirty}
                  />
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <p className="empty-state__eyebrow">Nothing selected</p>
                <h2>Choose a file from the left.</h2>
                <p>Markdown opens in rich mode first. If the file may not save back cleanly, you will see a warning and can switch to source mode.</p>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}

function removeNodeByPath(nodes: FileNode[], path: string): FileNode[] {
  return nodes
    .filter((node) => node.path !== path)
    .map((node) => {
      if (!node.children) {
        return node;
      }

      return {
        ...node,
        children: removeNodeByPath(node.children, path),
      };
    });
}

async function refreshLoadedWorkspaceNodes(
  rootHandle: FileSystemDirectoryHandle,
  currentNodes: FileNode[],
  fsService: ReturnType<typeof getFileSystemService>
): Promise<FileNode[]> {
  const latestNodes = await fsService.readDirectory(rootHandle);
  return mergeLoadedDirectoryNodes(currentNodes, latestNodes, fsService);
}

async function mergeLoadedDirectoryNodes(
  previousNodes: FileNode[],
  nextNodes: FileNode[],
  fsService: ReturnType<typeof getFileSystemService>
): Promise<FileNode[]> {
  const previousByPath = new Map(previousNodes.map((node) => [node.path, node]));
  const mergedNodes = await Promise.all(
    nextNodes.map(async (node) => {
      if (node.kind !== 'directory' || !node.handle) {
        return node;
      }

      const previousNode = previousByPath.get(node.path);
      if (!previousNode || previousNode.kind !== 'directory' || !previousNode.childrenLoaded) {
        return node;
      }

      const latestChildren = await fsService.readDirectory(
        node.handle as FileSystemDirectoryHandle,
        node.path
      );
      const mergedChildren = await mergeLoadedDirectoryNodes(
        previousNode.children ?? [],
        latestChildren,
        fsService
      );

      return {
        ...node,
        childrenLoaded: true,
        children: mergedChildren,
      };
    })
  );

  return mergedNodes;
}

function areLoadFileResultsEqual(left: ActiveFile['state'], right: ActiveFile['state']): boolean {
  if (left.kind !== right.kind) {
    return false;
  }

  if (left.path !== right.path) {
    return false;
  }

  if (left.kind === 'error' && right.kind === 'error') {
    return (
      left.reason === right.reason &&
      left.message === right.message
    );
  }

  if (left.kind === 'text' && right.kind === 'text') {
    return (
      left.content === right.content &&
      left.editor === right.editor &&
      left.warning === right.warning &&
      left.canOpenInRichMode === right.canOpenInRichMode &&
      left.canOpenInSourceMode === right.canOpenInSourceMode
    );
  }

  return false;
}
