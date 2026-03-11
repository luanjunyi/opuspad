import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TextEditor } from './TextEditor';
import { describe, it, expect, vi } from 'vitest';
import { ActiveFile } from '../types';

describe('TextEditor', () => {
  it('renders error state for binary files', () => {
    const activeFile: ActiveFile = {
      node: { name: 'img.png', kind: 'file', path: 'img.png', handle: null },
      state: { kind: 'error', path: 'img.png', reason: 'binary', message: 'Binary files cannot be edited' }
    };
    render(<TextEditor activeFile={activeFile} onSave={vi.fn()} />);
    expect(screen.getByText('Unsupported File')).toBeInTheDocument();
    expect(screen.getByText('Binary files cannot be edited')).toBeInTheDocument();
  });

  // Basic rendering test for valid file
  it('renders warning if present', () => {
    const activeFile: ActiveFile = {
      node: { name: 'notes.md', kind: 'file', path: 'notes.md', handle: null },
      state: { kind: 'text', path: 'notes.md', content: 'test', editor: 'text', warning: 'Markdown warning' }
    };
    render(<TextEditor activeFile={activeFile} onSave={vi.fn()} />);
    expect(screen.getByText(/Markdown warning/)).toBeInTheDocument();
  });
});
