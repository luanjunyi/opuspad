import { BlockNoteEditor } from '@blocknote/core';

export interface MarkdownCompatibilityResult {
  compatible: boolean;
  normalizedMarkdown: string;
  warning?: string;
}

export async function checkMarkdownCompatibility(rawMarkdown: string): Promise<MarkdownCompatibilityResult> {
  // If the file is completely empty, it's always compatible
  if (!rawMarkdown.trim()) {
    return { compatible: true, normalizedMarkdown: rawMarkdown };
  }

  // Temporary BlockNoteEditor purely for conversion
  const editor = BlockNoteEditor.create();
  
  // Try to parse the raw markdown to blocks
  const blocks = await editor.tryParseMarkdownToBlocks(rawMarkdown);
  
  // Convert those blocks back to markdown
  const regeneratedMarkdown = await editor.blocksToMarkdownLossy(blocks);
  
  // Normalize both for a fair comparison
  const normalizedRaw = normalizeComparableMarkdown(rawMarkdown);
  const normalizedRegen = normalizeComparableMarkdown(regeneratedMarkdown);
  
  // If the normalized forms differ, the conversion was lossy (e.g. tables, complex HTML)
  const compatible = normalizedRaw === normalizedRegen;
  
  return {
    compatible,
    normalizedMarkdown: normalizedRegen,
    warning: compatible ? undefined : 'Opened in source mode because this Markdown file cannot round-trip safely through the block editor.'
  };
}

export function normalizeComparableMarkdown(input: string): string {
  // Replace Windows CRLF with LF, remove trailing spaces on every line, and trim the end
  return input.replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "").trimEnd();
}
