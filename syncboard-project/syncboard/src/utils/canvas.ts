import { PathElement, TextElement, RectElement, EllipseElement, ArrowElement, WhiteboardElement, Point, ViewTransform } from '../types';

// ─── Coordinate Transforms ────────────────────────────────────────────────────

export function screenToCanvas(
  screenX: number,
  screenY: number,
  transform: ViewTransform,
  canvasRect: DOMRect
): Point {
  const x = (screenX - canvasRect.left - transform.x) / transform.scale;
  const y = (screenY - canvasRect.top - transform.y) / transform.scale;
  return { x, y };
}

export function canvasToScreen(
  canvasX: number,
  canvasY: number,
  transform: ViewTransform
): Point {
  return {
    x: canvasX * transform.scale + transform.x,
    y: canvasY * transform.scale + transform.y,
  };
}

// ─── Catmull-Rom Smoothing ────────────────────────────────────────────────────

export function smoothPath(points: Point[], tension = 0.4): Point[] {
  if (points.length < 3) return points;
  const result: Point[] = [];
  result.push(points[0]);
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    for (let t = 0; t <= 1; t += 0.2) {
      const t2 = t * t;
      const t3 = t2 * t;
      const x =
        0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
      const y =
        0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
      result.push({ x, y });
    }
  }
  result.push(points[points.length - 1]);
  return result;
}

// ─── Drawing Functions ────────────────────────────────────────────────────────

export function drawPath(ctx: CanvasRenderingContext2D, el: PathElement): void {
  if (el.points.length < 2) return;
  ctx.save();
  ctx.globalAlpha = el.opacity;
  ctx.strokeStyle = el.color;
  ctx.lineWidth = el.strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const pts = el.smoothing ? smoothPath(el.points) : el.points;

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x, pts[i].y);
  }
  ctx.stroke();
  ctx.restore();
}

export function drawText(ctx: CanvasRenderingContext2D, el: TextElement): void {
  ctx.save();
  ctx.globalAlpha = el.opacity;
  ctx.fillStyle = el.color;
  ctx.font = `${el.italic ? 'italic ' : ''}${el.bold ? 'bold ' : ''}${el.fontSize}px "${el.fontFamily}", sans-serif`;
  ctx.textAlign = el.align;
  ctx.textBaseline = 'top';

  const lines = el.content.split('\n');
  const lineHeight = el.fontSize * 1.4;
  lines.forEach((line, i) => {
    const x = el.align === 'center' ? el.x + el.width / 2 : el.align === 'right' ? el.x + el.width : el.x;
    ctx.fillText(line, x, el.y + i * lineHeight, el.width);
  });
  ctx.restore();
}

export function drawRect(ctx: CanvasRenderingContext2D, el: RectElement): void {
  ctx.save();
  ctx.globalAlpha = el.opacity;

  if (el.fillColor !== 'transparent') {
    ctx.fillStyle = el.fillColor;
    ctx.beginPath();
    roundedRect(ctx, el.x, el.y, el.width, el.height, el.cornerRadius);
    ctx.fill();
  }

  ctx.strokeStyle = el.strokeColor;
  ctx.lineWidth = el.strokeWidth;
  ctx.beginPath();
  roundedRect(ctx, el.x, el.y, el.width, el.height, el.cornerRadius);
  ctx.stroke();
  ctx.restore();
}

export function drawEllipse(ctx: CanvasRenderingContext2D, el: EllipseElement): void {
  ctx.save();
  ctx.globalAlpha = el.opacity;
  ctx.beginPath();
  ctx.ellipse(el.cx, el.cy, el.rx, el.ry, 0, 0, Math.PI * 2);

  if (el.fillColor !== 'transparent') {
    ctx.fillStyle = el.fillColor;
    ctx.fill();
  }

  ctx.strokeStyle = el.strokeColor;
  ctx.lineWidth = el.strokeWidth;
  ctx.stroke();
  ctx.restore();
}

export function drawArrow(ctx: CanvasRenderingContext2D, el: ArrowElement): void {
  ctx.save();
  ctx.globalAlpha = el.opacity;
  ctx.strokeStyle = el.color;
  ctx.fillStyle = el.color;
  ctx.lineWidth = el.strokeWidth;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(el.startPoint.x, el.startPoint.y);
  ctx.lineTo(el.endPoint.x, el.endPoint.y);
  ctx.stroke();

  if (el.arrowHead !== 'none') {
    drawArrowHead(ctx, el.startPoint, el.endPoint, el.strokeWidth);
  }
  if (el.arrowHead === 'both') {
    drawArrowHead(ctx, el.endPoint, el.startPoint, el.strokeWidth);
  }
  ctx.restore();
}

function drawArrowHead(ctx: CanvasRenderingContext2D, from: Point, to: Point, size: number): void {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const headLen = Math.max(12, size * 4);
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - headLen * Math.cos(angle - Math.PI / 6), to.y - headLen * Math.sin(angle - Math.PI / 6));
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - headLen * Math.cos(angle + Math.PI / 6), to.y - headLen * Math.sin(angle + Math.PI / 6));
  ctx.stroke();
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
}

// ─── Hit Testing ──────────────────────────────────────────────────────────────

export function hitTest(el: WhiteboardElement, x: number, y: number, tolerance = 8): boolean {
  switch (el.type) {
    case 'path': return hitTestPath(el as PathElement, x, y, tolerance);
    case 'text': return hitTestRect(el as TextElement, x, y);
    case 'rect': return hitTestRectEl(el as RectElement, x, y);
    case 'ellipse': return hitTestEllipse(el as EllipseElement, x, y);
    case 'arrow': return hitTestLine((el as ArrowElement).startPoint, (el as ArrowElement).endPoint, x, y, tolerance);
    default: return false;
  }
}

function hitTestPath(el: PathElement, x: number, y: number, tol: number): boolean {
  const ext = el.strokeWidth / 2 + tol;
  for (let i = 1; i < el.points.length; i++) {
    const d = distToSegment({ x, y }, el.points[i - 1], el.points[i]);
    if (d <= ext) return true;
  }
  return false;
}

function hitTestRect(el: TextElement, x: number, y: number): boolean {
  return x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height;
}

function hitTestRectEl(el: RectElement, x: number, y: number): boolean {
  const minX = Math.min(el.x, el.x + el.width);
  const maxX = Math.max(el.x, el.x + el.width);
  const minY = Math.min(el.y, el.y + el.height);
  const maxY = Math.max(el.y, el.y + el.height);
  return x >= minX && x <= maxX && y >= minY && y <= maxY;
}

function hitTestEllipse(el: EllipseElement, x: number, y: number): boolean {
  const dx = (x - el.cx) / el.rx;
  const dy = (y - el.cy) / el.ry;
  return dx * dx + dy * dy <= 1.2;
}

function hitTestLine(a: Point, b: Point, x: number, y: number, tol: number): boolean {
  return distToSegment({ x, y }, a, b) <= tol;
}

function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) {
    return Math.sqrt((p.x - a.x) ** 2 + (p.y - a.y) ** 2);
  }
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
  const qx = a.x + t * dx;
  const qy = a.y + t * dy;
  return Math.sqrt((p.x - qx) ** 2 + (p.y - qy) ** 2);
}

// ─── Bounding Box ─────────────────────────────────────────────────────────────

export function getBoundingBox(el: WhiteboardElement): { x: number; y: number; w: number; h: number } {
  switch (el.type) {
    case 'path': {
      const pts = (el as PathElement).points;
      if (!pts.length) return { x: 0, y: 0, w: 0, h: 0 };
      const minX = Math.min(...pts.map(p => p.x));
      const minY = Math.min(...pts.map(p => p.y));
      const maxX = Math.max(...pts.map(p => p.x));
      const maxY = Math.max(...pts.map(p => p.y));
      return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    }
    case 'text': {
      const t = el as TextElement;
      return { x: t.x, y: t.y, w: t.width, h: t.height };
    }
    case 'rect': {
      const r = el as RectElement;
      return { x: Math.min(r.x, r.x + r.width), y: Math.min(r.y, r.y + r.height), w: Math.abs(r.width), h: Math.abs(r.height) };
    }
    case 'ellipse': {
      const e = el as EllipseElement;
      return { x: e.cx - e.rx, y: e.cy - e.ry, w: e.rx * 2, h: e.ry * 2 };
    }
    case 'arrow': {
      const a = el as ArrowElement;
      const minX = Math.min(a.startPoint.x, a.endPoint.x);
      const minY = Math.min(a.startPoint.y, a.endPoint.y);
      return {
        x: minX, y: minY,
        w: Math.abs(a.endPoint.x - a.startPoint.x),
        h: Math.abs(a.endPoint.y - a.startPoint.y),
      };
    }
    default: return { x: 0, y: 0, w: 0, h: 0 };
  }
}

// ─── Erase ────────────────────────────────────────────────────────────────────

export function drawElement(ctx: CanvasRenderingContext2D, el: WhiteboardElement): void {
  switch (el.type) {
    case 'path': drawPath(ctx, el as PathElement); break;
    case 'text': drawText(ctx, el as TextElement); break;
    case 'rect': drawRect(ctx, el as RectElement); break;
    case 'ellipse': drawEllipse(ctx, el as EllipseElement); break;
    case 'arrow': drawArrow(ctx, el as ArrowElement); break;
  }
}
