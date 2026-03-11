export function isMarkdownPath(path: string): boolean {
  const lower = path.toLowerCase();
  return lower.endsWith('.md') || lower.endsWith('.markdown');
}

export function isLikelyBinary(buffer: ArrayBuffer): boolean {
  const size = Math.min(buffer.byteLength, 8192);
  const bytes = new Uint8Array(buffer, 0, size);
  for (let i = 0; i < size; i++) {
    if (bytes[i] === 0x00) return true;
  }
  return false;
}
