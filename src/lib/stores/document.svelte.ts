import { v4 as uuidv4 } from 'uuid';
import type { NigmaDocument, Page, NigmaNode } from '../types/index.js';

function createEmptyDocument(): NigmaDocument {
  const pageId = uuidv4();
  return {
    id: uuidv4(),
    name: 'Untitled',
    version: '0.1.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pages: [
      {
        id: pageId,
        name: 'Page 1',
        children: [],
        background: { r: 0.24, g: 0.24, b: 0.24, a: 1 },
        interactions: [],
      },
    ],
    components: [],
    styles: [],
  };
}

// ─── Document Store ───────────────────────────────────────────────────────────

let _doc = $state<NigmaDocument>(createEmptyDocument());
let _activePageId = $state<string>(_doc.pages[0].id);
let _isDirty = $state(false);
let _revision = $state(0);

export const documentStore = {
  get doc() { return _doc; },
  get activePageId() { return _activePageId; },
  get isDirty() { return _isDirty; },
  get revision() { return _revision; },

  get activePage(): Page | undefined {
    return _doc.pages.find(p => p.id === _activePageId);
  },

  setDocument(doc: NigmaDocument) {
    _doc = doc;
    _activePageId = doc.pages[0]?.id ?? '';
    _isDirty = false;
  },

  setActivePageId(id: string) {
    _activePageId = id;
  },

  markDirty() {
    _isDirty = true;
    _revision++;
    _doc.updatedAt = new Date().toISOString();
  },

  markClean() {
    _isDirty = false;
  },

  // ─── Node mutations ────────────────────────────────────────────────────────

  addNode(node: NigmaNode, parentId?: string) {
    const page = this.activePage;
    if (!page) return;

    if (parentId) {
      const parent = findNodeById(page.children, parentId);
      if (parent && 'children' in parent) {
        (parent as { children: NigmaNode[] }).children.push(node);
      }
    } else {
      page.children.push(node);
    }
    this.markDirty();
  },

  updateNode(id: string, updates: Partial<NigmaNode>) {
    const page = this.activePage;
    if (!page) return;
    const node = findNodeById(page.children, id);
    if (node) {
      Object.assign(node, updates);
      this.markDirty();
    }
  },

  deleteNode(id: string) {
    const page = this.activePage;
    if (!page) return;
    page.children = removeNodeById(page.children, id);
    this.markDirty();
  },

  addPage() {
    const page: Page = {
      id: uuidv4(),
      name: `Page ${_doc.pages.length + 1}`,
      children: [],
      background: { r: 0.24, g: 0.24, b: 0.24, a: 1 },
      interactions: [],
    };
    _doc.pages.push(page);
    _activePageId = page.id;
    this.markDirty();
  },

  renamePage(id: string, name: string) {
    const page = _doc.pages.find(p => p.id === id);
    if (page) {
      page.name = name;
      this.markDirty();
    }
  },

  deletePage(id: string) {
    if (_doc.pages.length <= 1) return;
    _doc.pages = _doc.pages.filter(p => p.id !== id);
    if (_activePageId === id) {
      _activePageId = _doc.pages[0].id;
    }
    this.markDirty();
  },

  newDocument() {
    _doc = createEmptyDocument();
    _activePageId = _doc.pages[0].id;
    _isDirty = false;
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function findNodeById(nodes: NigmaNode[], id: string): NigmaNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    if ('children' in node) {
      const found = findNodeById((node as { children: NigmaNode[] }).children, id);
      if (found) return found;
    }
  }
  return undefined;
}

function removeNodeById(nodes: NigmaNode[], id: string): NigmaNode[] {
  return nodes
    .filter(n => n.id !== id)
    .map(n => {
      if ('children' in n) {
        return { ...n, children: removeNodeById((n as { children: NigmaNode[] }).children, id) };
      }
      return n;
    });
}
