import React from 'react';
import { ActiveFile } from '../types';
import { TextEditor } from './TextEditor';
import { MarkdownEditor } from './MarkdownEditor';

interface EditorRouterProps {
  activeFile: ActiveFile;
  onSave: (content: string) => void;
}

export function EditorRouter({ activeFile, onSave }: EditorRouterProps) {
  const { state } = activeFile;

  if (state.kind === 'error') {
    return <TextEditor activeFile={activeFile} onSave={onSave} />;
  }

  if (state.editor === 'markdown') {
    return <MarkdownEditor activeFile={activeFile} onSave={onSave} />;
  }

  return <TextEditor activeFile={activeFile} onSave={onSave} />;
}
