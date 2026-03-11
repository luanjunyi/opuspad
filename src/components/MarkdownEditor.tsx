import { useEffect, useState } from "react";
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

  useEffect(() => {
    async function loadEditor() {
      const e = BlockNoteEditor.create();
      if (activeFile.state.kind === 'text') {
        const blocks = await e.tryParseMarkdownToBlocks(activeFile.state.content);
        e.replaceBlocks(e.document, blocks);
      }
      setEditor(e);
    }
    loadEditor();
  }, [activeFile.node.path]); // Re-load if path changes

  if (!editor) {
    return <div>Loading editor...</div>;
  }

  return (
    <div style={{ padding: "20px", height: "100%", overflowY: "auto" }}>
      <BlockNoteView
        editor={editor}
        onChange={async () => {
          const markdown = await editor.blocksToMarkdownLossy(editor.document);
          onSave(markdown);
        }}
      />
    </div>
  );
}
