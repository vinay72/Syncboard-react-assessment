import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import {
  addElement, updateElementPoints, finalizeElement,
  deleteElement, deleteElements, setActiveDrawing,
} from '../../store/slices/boardSlice';
import {
  setIsDrawing, setIsPanning, setActiveElementId,
  setSelectedElementIds, clearSelection, panBy, zoomTo, setSelectionBox,
} from '../../store/slices/canvasSlice';
import { drawElement, screenToCanvas, hitTest, getBoundingBox } from '../../utils/canvas';
import wsService from '../../services/websocket';
import { nanoid } from 'nanoid';
import {
  WhiteboardElement, PathElement, RectElement,
  EllipseElement, ArrowElement, Point,
} from '../../types';
import RemoteCursors from '../UserPresence/RemoteCursors';
import TextOverlay from '../TextTool/TextOverlay';

// Throttle cursor updates to ~30fps
let lastCursorSend = 0;

const WhiteboardCanvas: React.FC = () => {
  const dispatch = useAppDispatch();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const drawingPointsRef = useRef<Point[]>([]);
  const activeIdRef = useRef<string | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; elX: number; elY: number } | null>(null);
  const panStartRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  const elements = useAppSelector(s => s.board.elements);
  const { activeTool, color, strokeWidth, opacity, fillColor } = useAppSelector(s => s.tool);
  const { viewTransform, selectedElementIds, isDrawing } = useAppSelector(s => s.canvas);
  const currentUser = useAppSelector(s => s.user.currentUser);
  const roomId = useAppSelector(s => s.board.roomId);

  // ─── Render Loop ───────────────────────────────────────────────────────────

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    // Draw grid
    drawGrid(ctx, width, height, viewTransform);

    // Apply transform
    ctx.save();
    ctx.translate(viewTransform.x, viewTransform.y);
    ctx.scale(viewTransform.scale, viewTransform.scale);

    // Draw all elements sorted by zIndex
    const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);
    sorted.forEach(el => {
      drawElement(ctx, el);

      // Draw selection highlight
      if (selectedElementIds.includes(el.id)) {
        drawSelectionHighlight(ctx, el);
      }
    });

    ctx.restore();

    animFrameRef.current = requestAnimationFrame(render);
  }, [elements, viewTransform, selectedElementIds]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [render]);

  // ─── Resize Handler ────────────────────────────────────────────────────────

  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const getCanvasPoint = useCallback((e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    return screenToCanvas(clientX, clientY, viewTransform, rect);
  }, [viewTransform]);

  // ─── Mouse Handlers ────────────────────────────────────────────────────────

  const handlePointerDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && activeTool === 'hand')) {
      // Pan
      dispatch(setIsPanning(true));
      panStartRef.current = { x: e.clientX, y: e.clientY, tx: viewTransform.x, ty: viewTransform.y };
      return;
    }
    if (e.button !== 0) return;

    const point = getCanvasPoint(e);
    const userId = currentUser?.id || 'anonymous';

    if (activeTool === 'select') {
      // Hit test elements in reverse order (top first)
      const sorted = [...elements].sort((a, b) => b.zIndex - a.zIndex);
      const hit = sorted.find(el => hitTest(el, point.x, point.y));
      if (hit) {
        if (!e.shiftKey) dispatch(setSelectedElementIds([hit.id]));
        else dispatch(setSelectedElementIds([...selectedElementIds, hit.id]));
        dispatch(setActiveElementId(hit.id));
        // Setup drag
        const bb = getBoundingBox(hit);
        dragStartRef.current = { x: point.x, y: point.y, elX: bb.x, elY: bb.y };
      } else {
        dispatch(clearSelection());
      }
      return;
    }

    if (activeTool === 'eraser') {
      const sorted = [...elements].sort((a, b) => b.zIndex - a.zIndex);
      const hit = sorted.find(el => hitTest(el, point.x, point.y, 12));
      if (hit) {
        dispatch(deleteElement(hit.id));
        if (roomId && currentUser) {
          wsService.send({ type: 'DELETE_ELEMENT', payload: { elementId: hit.id }, userId: currentUser.id, roomId });
        }
      }
      return;
    }

    if (activeTool === 'text') return; // Handled by click in text overlay

    // Start drawing
    const id = nanoid();
    activeIdRef.current = id;
    drawingPointsRef.current = [point];

    const base = {
      id,
      userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      opacity,
      zIndex: elements.length,
      isSelected: false,
    };

    let newEl: WhiteboardElement;

    if (activeTool === 'pen') {
      newEl = { ...base, type: 'path', points: [point], color, strokeWidth, smoothing: true } as PathElement;
    } else if (activeTool === 'rect') {
      newEl = { ...base, type: 'rect', x: point.x, y: point.y, width: 0, height: 0, fillColor, strokeColor: color, strokeWidth, cornerRadius: 4 } as RectElement;
    } else if (activeTool === 'ellipse') {
      newEl = { ...base, type: 'ellipse', cx: point.x, cy: point.y, rx: 0, ry: 0, fillColor, strokeColor: color, strokeWidth } as EllipseElement;
    } else if (activeTool === 'arrow') {
      newEl = { ...base, type: 'arrow', startPoint: point, endPoint: point, color, strokeWidth, arrowHead: 'end' } as ArrowElement;
    } else {
      return;
    }

    dispatch(addElement(newEl));
    dispatch(setIsDrawing(true));
    dispatch(setActiveDrawing(id));

    if (roomId && currentUser) {
      wsService.send({ type: 'DRAW_START', payload: { element: newEl }, userId: currentUser.id, roomId });
    }
  }, [activeTool, elements, selectedElementIds, color, strokeWidth, opacity, fillColor, viewTransform, currentUser, roomId, dispatch, getCanvasPoint]);

  const handlePointerMove = useCallback((e: React.MouseEvent) => {
    const point = getCanvasPoint(e);

    // Pan
    if (panStartRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      dispatch(panBy({ dx, dy }));
      panStartRef.current = { ...panStartRef.current, x: e.clientX, y: e.clientY };
      return;
    }

    // Send cursor position throttled
    const now = Date.now();
    if (now - lastCursorSend > 33 && roomId && currentUser) {
      lastCursorSend = now;
      wsService.send({
        type: 'CURSOR_MOVE',
        payload: { x: point.x, y: point.y, username: currentUser.username, color: currentUser.color },
        userId: currentUser.id,
        roomId,
      });
    }

    if (!isDrawing || !activeIdRef.current) return;

    const id = activeIdRef.current;
    const el = elements.find(e => e.id === id);
    if (!el) return;

    if (activeTool === 'pen' || activeTool === 'eraser') {
      drawingPointsRef.current.push(point);
      const pts = drawingPointsRef.current;
      dispatch(updateElementPoints({ id, points: pts }));

      if (roomId && currentUser && pts.length % 5 === 0) {
        wsService.send({ type: 'DRAW_UPDATE', payload: { elementId: id, points: pts }, userId: currentUser.id, roomId });
      }
    } else if (el.type === 'rect') {
      const startX = drawingPointsRef.current[0].x;
      const startY = drawingPointsRef.current[0].y;
      dispatch(updateElementPoints({ id, points: [{ x: startX, y: startY }, point] }));
      // Hack: update rect via a different mechanism via direct store update
    } else if (el.type === 'ellipse') {
      // handled below
    } else if (el.type === 'arrow') {
      // handled below
    }

    // For shape tools, update geometry
    if (activeTool === 'rect' || activeTool === 'ellipse' || activeTool === 'arrow') {
      const start = drawingPointsRef.current[0];
      let updates: Partial<WhiteboardElement> = {};

      if (activeTool === 'rect') {
        updates = { x: Math.min(start.x, point.x), y: Math.min(start.y, point.y), width: Math.abs(point.x - start.x), height: Math.abs(point.y - start.y) } as any;
      } else if (activeTool === 'ellipse') {
        updates = { cx: (start.x + point.x) / 2, cy: (start.y + point.y) / 2, rx: Math.abs(point.x - start.x) / 2, ry: Math.abs(point.y - start.y) / 2 } as any;
      } else if (activeTool === 'arrow') {
        updates = { endPoint: point } as any;
      }

      // Directly mutate via Redux
      const { updateElement } = require('../../store/slices/boardSlice');
      dispatch(updateElement({ id, updates }));
    }
  }, [isDrawing, activeTool, elements, viewTransform, currentUser, roomId, dispatch, getCanvasPoint]);

  const handlePointerUp = useCallback((e: React.MouseEvent) => {
    panStartRef.current = null;

    if (!isDrawing || !activeIdRef.current) {
      dispatch(setIsPanning(false));
      return;
    }

    const id = activeIdRef.current;
    const el = elements.find(e => e.id === id);

    if (el) {
      dispatch(finalizeElement(el));
      if (roomId && currentUser) {
        wsService.send({ type: 'DRAW_END', payload: { elementId: id, element: el }, userId: currentUser.id, roomId });
      }
    }

    activeIdRef.current = null;
    drawingPointsRef.current = [];
    dispatch(setIsDrawing(false));
    dispatch(setActiveDrawing(null));
    dispatch(setIsPanning(false));
  }, [isDrawing, elements, currentUser, roomId, dispatch]);

  // ─── Wheel (zoom) ──────────────────────────────────────────────────────────

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const delta = e.deltaY < 0 ? 1.1 : 0.9;
    dispatch(zoomTo({ scale: viewTransform.scale * delta, cx, cy }));
  }, [viewTransform, dispatch]);

  // ─── Keyboard ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElementIds.length && !(e.target as HTMLElement)?.isContentEditable) {
          dispatch(deleteElements(selectedElementIds));
          dispatch(clearSelection());
          if (roomId && currentUser) {
            wsService.send({ type: 'DELETE_ELEMENTS', payload: { elementIds: selectedElementIds }, userId: currentUser.id, roomId });
          }
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedElementIds, currentUser, roomId, dispatch]);

  const cursor = getCursor(activeTool, isDrawing);

  return (
    <div ref={containerRef} className="canvas-container" style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        style={{ cursor, display: 'block', touchAction: 'none' }}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onWheel={handleWheel}
      />
      <RemoteCursors viewTransform={viewTransform} />
      <TextOverlay viewTransform={viewTransform} getCanvasPoint={getCanvasPoint} />
    </div>
  );
};

// ─── Grid ─────────────────────────────────────────────────────────────────────

function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number, t: { x: number; y: number; scale: number }) {
  const gridSize = 24 * t.scale;
  if (gridSize < 6) return;

  ctx.save();
  ctx.strokeStyle = 'rgba(99,102,241,0.06)';
  ctx.lineWidth = 1;

  const startX = t.x % gridSize;
  const startY = t.y % gridSize;

  for (let x = startX; x < w; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = startY; y < h; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.restore();
}

// ─── Selection Highlight ──────────────────────────────────────────────────────

function drawSelectionHighlight(ctx: CanvasRenderingContext2D, el: WhiteboardElement) {
  const bb = getBoundingBox(el);
  const pad = 6;
  ctx.save();
  ctx.strokeStyle = '#6366F1';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 3]);
  ctx.strokeRect(bb.x - pad, bb.y - pad, bb.w + pad * 2, bb.h + pad * 2);

  // Corner handles
  ctx.setLineDash([]);
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#6366F1';
  ctx.lineWidth = 1.5;
  const corners = [
    [bb.x - pad, bb.y - pad],
    [bb.x + bb.w + pad, bb.y - pad],
    [bb.x - pad, bb.y + bb.h + pad],
    [bb.x + bb.w + pad, bb.y + bb.h + pad],
  ];
  corners.forEach(([cx, cy]) => {
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
  ctx.restore();
}

function getCursor(tool: string, isDrawing: boolean): string {
  switch (tool) {
    case 'pen': return isDrawing ? 'crosshair' : 'crosshair';
    case 'eraser': return 'cell';
    case 'text': return 'text';
    case 'hand': return 'grab';
    case 'select': return 'default';
    default: return 'crosshair';
  }
}

export default WhiteboardCanvas;
