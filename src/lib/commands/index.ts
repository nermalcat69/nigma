import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import type { NigmaDocument } from '../types/index.js';

// ─── File I/O ─────────────────────────────────────────────────────────────────

export async function openDocumentDialog(): Promise<NigmaDocument | null> {
  const path = await open({
    title: 'Open Nigma File',
    filters: [{ name: 'Nigma Files', extensions: ['nigma', 'json'] }],
    multiple: false,
  });
  if (!path || typeof path !== 'string') return null;
  return invoke<NigmaDocument>('open_document', { path });
}

export async function saveDocumentDialog(doc: NigmaDocument): Promise<string | null> {
  const path = await save({
    title: 'Save Nigma File',
    defaultPath: `${doc.name}.nigma`,
    filters: [{ name: 'Nigma Files', extensions: ['nigma'] }],
  });
  if (!path) return null;
  await invoke('save_document', { path, document: doc });
  return path;
}

export async function saveDocument(path: string, doc: NigmaDocument): Promise<void> {
  await invoke('save_document', { path, document: doc });
}

// ─── Export ──────────────────────────────────────────────────────────────────

export async function exportToPng(canvasDataUrl: string, name: string): Promise<void> {
  const path = await save({
    title: 'Export PNG',
    defaultPath: `${name}.png`,
    filters: [{ name: 'PNG Image', extensions: ['png'] }],
  });
  if (!path) return;
  // Strip data URL prefix and pass base64 to Rust
  const base64 = canvasDataUrl.replace(/^data:image\/png;base64,/, '');
  await invoke('export_png', { path, data: base64 });
}

export async function exportToSvg(svgContent: string, name: string): Promise<void> {
  const path = await save({
    title: 'Export SVG',
    defaultPath: `${name}.svg`,
    filters: [{ name: 'SVG File', extensions: ['svg'] }],
  });
  if (!path) return;
  await invoke('export_svg', { path, content: svgContent });
}

// ─── SVG serializer (basic) ──────────────────────────────────────────────────

export function serializeToSvg(doc: NigmaDocument): string {
  const page = doc.pages[0];
  if (!page) return '<svg xmlns="http://www.w3.org/2000/svg"></svg>';

  const inner = page.children.map(node => {
    if (node.type === 'RECTANGLE') {
      const fill = node.fills[0];
      const color = fill?.type === 'SOLID'
        ? `rgba(${Math.round(fill.color.r * 255)},${Math.round(fill.color.g * 255)},${Math.round(fill.color.b * 255)},${fill.color.a})`
        : 'none';
      return `<rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" fill="${color}" />`;
    }
    if (node.type === 'ELLIPSE') {
      const cx = node.x + node.width / 2;
      const cy = node.y + node.height / 2;
      const fill = node.fills[0];
      const color = fill?.type === 'SOLID'
        ? `rgba(${Math.round(fill.color.r * 255)},${Math.round(fill.color.g * 255)},${Math.round(fill.color.b * 255)},${fill.color.a})`
        : 'none';
      return `<ellipse cx="${cx}" cy="${cy}" rx="${node.width / 2}" ry="${node.height / 2}" fill="${color}" />`;
    }
    if (node.type === 'TEXT') {
      const fill = node.fills[0];
      const color = fill?.type === 'SOLID'
        ? `rgba(${Math.round(fill.color.r * 255)},${Math.round(fill.color.g * 255)},${Math.round(fill.color.b * 255)},${fill.color.a})`
        : '#000';
      return `<text x="${node.x}" y="${node.y + node.textStyle.fontSize}" font-size="${node.textStyle.fontSize}" fill="${color}">${node.characters}</text>`;
    }
    return '';
  }).join('\n  ');

  const allX = page.children.map(n => n.x);
  const allY = page.children.map(n => n.y);
  const allW = page.children.map(n => n.x + n.width);
  const allH = page.children.map(n => n.y + n.height);
  const vw = Math.max(800, ...allW) - Math.min(0, ...allX);
  const vh = Math.max(600, ...allH) - Math.min(0, ...allY);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${vw}" height="${vh}" viewBox="0 0 ${vw} ${vh}">
  ${inner}
</svg>`;
}

// ─── Clipboard ───────────────────────────────────────────────────────────────

export async function readClipboardText(): Promise<string | null> {
  try {
    return await invoke<string>('read_clipboard');
  } catch {
    return null;
  }
}
