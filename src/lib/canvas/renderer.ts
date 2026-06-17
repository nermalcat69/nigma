import type {
  NigmaNode, FrameNode, RectangleNode, EllipseNode,
  TextNode, LineNode, StickyNode, FreehandNode,
  Paint, SolidPaint, Effect, DropShadowEffect,
  RGBA, Viewport,
} from '../types/index.js';

export class Renderer {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  // ─── Main render entry ────────────────────────────────────────────────────

  render(nodes: NigmaNode[], viewport: Viewport, selectedIds: Set<string>) {
    const { ctx } = this;
    const { width, height } = ctx.canvas;

    // Light background
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(viewport.x, viewport.y);
    ctx.scale(viewport.zoom, viewport.zoom);

    for (const node of nodes) {
      this.renderNode(node, selectedIds);
    }

    ctx.restore();

    // Render selection handles on top
    ctx.save();
    ctx.translate(viewport.x, viewport.y);
    ctx.scale(viewport.zoom, viewport.zoom);
    for (const node of nodes) {
      if (selectedIds.has(node.id)) {
        this.renderSelection(node);
      }
    }
    ctx.restore();
  }

  // ─── Node dispatch ────────────────────────────────────────────────────────

  private renderNode(node: NigmaNode, selectedIds: Set<string>) {
    if (!node.visible) return;
    const { ctx } = this;

    ctx.save();
    ctx.globalAlpha = node.opacity;
    ctx.translate(node.x, node.y);
    if (node.rotation !== 0) {
      ctx.translate(node.width / 2, node.height / 2);
      ctx.rotate((node.rotation * Math.PI) / 180);
      ctx.translate(-node.width / 2, -node.height / 2);
    }

    this.applyEffects(node.effects);

    switch (node.type) {
      case 'FRAME':   this.renderFrame(node as FrameNode, selectedIds); break;
      case 'RECTANGLE': this.renderRect(node as RectangleNode); break;
      case 'ELLIPSE': this.renderEllipse(node as EllipseNode); break;
      case 'TEXT':    this.renderText(node as TextNode); break;
      case 'LINE':    this.renderLine(node as LineNode); break;
      case 'STICKY':  this.renderSticky(node as StickyNode); break;
      case 'FREEHAND': this.renderFreehand(node as FreehandNode); break;
      default: break;
    }

    ctx.restore();
  }

  // ─── Frame ───────────────────────────────────────────────────────────────

  private renderFrame(node: FrameNode, selectedIds: Set<string>) {
    const { ctx } = this;
    const r = this.cornerRadius(node.cornerRadius);

    ctx.save();
    this.roundRect(node.width, node.height, r);

    if (node.clipContent) {
      ctx.clip();
    }

    this.applyFills(node.fills, node.width, node.height);
    this.applyStrokes(node);

    for (const child of node.children) {
      this.renderNode(child, selectedIds);
    }
    ctx.restore();
  }

  // ─── Rectangle ──────────────────────────────────────────────────────────

  private renderRect(node: RectangleNode) {
    const { ctx } = this;
    const r = this.cornerRadius(node.cornerRadius);
    this.roundRect(node.width, node.height, r);
    this.applyFills(node.fills, node.width, node.height);
    this.applyStrokes(node);
  }

  // ─── Ellipse ─────────────────────────────────────────────────────────────

  private renderEllipse(node: EllipseNode) {
    const { ctx } = this;
    const cx = node.width / 2;
    const cy = node.height / 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, cx, cy, 0, 0, Math.PI * 2);
    this.applyFills(node.fills, node.width, node.height);
    this.applyStrokes(node);
  }

  // ─── Text ────────────────────────────────────────────────────────────────

  private renderText(node: TextNode) {
    const { ctx } = this;
    const { textStyle, characters } = node;
    const fontSize = textStyle.fontSize;
    ctx.font = `${textStyle.fontStyle} ${fontSize}px "${textStyle.fontFamily}", sans-serif`;
    ctx.textAlign = textStyle.textAlign.toLowerCase() as CanvasTextAlign;
    ctx.textBaseline = 'top';

    if (node.fills.length > 0) {
      const fill = node.fills[0];
      if (fill.type === 'SOLID') {
        ctx.fillStyle = this.rgbaToCSS((fill as SolidPaint).color);
      }
    } else {
      ctx.fillStyle = '#000000';
    }

    const lineHeight = textStyle.lineHeight === 'AUTO'
      ? fontSize * 1.25
      : (textStyle.lineHeight as number);

    const lines = characters.split('\n');
    let xOff = 0;
    if (textStyle.textAlign === 'CENTER') xOff = node.width / 2;
    else if (textStyle.textAlign === 'RIGHT') xOff = node.width;

    lines.forEach((line, i) => {
      ctx.fillText(line, xOff, i * lineHeight, node.width);
    });
  }

  // ─── Line ────────────────────────────────────────────────────────────────

  private renderLine(node: LineNode) {
    const { ctx } = this;
    if (node.strokes.length === 0) return;
    const stroke = node.strokes[0];
    ctx.beginPath();
    ctx.moveTo(0, node.height / 2);
    ctx.lineTo(node.width, node.height / 2);
    ctx.strokeStyle = this.rgbaToCSS(stroke.color);
    ctx.lineWidth = stroke.width;
    ctx.stroke();
  }

  // ─── Sticky ──────────────────────────────────────────────────────────────

  private renderSticky(node: StickyNode) {
    const { ctx } = this;
    ctx.beginPath();
    ctx.roundRect(0, 0, node.width, node.height, 4);
    ctx.fillStyle = node.stickyColor || '#fff9c4';
    ctx.fill();

    // slight shadow
    ctx.shadowColor = 'rgba(0,0,0,0.15)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
    ctx.fill();
    ctx.shadowColor = 'transparent';

    // text
    ctx.fillStyle = '#1a1a1a';
    ctx.font = '13px -apple-system, sans-serif';
    ctx.textBaseline = 'top';
    const padding = 10;
    const lines = node.characters.split('\n');
    lines.forEach((line, i) => ctx.fillText(line, padding, padding + i * 18, node.width - padding * 2));
  }

  // ─── Freehand ────────────────────────────────────────────────────────────

  private renderFreehand(node: FreehandNode) {
    const { ctx } = this;
    if (node.points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(node.points[0].x, node.points[0].y);
    for (let i = 1; i < node.points.length; i++) {
      ctx.lineTo(node.points[i].x, node.points[i].y);
    }
    ctx.strokeStyle = this.rgbaToCSS(node.strokeColor);
    ctx.lineWidth = node.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }

  // ─── Selection handles ────────────────────────────────────────────────────

  private renderSelection(node: NigmaNode) {
    const { ctx } = this;
    const PAD = 0;
    const x = node.x - PAD;
    const y = node.y - PAD;
    const w = node.width + PAD * 2;
    const h = node.height + PAD * 2;
    const HANDLE = 6;

    ctx.strokeStyle = '#007aff';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    ctx.strokeRect(x, y, w, h);

    // Corner + midpoint handles
    const handles = [
      [x, y], [x + w / 2, y], [x + w, y],
      [x + w, y + h / 2],
      [x + w, y + h], [x + w / 2, y + h], [x, y + h],
      [x, y + h / 2],
    ];

    ctx.fillStyle = '#ffffff';
    for (const [hx, hy] of handles) {
      ctx.fillRect(hx - HANDLE / 2, hy - HANDLE / 2, HANDLE, HANDLE);
      ctx.strokeRect(hx - HANDLE / 2, hy - HANDLE / 2, HANDLE, HANDLE);
    }
  }

  // ─── Utilities ───────────────────────────────────────────────────────────

  private applyFills(fills: Paint[], w: number, h: number) {
    const { ctx } = this;
    for (const fill of fills) {
      if (fill.visible === false) continue;
      if (fill.type === 'SOLID') {
        const c = (fill as SolidPaint).color;
        ctx.fillStyle = this.rgbaToCSS(c);
        ctx.fill();
      } else if (fill.type === 'LINEAR_GRADIENT') {
        // basic gradient support
        const grad = ctx.createLinearGradient(0, 0, w, h);
        ctx.fillStyle = grad;
        ctx.fill();
      }
    }
  }

  private applyStrokes(node: NigmaNode) {
    const { ctx } = this;
    for (const stroke of node.strokes) {
      if (stroke.visible === false) continue;
      ctx.strokeStyle = this.rgbaToCSS(stroke.color);
      ctx.lineWidth = stroke.width;
      if (stroke.dashPattern) {
        ctx.setLineDash(stroke.dashPattern);
      } else {
        ctx.setLineDash([]);
      }
      ctx.stroke();
    }
  }

  private applyEffects(effects: Effect[]) {
    const { ctx } = this;
    for (const effect of effects) {
      if (effect.visible === false) continue;
      if (effect.type === 'DROP_SHADOW') {
        const s = effect as DropShadowEffect;
        ctx.shadowColor = this.rgbaToCSS(s.color);
        ctx.shadowOffsetX = s.offset.x;
        ctx.shadowOffsetY = s.offset.y;
        ctx.shadowBlur = s.radius;
        break;
      }
    }
  }

  private roundRect(w: number, h: number, r: number | [number, number, number, number]) {
    const { ctx } = this;
    ctx.beginPath();
    if (typeof r === 'number') {
      ctx.roundRect(0, 0, w, h, r);
    } else {
      ctx.roundRect(0, 0, w, h, r);
    }
  }

  private cornerRadius(cr: number | [number, number, number, number] | undefined): number | [number, number, number, number] {
    return cr ?? 0;
  }

  rgbaToCSS(c: RGBA): string {
    const r = Math.round(c.r * 255);
    const g = Math.round(c.g * 255);
    const b = Math.round(c.b * 255);
    return `rgba(${r},${g},${b},${c.a})`;
  }
}

// ─── Hit testing ─────────────────────────────────────────────────────────────

export function hitTest(nodes: NigmaNode[], cx: number, cy: number): NigmaNode | undefined {
  // Test in reverse order (top-most first)
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    if (!node.visible) continue;
    if (
      cx >= node.x && cx <= node.x + node.width &&
      cy >= node.y && cy <= node.y + node.height
    ) {
      return node;
    }
  }
  return undefined;
}
