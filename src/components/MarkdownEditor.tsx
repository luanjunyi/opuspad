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
  onOpenInSourceMode: () => void;
}

export function MarkdownEditor({
  activeFile,
  reloadNonce = 0,
  onSave,
  onDirty,
  onOpenInSourceMode,
}: MarkdownEditorProps) {
  const [editor, setEditor] = useState<BlockNoteEditor | null>(null);
  const latestLoadId = useRef(0);
  const editorRef = useRef<BlockNoteEditor | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSaveRef = useRef(onSave);
  const onDirtyRef = useRef(onDirty);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    onDirtyRef.current = onDirty;
  }, [onDirty]);

  useEffect(() => {
    const loadId = ++latestLoadId.current;
    let cancelled = false;

    setEditor(null);

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
        if (editorRef.current) {
          void Promise.resolve(editorRef.current.blocksToMarkdownLossy(editorRef.current.document)).then((markdown) => {
            onSaveRef.current(markdown);
          });
        }
        saveTimeoutRef.current = null;
      }
      editorRef.current = null;
    };
  }, [activeFile.node.path, reloadNonce]); // Re-load if the file changes or a same-file reload is requested

  const handleChange = useCallback(() => {
    if (!editor) return;

    onDirtyRef.current();

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    const currentEditor = editor;
    saveTimeoutRef.current = setTimeout(async () => {
      const markdown = await Promise.resolve(currentEditor.blocksToMarkdownLossy(currentEditor.document));
      onSaveRef.current(markdown);
      saveTimeoutRef.current = null;
    }, 500);
  }, [editor]);

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
          {activeFile.state.canOpenInSourceMode && (
            <button className="ghost-button" onClick={onOpenInSourceMode} type="button">
              Open source
            </button>
          )}
        </div>
      )}
      <BlockNoteView
        editor={editor}
        onChange={handleChange}
      />
    </div>
  );
}
