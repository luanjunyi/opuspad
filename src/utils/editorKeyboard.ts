function isTextInput(element: HTMLInputElement): boolean {
  return !['button', 'checkbox', 'file', 'radio', 'range', 'reset', 'submit'].includes(element.type);
}

export function shouldPreventEditorPageScroll(target: EventTarget | null, key: string): boolean {
  if ((key !== ' ' && key !== 'Spacebar') || !(target instanceof HTMLElement)) {
    return false;
  }

  const editableAncestor = target.closest('[contenteditable="true"], textarea, input, .cm-content');
  if (!editableAncestor) {
    return false;
  }

  if (editableAncestor instanceof HTMLInputElement) {
    return isTextInput(editableAncestor);
  }

  return true;
}
