import React, { useState, useEffect, useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { javascript } from '@codemirror/lang-javascript';
import { markdown } from '@codemirror/lang-markdown';
import { ActiveFile } from '../types';

interface TextEditorProps {
  activeFile: ActiveFile;
  onSave: (content: string) => void;
}

export function TextEditor({ activeFile, onSave }: TextEditorProps) {
  const fileState = activeFile.state;
  
  if (fileState.kind === 'error') {
    return (
      <div style={{ padding: '20px', color: 'red', border: '1px solid red', borderRadius: '4px', backgroundColor: '#fee' }}>
        <h3>Unsupported File</h3>
        <p><strong>Reason:</strong> {fileState.reason}</p>
        <p>{fileState.message}</p>
      </div>
    );
  }

  const [content, setContent] = useState(fileState.content);

  // Sync content if file changes
  useEffect(() => {
    setContent(fileState.content);
  }, [fileState.path, fileState.content]);

  // Debounced save
  useEffect(() => {
    if (content === fileState.content) return;

    const timer = setTimeout(() => {
      onSave(content);
    }, 500);

    return () => clearTimeout(timer);
  }, [content, fileState.content, onSave]);

  const getExtensions = () => {
    const exts = [];
    const lowerPath = fileState.path.toLowerCase();
    if (lowerPath.endsWith('.json')) exts.push(json());
    else if (lowerPath.endsWith('.js') || lowerPath.endsWith('.ts')) exts.push(javascript());
    else if (lowerPath.endsWith('.md') || lowerPath.endsWith('.markdown')) exts.push(markdown());
    return exts;
  };

  const onChange = useCallback((val: string) => {
    setContent(val);
  }, []);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {fileState.warning && (
        <div style={{ padding: '10px', backgroundColor: '#fff3cd', color: '#856404', borderBottom: '1px solid #ffeeba' }}>
          <strong>Warning:</strong> {fileState.warning}
        </div>
      )}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <CodeMirror
          value={content}
          height="100%"
          extensions={getExtensions()}
          onChange={onChange}
        />
      </div>
    </div>
  );
}
