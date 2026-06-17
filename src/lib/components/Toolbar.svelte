<script lang="ts">
  import {
    MousePointer2, Hand, Frame, Square, Circle, Minus, Type,
    Pen, Edit3, StickyNote, Link,
    Undo2, Redo2, ZoomIn, ZoomOut, Maximize2,
    FolderOpen, Save, LayoutDashboard,
  } from 'lucide-svelte';
  import { toolStore } from '../stores/tool.svelte.js';
  import { historyStore } from '../stores/history.svelte.js';
  import { documentStore } from '../stores/document.svelte.js';
  import { openDocumentDialog, saveDocumentDialog, saveDocument } from '../commands/index.js';
  import { goto } from '$app/navigation';
  import type { Tool } from '../types/index.js';

  interface ToolDef { id: Tool; Icon: unknown; label: string; shortcut: string; }

  const tools: ToolDef[] = [
    { id: 'SELECT',    Icon: MousePointer2,      label: 'Select',    shortcut: 'V' },
    { id: 'HAND',      Icon: Hand,               label: 'Hand',      shortcut: 'H' },
    { id: 'FRAME',     Icon: Frame,              label: 'Frame',     shortcut: 'F' },
    { id: 'RECTANGLE', Icon: Square,             label: 'Rectangle', shortcut: 'R' },
    { id: 'ELLIPSE',   Icon: Circle,        label: 'Ellipse',   shortcut: 'O' },
    { id: 'LINE',      Icon: Minus,         label: 'Line',      shortcut: 'L' },
    { id: 'TEXT',      Icon: Type,          label: 'Text',      shortcut: 'T' },
    { id: 'PEN',       Icon: Pen,           label: 'Pen',       shortcut: 'P' },
    { id: 'FREEHAND',  Icon: Edit3,         label: 'Draw',      shortcut: 'D' },
    { id: 'STICKY',    Icon: StickyNote,    label: 'Sticky',    shortcut: 'S' },
    { id: 'CONNECTOR', Icon: Link,          label: 'Connector', shortcut: 'C' },
  ];

  let zoomPct = $derived(Math.round(toolStore.viewport.zoom * 100));

  async function handleOpen() {
    const doc = await openDocumentDialog();
    if (doc) { documentStore.setDocument(doc); historyStore.clear(); }
  }

  async function handleSave() {
    const doc = documentStore.doc;
    if (doc.filePath) {
      await saveDocument(doc.filePath, doc);
      documentStore.markClean();
    } else {
      const path = await saveDocumentDialog(doc);
      if (path) { documentStore.doc.filePath = path; documentStore.markClean(); }
    }
  }
</script>

<header style="
  display: flex;
  align-items: center;
  gap: 2px;
  height: 52px;
  padding: 0 12px;
  background: #ffffff;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
  z-index: 20;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
">
  <!-- Home -->
  <button
    onclick={() => goto('/')}
    title="Dashboard"
    style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:8px;border:none;background:transparent;cursor:pointer;color:#555;transition:background 0.15s;"
    onmouseenter={(e) => (e.currentTarget as HTMLElement).style.background='#f0f0f0'}
    onmouseleave={(e) => (e.currentTarget as HTMLElement).style.background='transparent'}
  >
    <LayoutDashboard size={18} />
  </button>

  <span style="font-weight:700;font-size:15px;color:#111;margin:0 8px 0 2px;letter-spacing:-0.3px;">Nigma</span>

  <!-- File actions -->
  <button onclick={handleOpen} title="Open (Ctrl+O)" style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:8px;border:none;background:transparent;cursor:pointer;color:#555;transition:background 0.15s;" onmouseenter={(e) => (e.currentTarget as HTMLElement).style.background='#f0f0f0'} onmouseleave={(e) => (e.currentTarget as HTMLElement).style.background='transparent'}>
    <FolderOpen size={17} />
  </button>
  <button onclick={handleSave} title="Save (Ctrl+S)" style={`display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:8px;border:none;background:transparent;cursor:pointer;color:${documentStore.isDirty ? '#111' : '#aaa'};transition:background 0.15s;`} onmouseenter={(e) => (e.currentTarget as HTMLElement).style.background='#f0f0f0'} onmouseleave={(e) => (e.currentTarget as HTMLElement).style.background='transparent'}>
    <Save size={17} />
  </button>

  <!-- Divider -->
  <div style="width:1px;height:24px;background:#e0e0e0;margin:0 6px;"></div>

  <!-- Tool buttons -->
  {#each tools as tool (tool.id)}
    {@const ToolIcon = tool.Icon as typeof MousePointer2}
    {@const active = toolStore.activeTool === tool.id}
    <button
      onclick={() => toolStore.setTool(tool.id)}
      title="{tool.label} ({tool.shortcut})"
      style={`display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:8px;border:none;cursor:pointer;transition:background 0.15s;${active ? 'background:#111;color:#fff;' : 'background:transparent;color:#555;'}`}
      onmouseenter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background='#f0f0f0'; }}
      onmouseleave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background='transparent'; }}
    >
      <ToolIcon size={17} />
    </button>
  {/each}

  <div style="flex:1;"></div>

  <!-- Undo / Redo -->
  <button
    onclick={() => historyStore.undo()}
    disabled={!historyStore.canUndo}
    title="Undo (Ctrl+Z)"
    style={`display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:8px;border:none;background:transparent;cursor:${historyStore.canUndo ? 'pointer' : 'default'};color:${historyStore.canUndo ? '#555' : '#ccc'};transition:background 0.15s;`}
    onmouseenter={(e) => { if (historyStore.canUndo) (e.currentTarget as HTMLElement).style.background='#f0f0f0'; }}
    onmouseleave={(e) => (e.currentTarget as HTMLElement).style.background='transparent'}
  >
    <Undo2 size={17} />
  </button>
  <button
    onclick={() => historyStore.redo()}
    disabled={!historyStore.canRedo}
    title="Redo (Ctrl+Shift+Z)"
    style={`display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:8px;border:none;background:transparent;cursor:${historyStore.canRedo ? 'pointer' : 'default'};color:${historyStore.canRedo ? '#555' : '#ccc'};transition:background 0.15s;`}
    onmouseenter={(e) => { if (historyStore.canRedo) (e.currentTarget as HTMLElement).style.background='#f0f0f0'; }}
    onmouseleave={(e) => (e.currentTarget as HTMLElement).style.background='transparent'}
  >
    <Redo2 size={17} />
  </button>

  <div style="width:1px;height:24px;background:#e0e0e0;margin:0 6px;"></div>

  <!-- Zoom -->
  <button onclick={() => toolStore.zoomOut()} title="Zoom out" style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:8px;border:none;background:transparent;cursor:pointer;color:#555;" onmouseenter={(e) => (e.currentTarget as HTMLElement).style.background='#f0f0f0'} onmouseleave={(e) => (e.currentTarget as HTMLElement).style.background='transparent'}>
    <ZoomOut size={17} />
  </button>
  <span style="font-size:12px;color:#777;width:42px;text-align:center;font-variant-numeric:tabular-nums;">{zoomPct}%</span>
  <button onclick={() => toolStore.zoomIn()} title="Zoom in" style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:8px;border:none;background:transparent;cursor:pointer;color:#555;" onmouseenter={(e) => (e.currentTarget as HTMLElement).style.background='#f0f0f0'} onmouseleave={(e) => (e.currentTarget as HTMLElement).style.background='transparent'}>
    <ZoomIn size={17} />
  </button>
  <button onclick={() => toolStore.resetZoom()} title="Reset zoom (0)" style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:8px;border:none;background:transparent;cursor:pointer;color:#555;" onmouseenter={(e) => (e.currentTarget as HTMLElement).style.background='#f0f0f0'} onmouseleave={(e) => (e.currentTarget as HTMLElement).style.background='transparent'}>
    <Maximize2 size={17} />
  </button>

  {#if documentStore.isDirty}
    <div style="width:8px;height:8px;border-radius:50%;background:#f59e0b;margin-left:4px;" title="Unsaved changes"></div>
  {/if}
</header>
