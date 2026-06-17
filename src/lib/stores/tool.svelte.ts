import type { Tool, Viewport } from '../types/index.js';

let _activeTool = $state<Tool>('SELECT');
let _viewport = $state<Viewport>({ x: 0, y: 0, zoom: 1 });

export const toolStore = {
  get activeTool() { return _activeTool; },
  get viewport() { return _viewport; },

  setTool(tool: Tool) {
    _activeTool = tool;
  },

  setViewport(vp: Partial<Viewport>) {
    _viewport = { ..._viewport, ...vp };
  },

  panBy(dx: number, dy: number) {
    _viewport = { ..._viewport, x: _viewport.x + dx, y: _viewport.y + dy };
  },

  zoomTo(zoom: number, cx: number, cy: number) {
    const prev = _viewport.zoom;
    const clamped = Math.min(Math.max(zoom, 0.05), 256);
    // Zoom toward canvas point (cx, cy)
    const dx = cx - _viewport.x;
    const dy = cy - _viewport.y;
    _viewport = {
      x: _viewport.x + dx - dx * (clamped / prev),
      y: _viewport.y + dy - dy * (clamped / prev),
      zoom: clamped,
    };
  },

  zoomIn() {
    this.zoomTo(_viewport.zoom * 1.2, 0, 0);
  },

  zoomOut() {
    this.zoomTo(_viewport.zoom / 1.2, 0, 0);
  },

  resetZoom() {
    _viewport = { x: 0, y: 0, zoom: 1 };
  },

  // Convert screen coordinates to canvas/document coordinates
  screenToCanvas(sx: number, sy: number): { x: number; y: number } {
    return {
      x: (sx - _viewport.x) / _viewport.zoom,
      y: (sy - _viewport.y) / _viewport.zoom,
    };
  },

  // Convert canvas coordinates to screen coordinates
  canvasToScreen(cx: number, cy: number): { x: number; y: number } {
    return {
      x: cx * _viewport.zoom + _viewport.x,
      y: cy * _viewport.zoom + _viewport.y,
    };
  },
};
