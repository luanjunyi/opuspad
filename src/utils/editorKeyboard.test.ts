import { describe, expect, it } from 'vitest';
import { shouldPreventEditorPageScroll } from './editorKeyboard';

describe('shouldPreventEditorPageScroll', () => {
  it('does not cancel space for text entry targets', () => {
    const wrapper = document.createElement('div');
    wrapper.className = 'editor-surface';

    const textarea = document.createElement('textarea');
    wrapper.appendChild(textarea);

    expect(shouldPreventEditorPageScroll(textarea, ' ')).toBe(false);
  });

  it('does not cancel space for rich text contenteditable targets', () => {
    const wrapper = document.createElement('div');
    wrapper.className = 'editor-surface';

    const richContent = document.createElement('div');
    richContent.setAttribute('contenteditable', 'true');
    wrapper.appendChild(richContent);

    expect(shouldPreventEditorPageScroll(richContent, ' ')).toBe(false);
  });

  it('cancels space when focus is on a non-editable editor surface element', () => {
    const wrapper = document.createElement('div');
    wrapper.className = 'editor-surface';

    const chrome = document.createElement('div');
    wrapper.appendChild(chrome);

    expect(shouldPreventEditorPageScroll(chrome, ' ')).toBe(true);
  });

  it('does not block space activation for buttons inside editor chrome', () => {
    const wrapper = document.createElement('div');
    wrapper.className = 'editor-surface';

    const button = document.createElement('button');
    wrapper.appendChild(button);

    expect(shouldPreventEditorPageScroll(button, ' ')).toBe(false);
  });
});
