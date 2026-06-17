import { documentStore, findNodeById } from './document.svelte.js';
import type { NigmaNode } from '../types/index.js';

let _selectedIds = $state<Set<string>>(new Set());
let _hoveredId = $state<string | null>(null);

export const selectionStore = {
  get selectedIds() { return _selectedIds; },
  get hoveredId() { return _hoveredId; },

  get selectedNodes(): NigmaNode[] {
    const page = documentStore.activePage;
    if (!page) return [];
    return [..._selectedIds]
      .map(id => findNodeById(page.children, id))
      .filter(Boolean) as NigmaNode[];
  },

  get singleSelected(): NigmaNode | undefined {
    if (_selectedIds.size !== 1) return undefined;
    const id = [..._selectedIds][0];
    const page = documentStore.activePage;
    if (!page) return undefined;
    return findNodeById(page.children, id);
  },

  select(id: string, additive = false) {
    if (additive) {
      _selectedIds = new Set([..._selectedIds, id]);
    } else {
      _selectedIds = new Set([id]);
    }
  },

  selectMany(ids: string[]) {
    _selectedIds = new Set(ids);
  },

  deselect(id: string) {
    const next = new Set(_selectedIds);
    next.delete(id);
    _selectedIds = next;
  },

  clearSelection() {
    _selectedIds = new Set();
  },

  setHovered(id: string | null) {
    _hoveredId = id;
  },

  isSelected(id: string) {
    return _selectedIds.has(id);
  },
};
