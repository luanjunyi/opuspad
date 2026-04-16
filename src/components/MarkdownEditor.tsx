import { useCallback, useEffect, useRef, useState } from "react";
import { BlockNoteEditor } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

import { ActiveFile } from "../types";
import { shouldPreventEditorPageScroll } from "../utils/editorKeyboard";

interface MarkdownEditorProps {
  activeFile: ActiveFile;
  reloadNonce?: number;
  onSave: (content: string) => void;
  onDirty: () => void;
}

export function MarkdownEditor({
  activeFile,
  reloadNonce = 0,
  onSave,
  onDirty,
}: MarkdownEditorProps) {
  const [editor, setEditor] = useState<BlockNoteEditor | null>(null);
  const latestLoadId = useRef(0);
  const editorRef = useRef<BlockNoteEditor | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingMarkdownRef = useRef<string | Promise<string> | null>(null);
  const onSaveRef = useRef(onSave);
  const onDirtyRef = useRef(onDirty);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    onDirtyRef.current = onDirty;
  }, [onDirty]);

  const flushPendingSaveSnapshot = useCallback(() => {
    if (pendingMarkdownRef.current === null) {
      return;
    }

    const pendingMarkdown = pendingMarkdownRef.current;
    pendingMarkdownRef.current = null;
    void Promise.resolve(pendingMarkdown).then((markdown) => {
      onSaveRef.current(markdown);
    });
  }, []);

  useEffect(() => {
    const loadId = ++latestLoadId.current;
    let cancelled = false;

    setEditor(null);
    pendingMarkdownRef.current = null;

    async function loadEditor() {
      const e = BlockNoteEditor.create();
      if (activeFile.state.kind === 'text') {
        const blocks = await e.tryParseMarkdownToBlocks(activeFile.state.content);
        if (cancelled || loadId !== latestLoadId.current) {
          return;
        }
        e.replaceBlocks(e.document, blocks);
      }

      if (!cancelled && loadId === latestLoadId.current) {
        editorRef.current = e;
        setEditor(e);
      }
    }

    void loadEditor();

    return () => {
      cancelled = true;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        flushPendingSaveSnapshot();
        saveTimeoutRef.current = null;
      }
      editorRef.current = null;
    };
  }, [activeFile.node.path, flushPendingSaveSnapshot, reloadNonce]); // Re-load if the file changes or a same-file reload is requested

  const handleChange = useCallback(() => {
    if (!editor) return;

    onDirtyRef.current();

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    const currentEditor = editor;
    pendingMarkdownRef.current = currentEditor.blocksToMarkdownLossy(currentEditor.document);
    saveTimeoutRef.current = setTimeout(() => {
      flushPendingSaveSnapshot();
      saveTimeoutRef.current = null;
    }, 500);
  }, [editor, flushPendingSaveSnapshot]);

  const handleKeyDownCapture = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (shouldPreventEditorPageScroll(event.target, event.key)) {
      event.preventDefault();
    }
  }, []);

  if (!editor) {
    return <div>Loading editor...</div>;
  }

  return (
    <div className="editor-surface editor-surface--markdown" onKeyDownCapture={handleKeyDownCapture}>
      {activeFile.state.kind === 'text' && activeFile.state.warning && (
        <div className="editor-warning">
          <div>
            <p className="editor-warning__eyebrow">Rich preview, careful save</p>
            <p className="editor-warning__text">{activeFile.state.warning}</p>
          </div>
        </div>
      )}
      <BlockNoteView
        comments={false}
        editor={editor}
        emojiPicker={false}
        filePanel={false}
        onChange={handleChange}
        tableHandles={false}
      />
    </div>
  );
}
