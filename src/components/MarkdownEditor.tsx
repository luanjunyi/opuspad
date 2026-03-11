import { useCallback, useEffect, useRef, useState } from "react";
import { BlockNoteEditor } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

import { ActiveFile } from "../types";

interface MarkdownEditorProps {
  activeFile: ActiveFile;
  onSave: (content: string) => void;
}

export function MarkdownEditor({ activeFile, onSave }: MarkdownEditorProps) {
  const [editor, setEditor] = useState<BlockNoteEditor | null>(null);
  const latestLoadId = useRef(0);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        setEditor(e);
      }
    }

    void loadEditor();

    return () => {
      cancelled = true;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [activeFile.node.path]); // Re-load if path changes

  const handleChange = useCallback(() => {
    if (!editor) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    const currentEditor = editor;
    saveTimeoutRef.current = setTimeout(async () => {
      const markdown = await currentEditor.blocksToMarkdownLossy(currentEditor.document);
      onSave(markdown);
      saveTimeoutRef.current = null;
    }, 500);
  }, [editor, onSave]);

  if (!editor) {
    return <div>Loading editor...</div>;
  }

  return (
    <div style={{ padding: "20px", height: "100%", overflowY: "auto" }}>
      <BlockNoteView
        editor={editor}
        onChange={handleChange}
      />
    </div>
  );
}
