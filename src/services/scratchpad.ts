export interface ScratchpadNote {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}

const STORAGE_KEY = 'opuspad_scratchpad_notes';
const LAST_OPENED_KEY = 'opuspad_scratchpad_last_opened';

export function getScratchpadNotes(): ScratchpadNote[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data) as ScratchpadNote[];
  } catch (error) {
    console.error('Failed to parse scratchpad notes', error);
    return [];
  }
}

export function saveScratchpadNote(note: ScratchpadNote): void {
  const notes = getScratchpadNotes();
  const existingIndex = notes.findIndex((n) => n.id === note.id);
  
  if (existingIndex >= 0) {
    notes[existingIndex] = note;
  } else {
    notes.push(note);
  }
  
  // Sort by updatedAt descending
  notes.sort((a, b) => b.updatedAt - a.updatedAt);
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export function createScratchpadNote(): ScratchpadNote {
  const newNote: ScratchpadNote = {
    id: crypto.randomUUID(),
    title: 'Quick Note',
    content: '',
    updatedAt: Date.now(),
  };
  saveScratchpadNote(newNote);
  return newNote;
}

export function deleteScratchpadNote(id: string): void {
  const notes = getScratchpadNotes();
  const updatedNotes = notes.filter((n) => n.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedNotes));
}

export function getLastOpenedScratchpadId(): string | null {
  return localStorage.getItem(LAST_OPENED_KEY);
}

export function setLastOpenedScratchpadId(id: string | null): void {
  if (id === null) {
    localStorage.removeItem(LAST_OPENED_KEY);
  } else {
    localStorage.setItem(LAST_OPENED_KEY, id);
  }
}
