import { v4 as uuidv4 } from 'uuid';
import type {
  RectangleNode, EllipseNode, TextNode, LineNode,
  FrameNode, StickyNode, FreehandNode, NigmaNode,
  Paint, SolidPaint,
} from '../types/index.js';

const DEFAULT_FILL: SolidPaint = {
  type: 'SOLID',
  color: { r: 0.85, g: 0.85, b: 0.85, a: 1 },
  visible: true,
};

function base(type: NigmaNode['type'], x: number, y: number, w: number, h: number): Omit<NigmaNode, 'type'> {
  return {
    id: uuidv4(),
    name: type.charAt(0) + type.slice(1).toLowerCase(),
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: 'NORMAL',
    x, y, width: w, height: h,
    rotation: 0,
    fills: [{ ...DEFAULT_FILL }],
    strokes: [],
    effects: [],
  };
}

export function makeRect(x: number, y: number, w = 100, h = 100): RectangleNode {
  return { ...base('RECTANGLE', x, y, w, h), type: 'RECTANGLE', cornerRadius: 0 } as RectangleNode;
}

export function makeEllipse(x: number, y: number, w = 100, h = 100): EllipseNode {
  return { ...base('ELLIPSE', x, y, w, h), type: 'ELLIPSE' } as EllipseNode;
}

export function makeLine(x: number, y: number, w = 150): LineNode {
  return {
    ...base('LINE', x, y, w, 1),
    type: 'LINE',
    fills: [],
    strokes: [{
      color: { r: 0.13, g: 0.13, b: 0.13, a: 1 },
      width: 2,
      align: 'CENTER',
      visible: true,
    }],
  } as LineNode;
}

export function makeText(x: number, y: number): TextNode {
  return {
    ...base('TEXT', x, y, 200, 30),
    type: 'TEXT',
    fills: [{ type: 'SOLID', color: { r: 0.067, g: 0.067, b: 0.067, a: 1 }, visible: true }],
    characters: 'Type here',
    textStyle: {
      fontFamily: 'Inter',
      fontStyle: 'Regular',
      fontSize: 16,
      lineHeight: 'AUTO',
      letterSpacing: 0,
      textAlign: 'LEFT',
      textDecoration: 'NONE',
    },
  } as TextNode;
}

export function makeFrame(x: number, y: number, w = 400, h = 300): FrameNode {
  return {
    ...base('FRAME', x, y, w, h),
    type: 'FRAME',
    fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true }],
    children: [],
    clipContent: true,
    cornerRadius: 0,
  } as FrameNode;
}

export function makeSticky(x: number, y: number): StickyNode {
  return {
    ...base('STICKY', x, y, 180, 140),
    type: 'STICKY',
    fills: [],
    characters: 'Note',
    stickyColor: '#fff9c4',
  } as StickyNode;
}

export function makeFreehand(points: { x: number; y: number }[]): FreehandNode {
  if (points.length === 0) points = [{ x: 0, y: 0 }];
  const minX = Math.min(...points.map(p => p.x));
  const minY = Math.min(...points.map(p => p.y));
  const maxX = Math.max(...points.map(p => p.x));
  const maxY = Math.max(...points.map(p => p.y));
  const localPoints = points.map(p => ({ x: p.x - minX, y: p.y - minY }));
  return {
    ...base('FREEHAND', minX, minY, maxX - minX || 1, maxY - minY || 1),
    type: 'FREEHAND',
    fills: [],
    points: localPoints,
    strokeColor: { r: 0.067, g: 0.067, b: 0.067, a: 1 },
    strokeWidth: 2,
  } as FreehandNode;
}
