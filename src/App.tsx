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
    if (!currentActiveFile || !currentActiveFile.node.handle) return;

    const savePath = currentActiveFile.node.path;
    const fileHandle = currentActiveFile.node.handle as FileSystemFileHandle;
    try {
      const fsService = getFileSystemService();
      await fsService.writeFile(fileHandle, content);

      setActiveFile((current) => {
        if (!current || current.node.path !== savePath || current.state.kind !== 'text') {
          return current;
        }

        return {
          ...current,
          state: {
            ...current.state,
            content,
          },
        };
      });
    } catch (e) {
      console.error('Save failed:', e);
      // Could show a toast notification here
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
            <p className="landing-panel__eyebrow">Markdown editor chrome</p>
            <h1>Quiet local editing for notes, specs, and source files.</h1>
            <p className="landing-panel__copy">
              Open a folder, move between rich and source editing, and keep exact Markdown formatting visible when fidelity matters.
            </p>
            <button className="primary-button" onClick={mountWorkspace} type="button">
              {isMock ? 'Open Fixture Workspace' : 'Open Folder'}
            </button>
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
                    <p className="editor-panel__eyebrow">{activeFile.state.kind === 'text' ? activeFile.state.editor === 'markdown' ? 'Rich mode' : 'Source mode' : 'Unavailable'}</p>
                    <strong>{activeFile.node.name}</strong>
                  </div>
                  <span className="editor-panel__path">{activeFile.node.path}</span>
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
