export function shouldPreventEditorPageScroll(target: EventTarget | null, key: string): boolean {
  if ((key !== ' ' && key !== 'Spacebar') || !(target instanceof HTMLElement)) {
    return false;
  }

  const editableAncestor = target.closest('[contenteditable="true"], textarea, input, .cm-content');
  if (
    target.closest('button, summary, select, a[href], [role="button"]') ||
    editableAncestor instanceof HTMLInputElement ||
    editableAncestor instanceof HTMLTextAreaElement
  ) {
    return false;
  }

  if (editableAncestor) {
    return false;
  }

  return target.closest('.editor-surface') !== null;
}
