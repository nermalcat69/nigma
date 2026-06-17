<script lang="ts">
  import { onMount } from 'svelte';
  import { Renderer, hitTest } from '../canvas/renderer.js';
  import { toolStore } from '../stores/tool.svelte.js';
  import { documentStore } from '../stores/document.svelte.js';
  import { selectionStore } from '../stores/selection.svelte.js';
  import { historyStore } from '../stores/history.svelte.js';
  import { makeRect, makeEllipse, makeLine, makeText, makeSticky, makeFreehand, makeFrame } from '../canvas/nodes.js';
  import type { NigmaNode } from '../types/index.js';

  // bind:this requires $state; everything else is plain let
  let canvasEl = $state<HTMLCanvasElement | null>(null);

  // Plain variables — NOT $state so they never trigger the render $effect
  let renderer: Renderer | null = null;
  let animFrame = 0;           // critical: $state here causes an infinite loop
  let drawStart = { x: 0, y: 0 };
  let dragStart = { x: 0, y: 0 };
  let dragOrigin = new Map<string, { x: number; y: number }>();
  let lastPan = { x: 0, y: 0 };
  let freehandPoints: { x: number; y: number }[] = [];

  // $state only for values the template / $derived cursor actually reads
  let isPanning = $state(false);
  let isDragging = $state(false);
  let isDrawing = $state(false);
  let previewNode = $state<NigmaNode | null>(null);

  let hasNodes = $derived((documentStore.activePage?.children.length ?? 0) > 0);

  // Re-render whenever store state or preview changes
  $effect(() => {
    void documentStore.revision;
    void toolStore.viewport;
    void selectionStore.selectedIds;
    void previewNode;
    scheduleRender();
  });

  function scheduleRender() {
    cancelAnimationFrame(animFrame);
    animFrame = requestAnimationFrame(doRender);
  }

  function doRender() {
    if (!renderer || !canvasEl) return;
    const page = documentStore.activePage;
    const nodes: NigmaNode[] = page
      ? [...page.children, ...(previewNode ? [previewNode] : [])]
      : [];
    renderer.render(nodes, toolStore.viewport, selectionStore.selectedIds);
  }

  onMount(() => {
    if (!canvasEl) return;
    const ctx = canvasEl.getContext('2d')!;
    renderer = new Renderer(ctx);
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvasEl.parentElement!);
    return () => ro.disconnect();
  });

  function resize() {
    if (!canvasEl) return;
    const parent = canvasEl.parentElement!;
    const dpr = window.devicePixelRatio || 1;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    canvasEl.width = w * dpr;
    canvasEl.height = h * dpr;
    canvasEl.style.width = `${w}px`;
    canvasEl.style.height = `${h}px`;
    const ctx = canvasEl.getContext('2d')!;
    ctx.scale(dpr, dpr);
    scheduleRender();
  }

  function getCanvasPos(e: MouseEvent) {
    if (!canvasEl) return { x: 0, y: 0 };
    const rect = canvasEl.getBoundingClientRect();
    return toolStore.screenToCanvas(e.clientX - rect.left, e.clientY - rect.top);
  }

  function onMouseDown(e: MouseEvent) {
    if (e.button === 1) {
      isPanning = true;
      lastPan = { x: e.clientX, y: e.clientY };
      return;
    }

    const tool = toolStore.activeTool;
    const { x, y } = getCanvasPos(e);

    if (tool === 'HAND') {
      isPanning = true;
      lastPan = { x: e.clientX, y: e.clientY };
      return;
    }

    if (tool === 'SELECT') {
      const page = documentStore.activePage;
      const hit = page ? hitTest(page.children, x, y) : undefined;
      if (hit && !hit.locked) {
        if (!selectionStore.isSelected(hit.id)) {
          selectionStore.select(hit.id, e.shiftKey);
        }
        const origins = new Map<string, { x: number; y: number }>();
        for (const id of selectionStore.selectedIds) {
          const n = page?.children.find(c => c.id === id);
          if (n) origins.set(id, { x: n.x, y: n.y });
        }
        dragOrigin = origins;
        dragStart = { x, y };
        isDragging = true;
      } else if (!e.shiftKey) {
        selectionStore.clearSelection();
      }
      return;
    }

    if (tool === 'FREEHAND') {
      isDrawing = true;
      freehandPoints = [{ x, y }];
      return;
    }

    isDrawing = true;
    drawStart = { x, y };
  }

  function onMouseMove(e: MouseEvent) {
    if (!canvasEl) return;
    const { x, y } = getCanvasPos(e);

    if (isPanning) {
      toolStore.panBy(e.clientX - lastPan.x, e.clientY - lastPan.y);
      lastPan = { x: e.clientX, y: e.clientY };
      return;
    }

    if (isDragging) {
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;
      for (const [id, origin] of dragOrigin) {
        documentStore.updateNode(id, { x: origin.x + dx, y: origin.y + dy });
      }
      return;
    }

    if (isDrawing) {
      const tool = toolStore.activeTool;
      if (tool === 'FREEHAND') {
        freehandPoints = [...freehandPoints, { x, y }];
        previewNode = makeFreehand(freehandPoints);
        return;
      }
      const x0 = Math.min(drawStart.x, x);
      const y0 = Math.min(drawStart.y, y);
      const w = Math.abs(x - drawStart.x);
      const h = Math.abs(y - drawStart.y);
      if (w < 1 || h < 1) return;
      if (tool === 'FRAME')     previewNode = makeFrame(x0, y0, w, h);
      else if (tool === 'RECTANGLE') previewNode = makeRect(x0, y0, w, h);
      else if (tool === 'ELLIPSE')   previewNode = makeEllipse(x0, y0, w, h);
      else if (tool === 'LINE')      previewNode = makeLine(x0, y0, w);
    }
  }

  function onMouseUp(e: MouseEvent) {
    const tool = toolStore.activeTool;
    const { x, y } = getCanvasPos(e);

    isPanning = false;

    if (isDragging) {
      isDragging = false;
      historyStore.push('Move');
      documentStore.markDirty();
      return;
    }

    if (isDrawing) {
      isDrawing = false;

      if (tool === 'FREEHAND') {
        if (freehandPoints.length > 2) {
          historyStore.push('Draw freehand');
          documentStore.addNode(makeFreehand(freehandPoints));
        }
        freehandPoints = [];
        previewNode = null;
        return;
      }

      if (tool === 'TEXT') {
        historyStore.push('Add text');
        documentStore.addNode(makeText(x - 60, y - 12));
        previewNode = null;
        toolStore.setTool('SELECT');
        return;
      }

      if (tool === 'STICKY') {
        historyStore.push('Add sticky');
        documentStore.addNode(makeSticky(x - 90, y - 70));
        previewNode = null;
        toolStore.setTool('SELECT');
        return;
      }

      if (previewNode && previewNode.width >= 4 && previewNode.height >= 4) {
        historyStore.push(`Add ${tool.toLowerCase()}`);
        documentStore.addNode({ ...previewNode });
        selectionStore.select(previewNode.id);
      }
      previewNode = null;
      toolStore.setTool('SELECT');
    }
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      if (!canvasEl) return;
      const rect = canvasEl.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const delta = e.deltaY > 0 ? 1 / 1.1 : 1.1;
      toolStore.zoomTo(toolStore.viewport.zoom * delta, sx, sy);
    } else {
      toolStore.panBy(-e.deltaX, -e.deltaY);
    }
  }

  function onDblClick(e: MouseEvent) {
    if (toolStore.activeTool !== 'SELECT') return;
    const { x, y } = getCanvasPos(e);
    historyStore.push('Add text');
    const node = makeText(x - 60, y - 12);
    documentStore.addNode(node);
    selectionStore.select(node.id);
  }

  let cursor = $derived(
    toolStore.activeTool === 'HAND'   ? (isPanning  ? 'grabbing' : 'grab')
    : toolStore.activeTool === 'SELECT' ? (isDragging ? 'move'     : 'default')
    : toolStore.activeTool === 'TEXT'   ? 'text'
    : 'crosshair'
  );
</script>

<div style="position:relative;flex:1;overflow:hidden;background:#f0f0f0;">
  <!-- Dot grid background -->
  <svg style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
        <circle cx="1" cy="1" r="1" fill="#ccc" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#dots)" />
  </svg>

  <canvas
    bind:this={canvasEl}
    style="position:absolute;inset:0;cursor:{cursor};"
    onmousedown={onMouseDown}
    onmousemove={onMouseMove}
    onmouseup={onMouseUp}
    onmouseleave={onMouseUp}
    ondblclick={onDblClick}
    onwheel={onWheel}
  ></canvas>

  {#if !hasNodes}
    <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;gap:8px;">
      <p style="color:#aaa;font-size:14px;text-align:center;line-height:1.7;margin:0;">
        Pick a tool from the toolbar to start drawing<br/>
        <span style="font-size:12px;color:#bbb;">or double-click to add text</span>
      </p>
    </div>
  {/if}

  <!-- Zoom badge -->
  <div style="position:absolute;bottom:12px;right:12px;font-size:11px;color:#999;background:rgba(255,255,255,0.85);backdrop-filter:blur(4px);padding:4px 9px;border-radius:6px;border:1px solid #e8e8e8;pointer-events:none;font-variant-numeric:tabular-nums;">
    {Math.round(toolStore.viewport.zoom * 100)}%
  </div>
</div>
