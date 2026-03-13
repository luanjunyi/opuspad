import React from 'react';
import { ActiveFile } from '../types';
import { TextEditor } from './TextEditor';
import { MarkdownEditor } from './MarkdownEditor';

interface EditorRouterProps {
  activeFile: ActiveFile;
  reloadNonce: number;
  onSave: (content: string) => void;
  onDirty: () => void;
  onOpenInSourceMode: () => void;
  onOpenInRichMode: () => void;
}

export function EditorRouter({
  activeFile,
  reloadNonce,
  onSave,
  onDirty,
  onOpenInSourceMode,
  onOpenInRichMode,
}: EditorRouterProps) {
  const { state } = activeFile;

  if (state.kind === 'error') {
    return <TextEditor activeFile={activeFile} reloadNonce={reloadNonce} onSave={onSave} onDirty={onDirty} onOpenInRichMode={onOpenInRichMode} />;
  }

  if (state.editor === 'markdown') {
    return <MarkdownEditor activeFile={activeFile} reloadNonce={reloadNonce} onSave={onSave} onDirty={onDirty} onOpenInSourceMode={onOpenInSourceMode} />;
  }

  return <TextEditor activeFile={activeFile} reloadNonce={reloadNonce} onSave={onSave} onDirty={onDirty} onOpenInRichMode={onOpenInRichMode} />;
}
