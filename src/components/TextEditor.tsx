import React, { useState, useEffect, useCallback, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { javascript } from '@codemirror/lang-javascript';
import { markdown } from '@codemirror/lang-markdown';
import { python } from '@codemirror/lang-python';
import { ActiveFile } from '../types';
import { shouldPreventEditorPageScroll } from '../utils/editorKeyboard';
import { getSourceLanguage } from '../utils/sourceLanguage';

interface TextEditorProps {
  activeFile: ActiveFile;
  reloadNonce?: number;
  onSave: (content: string) => void;
  onDirty: () => void;
}

const JSON_EXTENSIONS = [json()];
const PYTHON_EXTENSIONS = [python()];
const JAVASCRIPT_EXTENSIONS = [javascript()];
const JSX_EXTENSIONS = [javascript({ jsx: true })];
const TYPESCRIPT_EXTENSIONS = [javascript({ typescript: true })];
const TSX_EXTENSIONS = [javascript({ jsx: true, typescript: true })];
const MARKDOWN_EXTENSIONS = [markdown()];
const PLAIN_TEXT_EXTENSIONS: [] = [];

function getExtensionsForPath(path: string) {
  switch (getSourceLanguage(path)) {
    case 'json':
      return JSON_EXTENSIONS;
    case 'python':
      return PYTHON_EXTENSIONS;
    case 'javascript':
      return JAVASCRIPT_EXTENSIONS;
    case 'jsx':
      return JSX_EXTENSIONS;
    case 'typescript':
      return TYPESCRIPT_EXTENSIONS;
    case 'tsx':
      return TSX_EXTENSIONS;
    case 'markdown':
      return MARKDOWN_EXTENSIONS;
    default:
      return PLAIN_TEXT_EXTENSIONS;
  }
}

export function TextEditor({ activeFile, reloadNonce = 0, onSave, onDirty }: TextEditorProps) {
  const fileState = activeFile.state;
  
  if (fileState.kind === 'error') {
    return (
      <div className="unsupported-file">
        <p className="unsupported-file__eyebrow">Unavailable</p>
        <h3>Unsupported File</h3>
        <p><strong>Reason:</strong> {fileState.reason}</p>
        <p>{fileState.message}</p>
      </div>
    );
  }

  const [content, setContent] = useState(fileState.content);
  const onSaveRef = useRef(onSave);
  const onDirtyRef = useRef(onDirty);
  const latestContentRef = useRef(fileState.content);
  const savedContentRef = useRef(fileState.content);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousPathRef = useRef(fileState.path);
  const previousReloadNonceRef = useRef(reloadNonce);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    onDirtyRef.current = onDirty;
  }, [onDirty]);

  useEffect(() => {
    savedContentRef.current = fileState.content;
    const pathChanged = previousPathRef.current !== fileState.path;
    const reloadRequested = previousReloadNonceRef.current !== reloadNonce;

    if (pathChanged || reloadRequested) {
      previousPathRef.current = fileState.path;
      previousReloadNonceRef.current = reloadNonce;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      latestContentRef.current = fileState.content;
      setContent(fileState.content);
      return;
    }

    previousReloadNonceRef.current = reloadNonce;

    if (latestContentRef.current === fileState.content) {
      setContent(fileState.content);
    }
  }, [fileState.path, fileState.content, reloadNonce]);

  // Debounced save
  useEffect(() => {
    if (content === fileState.content) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    latestContentRef.current = content;
    saveTimeoutRef.current = setTimeout(() => {
      onSaveRef.current(latestContentRef.current);
      saveTimeoutRef.current = null;
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [content, fileState.content]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current && latestContentRef.current !== savedContentRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
        onSaveRef.current(latestContentRef.current);
      }
    };
  }, []);

  const onChange = useCallback((val: string) => {
    latestContentRef.current = val;
    onDirtyRef.current();
    setContent(val);
  }, []);

  const handleKeyDownCapture = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (shouldPreventEditorPageScroll(event.target, event.key)) {
      event.preventDefault();
    }
  }, []);

  return (
    <div className="editor-surface" onKeyDownCapture={handleKeyDownCapture}>
      {fileState.warning && (
        <div className="editor-warning">
          <div>
            <p className="editor-warning__eyebrow">Source mode recommended</p>
            <p className="editor-warning__text">{fileState.warning}</p>
          </div>
        </div>
      )}
      <div className="code-editor-shell">
        <CodeMirror
          value={content}
          height="100%"
          extensions={getExtensionsForPath(fileState.path)}
          onChange={onChange}
        />
      </div>
    </div>
  );
}
