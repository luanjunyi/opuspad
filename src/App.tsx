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
  const [error, setError] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<boolean>(false);
  const latestFileSelectionId = useRef(0);
  const activeFileRef = useRef<ActiveFile | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'dirty' | 'saving' | 'saved'>('idle');
  const editVersionRef = useRef(0);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const isResizingSidebarRef = useRef(false);

  useEffect(() => {
    activeFileRef.current = activeFile;
  }, [activeFile]);

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

  const handleFileSelect = async (node: FileNode) => {
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
  };

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

  const isMock = new URLSearchParams(window.location.search).get('fs') === 'mock';

  return (
    <div className="app-shell">
      {!rootHandle ? (
        <main className="landing-shell">
          <section className="landing-panel">
            <div className="landing-panel__hero">
              <h1 className="landing-panel__title">OpusPad</h1>
              <p className="landing-panel__subtitle">Bridging AI output and human intent, WYSIWYG, private, local only.</p>
            </div>
            
            <div className="landing-panel__features">
              <div className="feature-item">
                <span className="feature-item__icon">🔒</span>
                <div className="feature-item__content">
                  <h3>Local & Secure</h3>
                  <p>Read and write directly to your file system. No cloud, no data collection.</p>
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-item__icon">✨</span>
                <div className="feature-item__content">
                  <h3>Markdown First</h3>
                  <p>Highly optimized WYSIWYG experience tailored specifically for markdown files.</p>
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-item__icon">🌗</span>
                <div className="feature-item__content">
                  <h3>Dual Mode</h3>
                  <p>Seamlessly switch between rich visual editing and precise source mode.</p>
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-item__icon">🎨</span>
                <div className="feature-item__content">
                  <h3>Syntax Highlights</h3>
                  <p>Full support and highlighting for various code blocks and other text files.</p>
                </div>
              </div>
            </div>

            <div className="landing-panel__action">
              <button className="primary-button landing-panel__button" onClick={mountWorkspace} type="button">
                {isMock ? 'Open Fixture Workspace' : 'Open Folder'}
              </button>
            </div>

            {(error || permissionError) && (
              <div className="landing-panel__error">
                {error && <p>{error}</p>}
                {permissionError && <p>Permission denied to read the workspace.</p>}
              </div>
            )}
          </section>
        </main>
      ) : (
        <div
          className="workspace-shell"
          data-testid="workspace-shell"
          style={{ gridTemplateColumns: `${sidebarWidth}px 14px minmax(0, 1fr)` }}
        >
          <Sidebar 
            nodes={nodes} 
            onFileSelect={handleFileSelect} 
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
                    onSave={handleSave}
                    onDirty={handleDirty}
                    onOpenInSourceMode={openInSourceMode}
                    onOpenInRichMode={openInRichMode}
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
