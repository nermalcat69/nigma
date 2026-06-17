// ─── Node Types ───────────────────────────────────────────────────────────────

export type NodeType =
  | 'FRAME'
  | 'GROUP'
  | 'RECTANGLE'
  | 'ELLIPSE'
  | 'LINE'
  | 'VECTOR'
  | 'TEXT'
  | 'IMAGE'
  | 'COMPONENT'
  | 'INSTANCE'
  | 'STICKY'
  | 'CONNECTOR'
  | 'FREEHAND';

export type BlendMode =
  | 'NORMAL' | 'MULTIPLY' | 'SCREEN' | 'OVERLAY'
  | 'DARKEN' | 'LIGHTEN' | 'COLOR_DODGE' | 'COLOR_BURN'
  | 'HARD_LIGHT' | 'SOFT_LIGHT' | 'DIFFERENCE' | 'EXCLUSION';

// ─── Paint / Fill ─────────────────────────────────────────────────────────────

export type PaintType = 'SOLID' | 'LINEAR_GRADIENT' | 'RADIAL_GRADIENT' | 'IMAGE';

export interface SolidPaint {
  type: 'SOLID';
  color: RGBA;
  opacity?: number;
  visible?: boolean;
}

export interface GradientStop {
  position: number; // 0-1
  color: RGBA;
}

export interface LinearGradientPaint {
  type: 'LINEAR_GRADIENT';
  gradientHandlePositions: Vec2[];
  gradientStops: GradientStop[];
  opacity?: number;
  visible?: boolean;
}

export interface ImagePaint {
  type: 'IMAGE';
  assetId: string;
  scaleMode: 'FILL' | 'FIT' | 'CROP' | 'TILE';
  opacity?: number;
  visible?: boolean;
}

export type Paint = SolidPaint | LinearGradientPaint | ImagePaint;

// ─── Stroke ───────────────────────────────────────────────────────────────────

export interface StrokeStyle {
  color: RGBA;
  width: number;
  align: 'INSIDE' | 'OUTSIDE' | 'CENTER';
  dashPattern?: number[];
  lineCap?: 'NONE' | 'ROUND' | 'SQUARE';
  lineJoin?: 'MITER' | 'BEVEL' | 'ROUND';
  visible?: boolean;
}

// ─── Effects ──────────────────────────────────────────────────────────────────

export interface DropShadowEffect {
  type: 'DROP_SHADOW';
  color: RGBA;
  offset: Vec2;
  radius: number;
  spread?: number;
  visible?: boolean;
}

export interface InnerShadowEffect {
  type: 'INNER_SHADOW';
  color: RGBA;
  offset: Vec2;
  radius: number;
  visible?: boolean;
}

export interface BlurEffect {
  type: 'LAYER_BLUR' | 'BACKGROUND_BLUR';
  radius: number;
  visible?: boolean;
}

export type Effect = DropShadowEffect | InnerShadowEffect | BlurEffect;

// ─── Text ─────────────────────────────────────────────────────────────────────

export interface TextStyle {
  fontFamily: string;
  fontStyle: string; // 'Regular' | 'Bold' | 'Italic' | 'Bold Italic'
  fontSize: number;
  lineHeight: number | 'AUTO';
  letterSpacing: number;
  textAlign: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
  textDecoration: 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH';
}

// ─── Auto Layout ──────────────────────────────────────────────────────────────

export interface AutoLayout {
  direction: 'HORIZONTAL' | 'VERTICAL';
  spacing: number;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  primaryAxisAlignment: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
  counterAxisAlignment: 'MIN' | 'CENTER' | 'MAX' | 'BASELINE';
  wrap?: boolean;
}

// ─── Constraints ──────────────────────────────────────────────────────────────

export interface Constraints {
  horizontal: 'LEFT' | 'RIGHT' | 'CENTER' | 'SCALE' | 'STRETCH';
  vertical: 'TOP' | 'BOTTOM' | 'CENTER' | 'SCALE' | 'STRETCH';
}

// ─── Primitives ───────────────────────────────────────────────────────────────

export interface Vec2 { x: number; y: number; }
export interface RGBA { r: number; g: number; b: number; a: number; }

// ─── Base Node ────────────────────────────────────────────────────────────────

export interface BaseNode {
  id: string;
  name: string;
  type: NodeType;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: BlendMode;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // degrees
  fills: Paint[];
  strokes: StrokeStyle[];
  effects: Effect[];
  constraints?: Constraints;
}

// ─── Concrete Node Types ───────────────────────────────────────────────────────

export interface FrameNode extends BaseNode {
  type: 'FRAME';
  children: NigmaNode[];
  clipContent: boolean;
  autoLayout?: AutoLayout;
  cornerRadius?: number | [number, number, number, number];
}

export interface GroupNode extends BaseNode {
  type: 'GROUP';
  children: NigmaNode[];
}

export interface RectangleNode extends BaseNode {
  type: 'RECTANGLE';
  cornerRadius?: number | [number, number, number, number];
}

export interface EllipseNode extends BaseNode {
  type: 'ELLIPSE';
  arcData?: { startingAngle: number; endingAngle: number; innerRadius: number };
}

export interface LineNode extends BaseNode {
  type: 'LINE';
}

export interface VectorNode extends BaseNode {
  type: 'VECTOR';
  vectorPaths: Array<{ windingRule: 'NONZERO' | 'EVENODD'; data: string }>;
}

export interface TextNode extends BaseNode {
  type: 'TEXT';
  characters: string;
  textStyle: TextStyle;
}

export interface ImageNode extends BaseNode {
  type: 'IMAGE';
  assetId: string;
  scaleMode: 'FILL' | 'FIT' | 'CROP' | 'TILE';
}

export interface ComponentNode extends BaseNode {
  type: 'COMPONENT';
  children: NigmaNode[];
  description?: string;
}

export interface InstanceNode extends BaseNode {
  type: 'INSTANCE';
  mainComponentId: string;
  overrides: Array<{ nodeId: string; property: string; value: unknown }>;
}

export interface StickyNode extends BaseNode {
  type: 'STICKY';
  characters: string;
  stickyColor: string;
}

export interface ConnectorNode extends BaseNode {
  type: 'CONNECTOR';
  fromId: string;
  toId: string;
  fromAnchor: 'top' | 'right' | 'bottom' | 'left' | 'center';
  toAnchor: 'top' | 'right' | 'bottom' | 'left' | 'center';
  connectorStyle: 'STRAIGHT' | 'ELBOW';
}

export interface FreehandNode extends BaseNode {
  type: 'FREEHAND';
  points: Vec2[];
  strokeColor: RGBA;
  strokeWidth: number;
}

export type NigmaNode =
  | FrameNode | GroupNode | RectangleNode | EllipseNode
  | LineNode | VectorNode | TextNode | ImageNode
  | ComponentNode | InstanceNode | StickyNode
  | ConnectorNode | FreehandNode;

// ─── Style Definitions ────────────────────────────────────────────────────────

export interface ColorStyle {
  id: string;
  name: string;
  type: 'COLOR';
  paint: Paint;
}

export interface TextStyleDef {
  id: string;
  name: string;
  type: 'TEXT';
  textStyle: TextStyle;
}

export interface EffectStyleDef {
  id: string;
  name: string;
  type: 'EFFECT';
  effects: Effect[];
}

export type StyleDef = ColorStyle | TextStyleDef | EffectStyleDef;

// ─── Prototype / Interactions ──────────────────────────────────────────────────

export interface Interaction {
  id: string;
  sourceNodeId: string;
  trigger: 'ON_CLICK' | 'ON_HOVER' | 'ON_PRESS';
  action: 'NAVIGATE' | 'OVERLAY' | 'SWAP' | 'CLOSE_OVERLAY';
  targetFrameId: string;
  animation?: 'INSTANT' | 'DISSOLVE' | 'SLIDE_LEFT' | 'SLIDE_RIGHT' | 'SLIDE_UP' | 'SLIDE_DOWN';
  duration?: number;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export interface Page {
  id: string;
  name: string;
  children: NigmaNode[];
  background: RGBA;
  interactions: Interaction[];
}

// ─── Document ─────────────────────────────────────────────────────────────────

export interface NigmaDocument {
  id: string;
  name: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  pages: Page[];
  components: ComponentNode[];
  styles: StyleDef[];
  filePath?: string;
}

// ─── Viewport ─────────────────────────────────────────────────────────────────

export interface Viewport {
  x: number;       // pan offset x
  y: number;       // pan offset y
  zoom: number;    // zoom level (1 = 100%)
}

// ─── Tools ────────────────────────────────────────────────────────────────────

export type Tool =
  | 'SELECT'
  | 'HAND'
  | 'FRAME'
  | 'RECTANGLE'
  | 'ELLIPSE'
  | 'LINE'
  | 'PEN'
  | 'TEXT'
  | 'IMAGE'
  | 'STICKY'
  | 'CONNECTOR'
  | 'FREEHAND';

// ─── History ──────────────────────────────────────────────────────────────────

export interface HistoryEntry {
  timestamp: number;
  description: string;
  snapshot: NigmaDocument;
}
