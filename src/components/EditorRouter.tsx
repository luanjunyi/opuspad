import React from 'react';
import { ActiveFile } from '../types';
import { TextEditor } from './TextEditor';
import { MarkdownEditor } from './MarkdownEditor';

interface EditorRouterProps {
  activeFile: ActiveFile;
  reloadNonce: number;
  onSave: (content: string) => void;
  onDirty: () => void;
}

export function EditorRouter({
  activeFile,
  reloadNonce,
  onSave,
  onDirty,
}: EditorRouterProps) {
  const { state } = activeFile;

  if (state.kind === 'error') {
    return <TextEditor activeFile={activeFile} reloadNonce={reloadNonce} onSave={onSave} onDirty={onDirty} />;
  }

  if (state.editor === 'markdown') {
    return <MarkdownEditor activeFile={activeFile} reloadNonce={reloadNonce} onSave={onSave} onDirty={onDirty} />;
  }

  return <TextEditor activeFile={activeFile} reloadNonce={reloadNonce} onSave={onSave} onDirty={onDirty} />;
}
