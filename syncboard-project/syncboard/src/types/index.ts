// ─── Element Types ──────────────────────────────────────────────────────────

export type ElementType = 'path' | 'text' | 'rect' | 'ellipse' | 'arrow';

export interface Point {
  x: number;
  y: number;
}

export interface BaseElement {
  id: string;
  type: ElementType;
  userId: string;
  createdAt: number;
  updatedAt: number;
  isSelected?: boolean;
  isLocked?: boolean;
  opacity: number;
  zIndex: number;
}

export interface PathElement extends BaseElement {
  type: 'path';
  points: Point[];
  color: string;
  strokeWidth: number;
  smoothing?: boolean;
}

export interface TextElement extends BaseElement {
  type: 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  bold: boolean;
  italic: boolean;
  align: 'left' | 'center' | 'right';
  isEditing?: boolean;
}

export interface RectElement extends BaseElement {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  cornerRadius: number;
}

export interface EllipseElement extends BaseElement {
  type: 'ellipse';
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
}

export interface ArrowElement extends BaseElement {
  type: 'arrow';
  startPoint: Point;
  endPoint: Point;
  color: string;
  strokeWidth: number;
  arrowHead: 'none' | 'end' | 'both';
}

export type WhiteboardElement =
  | PathElement
  | TextElement
  | RectElement
  | EllipseElement
  | ArrowElement;

// ─── Tool Types ──────────────────────────────────────────────────────────────

export type ToolType =
  | 'select'
  | 'pen'
  | 'eraser'
  | 'text'
  | 'rect'
  | 'ellipse'
  | 'arrow'
  | 'hand';

export interface ToolState {
  activeTool: ToolType;
  color: string;
  strokeWidth: number;
  fontSize: number;
  fontFamily: string;
  opacity: number;
  fillColor: string;
}

// ─── User Types ──────────────────────────────────────────────────────────────

export interface UserCursor {
  userId: string;
  username: string;
  color: string;
  x: number;
  y: number;
  isActive: boolean;
  lastSeen: number;
}

export interface User {
  id: string;
  username: string;
  color: string;
  roomId: string;
  isHost: boolean;
  joinedAt: number;
}

// ─── Room Types ──────────────────────────────────────────────────────────────

export interface Room {
  id: string;
  name: string;
  createdAt: number;
  hostId: string;
  users: User[];
}

// ─── WebSocket Message Types ─────────────────────────────────────────────────

export type WSMessageType =
  | 'JOIN_ROOM'
  | 'LEAVE_ROOM'
  | 'ROOM_STATE'
  | 'USER_JOINED'
  | 'USER_LEFT'
  | 'DRAW_START'
  | 'DRAW_UPDATE'
  | 'DRAW_END'
  | 'ADD_ELEMENT'
  | 'UPDATE_ELEMENT'
  | 'DELETE_ELEMENT'
  | 'DELETE_ELEMENTS'
  | 'CLEAR_BOARD'
  | 'CURSOR_MOVE'
  | 'CURSOR_LEAVE'
  | 'UNDO'
  | 'REDO'
  | 'ERROR'
  | 'PING'
  | 'PONG';

export interface WSMessage<T = unknown> {
  type: WSMessageType;
  payload: T;
  userId: string;
  roomId: string;
  timestamp: number;
}

export interface JoinRoomPayload {
  roomId: string;
  username: string;
  color: string;
}

export interface RoomStatePayload {
  room: Room;
  elements: WhiteboardElement[];
  users: User[];
  cursors: Record<string, UserCursor>;
}

export interface DrawStartPayload {
  element: WhiteboardElement;
}

export interface DrawUpdatePayload {
  elementId: string;
  points: Point[];
}

export interface DrawEndPayload {
  elementId: string;
  element: WhiteboardElement;
}

export interface AddElementPayload {
  element: WhiteboardElement;
}

export interface UpdateElementPayload {
  elementId: string;
  updates: Partial<WhiteboardElement>;
}

export interface DeleteElementPayload {
  elementId: string;
}

export interface DeleteElementsPayload {
  elementIds: string[];
}

export interface CursorMovePayload {
  x: number;
  y: number;
}

// ─── Canvas Types ────────────────────────────────────────────────────────────

export interface ViewTransform {
  x: number;
  y: number;
  scale: number;
}

export interface SelectionBox {
  startX: number;
  startY: number;
  width: number;
  height: number;
}

export interface CanvasState {
  isDrawing: boolean;
  isPanning: boolean;
  activeElementId: string | null;
  selectedElementIds: string[];
  viewTransform: ViewTransform;
  selectionBox: SelectionBox | null;
}

// ─── History Types ───────────────────────────────────────────────────────────

export interface HistoryEntry {
  elements: WhiteboardElement[];
  timestamp: number;
  description: string;
}

// ─── Connection Status ───────────────────────────────────────────────────────

export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';
