import React, { useRef, useState } from 'react';
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

  const handleSave = async (content: string) => {
    if (!activeFile || !activeFile.node.handle) return;

    const savePath = activeFile.node.path;
    const fileHandle = activeFile.node.handle as FileSystemFileHandle;
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
  };

  const isMock = new URLSearchParams(window.location.search).get('fs') === 'mock';

  return (
    <div style={{ display: 'flex', height: '100vh', margin: 0, fontFamily: 'sans-serif' }}>
      {!rootHandle ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h2>Markdown Editor</h2>
          <button 
            onClick={mountWorkspace}
            style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}
          >
            {isMock ? 'Open Fixture Workspace' : 'Open Folder'}
          </button>
          {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
          {permissionError && <p style={{ color: 'red', marginTop: '10px' }}>Permission denied to read the workspace.</p>}
        </div>
      ) : (
        <>
          <Sidebar 
            nodes={nodes} 
            onFileSelect={handleFileSelect} 
            rootHandle={rootHandle}
          />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {activeFile ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '10px', backgroundColor: '#eee', borderBottom: '1px solid #ccc' }}>
                  <strong>{activeFile.node.name}</strong>
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <EditorRouter activeFile={activeFile} onSave={handleSave} />
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
                Select a file to start editing
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
