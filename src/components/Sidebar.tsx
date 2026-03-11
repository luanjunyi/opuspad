import React, { useState } from 'react';
import { FileNode } from '../types';
import { ChevronRight, ChevronDown, File, Folder } from 'lucide-react';
import { getFileSystemService } from '../services';

interface SidebarProps {
  nodes: FileNode[];
  onFileSelect: (node: FileNode) => void;
  rootHandle: FileSystemDirectoryHandle | null;
}

export function Sidebar({ nodes: initialNodes, onFileSelect, rootHandle }: SidebarProps) {
  const [nodes, setNodes] = useState<FileNode[]>(initialNodes);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [loadingPaths, setLoadingPaths] = useState<Set<string>>(new Set());

  React.useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes]);

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
          style={{ paddingLeft: `${depth * 12 + 8}px`, display: 'flex', alignItems: 'center', cursor: 'pointer', paddingBottom: '4px', paddingTop: '4px' }}
          onClick={() => node.kind === 'directory' ? toggleDirectory(node) : onFileSelect(node)}
          className="sidebar-item"
        >
          {node.kind === 'directory' ? (
            isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
          ) : (
             <span style={{width: 16, display: 'inline-block'}} />
          )}
          {node.kind === 'directory' ? <Folder size={16} style={{marginRight: 4, marginLeft: 4}} /> : <File size={16} style={{marginRight: 4, marginLeft: 4}} />}
          <span>{node.name}</span>
          {isLoading && <span style={{marginLeft: 8, fontSize: '10px'}}>...</span>}
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
    <div style={{ width: '250px', borderRight: '1px solid #ccc', height: '100vh', overflowY: 'auto', backgroundColor: '#f9f9f9' }}>
      <div style={{ padding: '8px', fontWeight: 'bold', borderBottom: '1px solid #ccc' }}>Workspace</div>
      {nodes.map(n => renderNode(n))}
    </div>
  );
}
