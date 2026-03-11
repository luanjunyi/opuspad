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
        <h2>Local files</h2>
      </div>
      {nodes.map(n => renderNode(n))}
    </aside>
  );
}
