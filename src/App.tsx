import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getFileSystemService } from './services';
import { FileNode, ActiveFile } from './types';
import { Sidebar } from './components/Sidebar';
import { EditorRouter } from './components/EditorRouter';

export default function App() {
  const [rootHandle, setRootHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [nodes, setNodes] = useState<FileNode[]>([]);
  const [activeFile, setActiveFile] = useState<ActiveFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<boolean>(false);
  const latestFileSelectionId = useRef(0);
  const activeFileRef = useRef<ActiveFile | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveStatusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    activeFileRef.current = activeFile;
  }, [activeFile]);

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

      setActiveFile((current) => {
        if (!current || current.node.path !== originalPath || current.state.kind !== 'text') {
          return current;
        }

        return {
          ...current,
          node: {
            ...current.node,
            handle: fileHandle,
            path: savePath,
            name: fileHandle.name
          },
          state: {
            ...current.state,
            content,
          },
        };
      });

      setSaveStatus('saved');
      if (saveStatusTimeoutRef.current) {
        clearTimeout(saveStatusTimeoutRef.current);
      }
      saveStatusTimeoutRef.current = setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    } catch (e) {
      console.error('Save failed:', e);
      setSaveStatus('idle');
    }
  }, []);

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
              <h1 className="landing-panel__title">Markdown Editor</h1>
              <p className="landing-panel__subtitle">Quiet local editing for notes, specs, and source files.</p>
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
        <div className="workspace-shell">
          <Sidebar 
            nodes={nodes} 
            onFileSelect={handleFileSelect} 
            rootHandle={rootHandle}
          />
          <main className="workspace-main">
            {activeFile ? (
              <div className="editor-panel">
                <header className="editor-panel__header">
                  <div>
                    <p className="editor-panel__eyebrow">
                      {activeFile.state.kind === 'text' ? activeFile.state.editor === 'markdown' ? 'Rich mode' : 'Source mode' : 'Unavailable'}
                      {saveStatus === 'saved' && <span style={{ marginLeft: '8px', color: 'var(--color-text-muted)' }}>✓ Saved</span>}
                      {saveStatus === 'saving' && <span style={{ marginLeft: '8px', color: 'var(--color-text-muted)' }}>Saving...</span>}
                    </p>
                    <strong>{activeFile.node.name}</strong>
                  </div>
                  <span className="editor-panel__path">{rootHandle?.name}/{activeFile.node.path}</span>
                </header>
                <div className="editor-panel__body">
                  <EditorRouter
                    activeFile={activeFile}
                    onSave={handleSave}
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
