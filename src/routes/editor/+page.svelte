<script lang="ts">
  import '../../app.css';
  import Toolbar from '$lib/components/Toolbar.svelte';
  import LayersPanel from '$lib/components/LayersPanel.svelte';
  import InspectorPanel from '$lib/components/InspectorPanel.svelte';
  import Canvas from '$lib/components/Canvas.svelte';
  import { toolStore } from '$lib/stores/tool.svelte.js';
  import { historyStore } from '$lib/stores/history.svelte.js';
  import { documentStore } from '$lib/stores/document.svelte.js';
  import { selectionStore } from '$lib/stores/selection.svelte.js';
  import { openDocumentDialog, saveDocumentDialog, saveDocument } from '$lib/commands/index.js';

  // Auto-save: 2 seconds after the last change, if a file path is set
  let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
  $effect(() => {
    void documentStore.revision; // subscribe to mutations
    if (!documentStore.isDirty || !documentStore.doc.filePath) return;
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(async () => {
      const path = documentStore.doc.filePath;
      if (!path) return;
      try {
        await saveDocument(path, documentStore.doc);
        documentStore.markClean();
      } catch { /* silent – user can still Ctrl+S manually */ }
    }, 2000);
  });

  function onKeydown(e: KeyboardEvent) {
    const tag = (e.target as HTMLElement).tagName;
    const isInput = tag === 'INPUT' || tag === 'TEXTAREA';

    if (!isInput) {
      switch (e.key.toLowerCase()) {
        case 'v': toolStore.setTool('SELECT'); break;
        case 'h': toolStore.setTool('HAND'); break;
        case 'f': toolStore.setTool('FRAME'); break;
        case 'r': toolStore.setTool('RECTANGLE'); break;
        case 'o': toolStore.setTool('ELLIPSE'); break;
        case 'l': toolStore.setTool('LINE'); break;
        case 't': toolStore.setTool('TEXT'); break;
        case 'p': toolStore.setTool('PEN'); break;
        case 'd': toolStore.setTool('FREEHAND'); break;
        case '=': case '+': toolStore.zoomIn(); e.preventDefault(); break;
        case '-': toolStore.zoomOut(); e.preventDefault(); break;
        case '0': toolStore.resetZoom(); e.preventDefault(); break;
        case 'escape': selectionStore.clearSelection(); break;
        case 'delete': case 'backspace':
          for (const id of selectionStore.selectedIds) { historyStore.push('Delete'); documentStore.deleteNode(id); }
          selectionStore.clearSelection();
          break;
      }
      if (e.key.toLowerCase() === 's' && !e.ctrlKey && !e.metaKey) { toolStore.setTool('STICKY'); }
    }

    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'z': e.preventDefault(); e.shiftKey ? historyStore.redo() : historyStore.undo(); break;
        case 'y': e.preventDefault(); historyStore.redo(); break;
        case 's': e.preventDefault(); handleSave(); break;
        case 'o': e.preventDefault(); handleOpen(); break;
        case 'n': e.preventDefault(); documentStore.newDocument(); historyStore.clear(); break;
        case 'a':
          if (!isInput) {
            e.preventDefault();
            const page = documentStore.activePage;
            if (page) selectionStore.selectMany(page.children.map(n => n.id));
          }
          break;
      }
    }
  }

  async function handleSave() {
    const doc = documentStore.doc;
    if (doc.filePath) { await saveDocument(doc.filePath, doc); documentStore.markClean(); }
    else { const path = await saveDocumentDialog(doc); if (path) { documentStore.doc.filePath = path; documentStore.markClean(); } }
  }

  async function handleOpen() {
    const doc = await openDocumentDialog();
    if (doc) { documentStore.setDocument(doc); historyStore.clear(); }
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div style="display:flex;flex-direction:column;width:100%;height:100vh;overflow:hidden;background:#f5f5f5;">
  <Toolbar />
  <div style="display:flex;flex:1;overflow:hidden;">
    <LayersPanel />
    <Canvas />
    <InspectorPanel />
  </div>
</div>
