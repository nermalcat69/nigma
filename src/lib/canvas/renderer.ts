import type {
  NigmaNode, FrameNode, RectangleNode, EllipseNode,
  TextNode, LineNode, StickyNode, FreehandNode, TextStyle,
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
    // Use logical (CSS) dimensions, not the inflated physical pixel size
    const dpr = window.devicePixelRatio || 1;
    const logW = ctx.canvas.width / dpr;
    const logH = ctx.canvas.height / dpr;

    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, logW, logH);

    ctx.save();
    // Whole-pixel viewport translation keeps text on pixel boundaries
    ctx.translate(Math.round(viewport.x), Math.round(viewport.y));
    ctx.scale(viewport.zoom, viewport.zoom);

    for (const node of nodes) {
      this.renderNode(node, selectedIds);
    }

    ctx.restore();

    // Selection handles drawn on top
    ctx.save();
    ctx.translate(Math.round(viewport.x), Math.round(viewport.y));
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
    // Whole-pixel node positions keep text / edges crisp
    ctx.translate(Math.round(node.x), Math.round(node.y));
    if (node.rotation !== 0) {
      const cx = node.width / 2;
      const cy = node.height / 2;
      ctx.translate(cx, cy);
      ctx.rotate((node.rotation * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }

    this.applyEffects(node.effects);

    switch (node.type) {
      case 'FRAME':     this.renderFrame(node as FrameNode, selectedIds); break;
      case 'RECTANGLE': this.renderRect(node as RectangleNode);           break;
      case 'ELLIPSE':   this.renderEllipse(node as EllipseNode);          break;
      case 'TEXT':      this.renderText(node as TextNode);                break;
      case 'LINE':      this.renderLine(node as LineNode);                break;
      case 'STICKY':    this.renderSticky(node as StickyNode);            break;
      case 'FREEHAND':  this.renderFreehand(node as FreehandNode);        break;
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
    const fontSize = Math.round(textStyle.fontSize);

    ctx.font = this.cssFont(textStyle, fontSize);
    ctx.textAlign  = textStyle.textAlign.toLowerCase() as CanvasTextAlign;
    ctx.textBaseline = 'top';

    ctx.fillStyle = node.fills.length > 0 && node.fills[0].type === 'SOLID'
      ? this.rgbaToCSS((node.fills[0] as SolidPaint).color)
      : '#000000';

    const lineHeight = textStyle.lineHeight === 'AUTO'
      ? Math.round(fontSize * 1.25)
      : Math.round(textStyle.lineHeight as number);

    const lines = characters.split('\n');
    let xOff = 0;
    if (textStyle.textAlign === 'CENTER') xOff = Math.round(node.width / 2);
    else if (textStyle.textAlign === 'RIGHT') xOff = Math.round(node.width);

    lines.forEach((line, i) => {
      ctx.fillText(line, xOff, Math.round(i * lineHeight), node.width);
    });
  }

  // Map our TextStyle.fontStyle ('Regular', 'Bold', 'Italic', 'Bold Italic')
  // to a valid CSS font shorthand that canvas actually understands.
  private cssFont(ts: TextStyle, size: number): string {
    const style  = ts.fontStyle.includes('Italic') ? 'italic'  : 'normal';
    const weight = ts.fontStyle.includes('Bold')   ? 'bold'    : 'normal';
    // Prefer the named family; fall back to system UI sans-serif
    const family = `"${ts.fontFamily}", -apple-system, BlinkMacSystemFont, sans-serif`;
    return `${style} ${weight} ${size}px ${family}`;
  }

  // ─── Line ────────────────────────────────────────────────────────────────

  private renderLine(node: LineNode) {
    const { ctx } = this;
    if (node.strokes.length === 0) return;
    const stroke = node.strokes[0];
    ctx.beginPath();
    ctx.moveTo(0, Math.round(node.height / 2));
    ctx.lineTo(node.width, Math.round(node.height / 2));
    ctx.strokeStyle = this.rgbaToCSS(stroke.color);
    ctx.lineWidth   = stroke.width;
    ctx.stroke();
  }

  // ─── Sticky ──────────────────────────────────────────────────────────────

  private renderSticky(node: StickyNode) {
    const { ctx } = this;
    const w = Math.round(node.width);
    const h = Math.round(node.height);

    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, 4);
    ctx.fillStyle = node.stickyColor || '#fff9c4';
    ctx.shadowColor = 'rgba(0,0,0,0.15)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
    ctx.fill();
    ctx.shadowColor = 'transparent';

    ctx.fillStyle = '#1a1a1a';
    ctx.font = '13px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textBaseline = 'top';
    const padding = 10;
    const lines = node.characters.split('\n');
    lines.forEach((line, i) => ctx.fillText(line, padding, padding + i * 18, w - padding * 2));
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
    ctx.lineWidth   = node.strokeWidth;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.stroke();
  }

  // ─── Selection handles ────────────────────────────────────────────────────

  private renderSelection(node: NigmaNode) {
    const { ctx } = this;
    const x = Math.round(node.x);
    const y = Math.round(node.y);
    const w = Math.round(node.width);
    const h = Math.round(node.height);
    const HANDLE = 6;

    ctx.strokeStyle = '#007aff';
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([]);
    ctx.strokeRect(x + 0.5, y + 0.5, w, h);

    const handles: [number, number][] = [
      [x, y], [x + w / 2, y], [x + w, y],
      [x + w, y + h / 2],
      [x + w, y + h], [x + w / 2, y + h], [x, y + h],
      [x, y + h / 2],
    ];

    ctx.fillStyle = '#ffffff';
    for (const [hx, hy] of handles) {
      const rx = Math.round(hx) - HANDLE / 2;
      const ry = Math.round(hy) - HANDLE / 2;
      ctx.fillRect(rx, ry, HANDLE, HANDLE);
      ctx.strokeRect(rx + 0.5, ry + 0.5, HANDLE, HANDLE);
    }
  }

  // ─── Utilities ───────────────────────────────────────────────────────────

  private applyFills(fills: Paint[], w: number, h: number) {
    const { ctx } = this;
    for (const fill of fills) {
      if (fill.visible === false) continue;
      if (fill.type === 'SOLID') {
        ctx.fillStyle = this.rgbaToCSS((fill as SolidPaint).color);
        ctx.fill();
      } else if (fill.type === 'LINEAR_GRADIENT') {
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
      ctx.lineWidth   = stroke.width;
      ctx.setLineDash(stroke.dashPattern ?? []);
      ctx.stroke();
    }
  }

  private applyEffects(effects: Effect[]) {
    const { ctx } = this;
    for (const effect of effects) {
      if (effect.visible === false) continue;
      if (effect.type === 'DROP_SHADOW') {
        const s = effect as DropShadowEffect;
        ctx.shadowColor   = this.rgbaToCSS(s.color);
        ctx.shadowOffsetX = s.offset.x;
        ctx.shadowOffsetY = s.offset.y;
        ctx.shadowBlur    = s.radius;
        break;
      }
    }
  }

  private roundRect(w: number, h: number, r: number | [number, number, number, number]) {
    this.ctx.beginPath();
    this.ctx.roundRect(0, 0, w, h, r);
  }

  private cornerRadius(cr: number | [number, number, number, number] | undefined): number | [number, number, number, number] {
    return cr ?? 0;
  }

  rgbaToCSS(c: RGBA): string {
    return `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${c.a})`;
  }
}

// ─── Hit testing ─────────────────────────────────────────────────────────────

export function hitTest(nodes: NigmaNode[], cx: number, cy: number): NigmaNode | undefined {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    if (!node.visible) continue;
    if (cx >= node.x && cx <= node.x + node.width &&
        cy >= node.y && cy <= node.y + node.height) {
      return node;
    }
  }
  return undefined;
}
