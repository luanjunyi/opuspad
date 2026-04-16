import React, { useState, useEffect, useCallback } from 'react';
import { 
  getScratchpadNotes, saveScratchpadNote, createScratchpadNote, deleteScratchpadNote,
  getLastOpenedScratchpadId, setLastOpenedScratchpadId, ScratchpadNote 
} from '../services/scratchpad';
import { MarkdownEditor } from './MarkdownEditor';
import { ActiveFile } from '../types';

interface ScratchpadShellProps {
  onOpenWorkspace: () => void;
}

export function ScratchpadShell({ onOpenWorkspace }: ScratchpadShellProps) {
  const [notes, setNotes] = useState<ScratchpadNote[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    let localNotes = getScratchpadNotes();
    if (localNotes.length === 0) {
      const newNote = createScratchpadNote();
      localNotes = [newNote];
    }
    setNotes(localNotes);

    const lastId = getLastOpenedScratchpadId();
    if (lastId && localNotes.some(n => n.id === lastId)) {
      setActiveNoteId(lastId);
    } else {
      setActiveNoteId(localNotes[0].id);
      setLastOpenedScratchpadId(localNotes[0].id);
    }
  }, []);

  const selectNote = (id: string) => {
    setActiveNoteId(id);
    setLastOpenedScratchpadId(id);
  };

  const createNote = () => {
    const newNote = createScratchpadNote();
    setNotes(prev => [newNote, ...prev]);
    selectNote(newNote.id);
  };

  const deleteNote = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteScratchpadNote(id);
    setNotes(prev => {
      const nextNotes = prev.filter(n => n.id !== id);
      if (nextNotes.length === 0) {
        const newNote = createScratchpadNote();
        selectNote(newNote.id);
        return [newNote];
      }
      if (activeNoteId === id) {
        selectNote(nextNotes[0].id);
      }
      return nextNotes;
    });
  };

  const handleTitleBlur = (id: string, newTitle: string) => {
    setEditingId(null);
    const note = notes.find(n => n.id === id);
    if (!note || note.title === newTitle) return;
    const updatedNote = { ...note, title: newTitle, updatedAt: Date.now() };
    saveScratchpadNote(updatedNote);
    // Refresh to re-sort
    setNotes(getScratchpadNotes());
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, id: string) => {
    if (e.key === 'Enter') {
      handleTitleBlur(id, e.currentTarget.value);
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  const handleSave = useCallback((content: string) => {
    if (!activeNoteId) return;
    const note = notes.find(n => n.id === activeNoteId);
    if (!note) return;
    const updatedNote = { ...note, content, updatedAt: Date.now() };
    saveScratchpadNote(updatedNote);
    
    // We update local state to avoid blinking the editor with getScratchpadNotes
    setNotes(prev => prev.map(n => n.id === activeNoteId ? updatedNote : n));
  }, [activeNoteId, notes]);

  const activeNote = notes.find(n => n.id === activeNoteId);

  const fakeActiveFile: ActiveFile | null = activeNote ? {
    node: {
      name: activeNote.title,
      kind: 'file' as const,
      path: activeNote.id,
      handle: null,
    },
    state: {
      kind: 'text' as const,
      path: activeNote.id,
      content: activeNote.content,
      editor: 'markdown' as const,
      canOpenInRichMode: true,
      canOpenInSourceMode: false,
    }
  } : null;

  return (
    <div className="scratchpad-shell">
      <aside className="scratchpad-sidebar">
        <div className="scratchpad-sidebar-header">
          <div className="scratchpad-brand-header">
            <img src="/icon128.png" alt="OpusPad Logo" className="scratchpad-brand-logo" />
            <h2 className="scratchpad-brand-name">OpusPad</h2>
          </div>
          <button className="scratchpad-btn-primary" onClick={onOpenWorkspace} type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            <span>Open Folder</span>
          </button>
        </div>
        
        <div className="scratchpad-notes-list">
          <div className="scratchpad-notes-header">
            <h3 className="scratchpad-notes-title">Notes</h3>
            <button className="scratchpad-add-btn" onClick={createNote} aria-label="New Note" title="New Note">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            </button>
          </div>
          
          <ul className="scratchpad-notes">
            {notes.map(note => (
              <li 
                key={note.id} 
                className={`scratchpad-note-item ${note.id === activeNoteId ? 'active' : ''}`}
                onClick={() => selectNote(note.id)}
              >
                {editingId === note.id ? (
                  <input
                    type="text"
                    className="scratchpad-rename-input"
                    defaultValue={note.title}
                    autoFocus
                    onBlur={(e) => handleTitleBlur(note.id, e.target.value)}
                    onKeyDown={(e) => handleTitleKeyDown(e, note.id)}
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <span className="scratchpad-note-title" onDoubleClick={() => setEditingId(note.id)}>
                    {note.title}
                  </span>
                )}
                
                <div className="scratchpad-note-actions">
                  <button className="scratchpad-action-btn" onClick={(e) => { e.stopPropagation(); setEditingId(note.id); }} aria-label="Rename" title="Rename note">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                  </button>
                  <button className="scratchpad-action-btn scratchpad-action-btn--danger" onClick={(e) => deleteNote(e, note.id)} aria-label="Delete" title="Delete note">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </aside>
      
      <main className="scratchpad-main">
        {fakeActiveFile ? (
          <div className="scratchpad-editor-panel">
            <header className="scratchpad-editor-header">
              <h1>{activeNote?.title}</h1>
            </header>
            <div className="scratchpad-editor-body">
              <MarkdownEditor
                activeFile={fakeActiveFile}
                onSave={handleSave}
                onDirty={() => {}}
                reloadNonce={0}
              />
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <p>No note selected</p>
          </div>
        )}
      </main>
    </div>
  );
}
