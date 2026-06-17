import type { NigmaDocument } from '../types/index.js';
import { documentStore } from './document.svelte.js';

const MAX_HISTORY = 50;

interface HistoryEntry {
  description: string;
  snapshot: string; // JSON serialized
}

let _undoStack = $state<HistoryEntry[]>([]);
let _redoStack = $state<HistoryEntry[]>([]);

export const historyStore = {
  get canUndo() { return _undoStack.length > 0; },
  get canRedo() { return _redoStack.length > 0; },
  get undoDescription() { return _undoStack.at(-1)?.description ?? null; },
  get redoDescription() { return _redoStack.at(-1)?.description ?? null; },

  push(description: string) {
    const snapshot = JSON.stringify(documentStore.doc);
    _undoStack = [..._undoStack.slice(-MAX_HISTORY + 1), { description, snapshot }];
    _redoStack = [];
  },

  undo() {
    if (_undoStack.length === 0) return;
    const current = JSON.stringify(documentStore.doc);
    const lastUndo = _undoStack.at(-1)!;
    _redoStack = [..._redoStack, { description: lastUndo.description, snapshot: current }];
    _undoStack = _undoStack.slice(0, -1);
    const restored: NigmaDocument = JSON.parse(lastUndo.snapshot);
    documentStore.setDocument(restored);
  },

  redo() {
    if (_redoStack.length === 0) return;
    const current = JSON.stringify(documentStore.doc);
    const lastRedo = _redoStack.at(-1)!;
    _undoStack = [..._undoStack, { description: lastRedo.description, snapshot: current }];
    _redoStack = _redoStack.slice(0, -1);
    const restored: NigmaDocument = JSON.parse(lastRedo.snapshot);
    documentStore.setDocument(restored);
  },

  clear() {
    _undoStack = [];
    _redoStack = [];
  },
};

// Helper: wrap a mutation with history push
export function withHistory<T>(description: string, fn: () => T): T {
  historyStore.push(description);
  return fn();
}
