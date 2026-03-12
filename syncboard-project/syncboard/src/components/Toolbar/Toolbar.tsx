import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { setActiveTool, setColor, setStrokeWidth, setFontSize, setFillColor } from '../../store/slices/toolSlice';
import { clearBoard, undo, redo, deleteElements } from '../../store/slices/boardSlice';
import { clearSelection, resetView } from '../../store/slices/canvasSlice';
import { ToolType } from '../../types';
import wsService from '../../services/websocket';

const COLORS = [
  '#1C1C1E', '#FF3B5C', '#FF9500', '#FFCC02',
  '#34C759', '#00C7BE', '#32ADE6', '#5856D6',
  '#FF2D55', '#8E8E93', '#AEAEB2', '#FFFFFF',
];

const STROKE_WIDTHS = [1, 2, 4, 8, 16];

interface ToolButtonProps {
  tool: ToolType;
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}

const ToolButton: React.FC<ToolButtonProps> = ({ active, onClick, title, children }) => (
  <button
    title={title}
    onClick={onClick}
    style={{
      width: 42,
      height: 42,
      borderRadius: 10,
      border: 'none',
      background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
      color: active ? '#6366F1' : '#94A3B8',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.15s ease',
      outline: active ? '1.5px solid rgba(99,102,241,0.4)' : '1px solid transparent',
      fontSize: 16,
    }}
    onMouseEnter={e => { if (!active) (e.target as HTMLElement).style.background = 'rgba(148,163,184,0.08)'; }}
    onMouseLeave={e => { if (!active) (e.target as HTMLElement).style.background = 'transparent'; }}
  >
    {children}
  </button>
);

const Toolbar: React.FC = () => {
  const dispatch = useAppDispatch();
  const activeTool = useAppSelector(s => s.tool.activeTool);
  const color = useAppSelector(s => s.tool.color);
  const strokeWidth = useAppSelector(s => s.tool.strokeWidth);
  const selectedIds = useAppSelector(s => s.canvas.selectedElementIds);
  const elements = useAppSelector(s => s.board.elements);
  const currentUser = useAppSelector(s => s.user.currentUser);
  const roomId = useAppSelector(s => s.board.roomId);
  const viewTransform = useAppSelector(s => s.canvas.viewTransform);

  const [showColors, setShowColors] = useState(false);
  const [showStroke, setShowStroke] = useState(false);

  const handleClear = () => {
    if (window.confirm('Clear the entire board?')) {
      dispatch(clearBoard());
      if (roomId && currentUser) {
        wsService.send({ type: 'CLEAR_BOARD', payload: {}, userId: currentUser.id, roomId });
      }
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length) {
      dispatch(deleteElements(selectedIds));
      dispatch(clearSelection());
      if (roomId && currentUser) {
        wsService.send({ type: 'DELETE_ELEMENTS', payload: { elementIds: selectedIds }, userId: currentUser.id, roomId });
      }
    }
  };

  return (
    <div style={{
      position: 'absolute',
      left: '50%',
      bottom: 28,
      transform: 'translateX(-50%)',
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      background: 'rgba(15,15,25,0.92)',
      backdropFilter: 'blur(20px)',
      borderRadius: 16,
      padding: '8px 12px',
      border: '1px solid rgba(255,255,255,0.08)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(99,102,241,0.1)',
      zIndex: 1000,
      userSelect: 'none',
    }}>
      {/* Select */}
      <ToolButton tool="select" active={activeTool === 'select'} onClick={() => dispatch(setActiveTool('select'))} title="Select (V)">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4 1l9 7-4 1-2 5z"/>
        </svg>
      </ToolButton>

      {/* Hand/Pan */}
      <ToolButton tool="hand" active={activeTool === 'hand'} onClick={() => dispatch(setActiveTool('hand'))} title="Pan (H)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8l4 4"/>
          <path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>
        </svg>
      </ToolButton>

      <Divider />

      {/* Pen */}
      <ToolButton tool="pen" active={activeTool === 'pen'} onClick={() => dispatch(setActiveTool('pen'))} title="Pen (P)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 19l7-7 3 3-7 7-3-3z"/>
          <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
          <path d="M2 2l7.586 7.586"/>
          <circle cx="11" cy="11" r="2"/>
        </svg>
      </ToolButton>

      {/* Eraser */}
      <ToolButton tool="eraser" active={activeTool === 'eraser'} onClick={() => dispatch(setActiveTool('eraser'))} title="Eraser (E)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 20H7L3 16c-.8-.8-.8-2 0-2.83l9.9-9.9c.78-.78 2.05-.78 2.83 0l6.37 6.37c.78.78.78 2.05 0 2.83L14 19"/>
        </svg>
      </ToolButton>

      {/* Text */}
      <ToolButton tool="text" active={activeTool === 'text'} onClick={() => dispatch(setActiveTool('text'))} title="Text (T)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="4 7 4 4 20 4 20 7"/>
          <line x1="9" y1="20" x2="15" y2="20"/>
          <line x1="12" y1="4" x2="12" y2="20"/>
        </svg>
      </ToolButton>

      <Divider />

      {/* Rect */}
      <ToolButton tool="rect" active={activeTool === 'rect'} onClick={() => dispatch(setActiveTool('rect'))} title="Rectangle (R)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        </svg>
      </ToolButton>

      {/* Ellipse */}
      <ToolButton tool="ellipse" active={activeTool === 'ellipse'} onClick={() => dispatch(setActiveTool('ellipse'))} title="Ellipse (O)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <ellipse cx="12" cy="12" rx="10" ry="6"/>
        </svg>
      </ToolButton>

      {/* Arrow */}
      <ToolButton tool="arrow" active={activeTool === 'arrow'} onClick={() => dispatch(setActiveTool('arrow'))} title="Arrow (A)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="5" y1="12" x2="19" y2="12"/>
          <polyline points="12 5 19 12 12 19"/>
        </svg>
      </ToolButton>

      <Divider />

      {/* Color Picker */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => { setShowColors(!showColors); setShowStroke(false); }}
          title="Color"
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            border: '2px solid rgba(255,255,255,0.15)',
            background: color,
            cursor: 'pointer',
            boxShadow: `0 0 0 2px ${showColors ? '#6366F1' : 'transparent'}`,
            transition: 'box-shadow 0.15s',
          }}
        />
        {showColors && (
          <ColorPicker
            currentColor={color}
            onSelect={(c) => { dispatch(setColor(c)); setShowColors(false); }}
            onClose={() => setShowColors(false)}
          />
        )}
      </div>

      {/* Stroke Width */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => { setShowStroke(!showStroke); setShowColors(false); }}
          title="Stroke Width"
          style={{
            width: 42, height: 42, borderRadius: 10, border: 'none',
            background: showStroke ? 'rgba(99,102,241,0.15)' : 'transparent',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            outline: showStroke ? '1.5px solid rgba(99,102,241,0.4)' : 'none',
          }}
        >
          <div style={{ width: strokeWidth * 1.5, height: strokeWidth * 1.5, maxWidth: 20, maxHeight: 20, borderRadius: '50%', background: color }} />
        </button>
        {showStroke && (
          <StrokePanel
            current={strokeWidth}
            onSelect={(w) => { dispatch(setStrokeWidth(w)); setShowStroke(false); }}
          />
        )}
      </div>

      <Divider />

      {/* Undo */}
      <ToolButton tool="select" active={false} onClick={() => dispatch(undo())} title="Undo (Ctrl+Z)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 14 4 9 9 4"/>
          <path d="M20 20v-7a4 4 0 0 0-4-4H4"/>
        </svg>
      </ToolButton>

      {/* Redo */}
      <ToolButton tool="select" active={false} onClick={() => dispatch(redo())} title="Redo (Ctrl+Y)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 14 20 9 15 4"/>
          <path d="M4 20v-7a4 4 0 0 1 4-4h12"/>
        </svg>
      </ToolButton>

      {/* Delete selected */}
      {selectedIds.length > 0 && (
        <ToolButton tool="select" active={false} onClick={handleDeleteSelected} title={`Delete ${selectedIds.length} selected`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF3B5C" strokeWidth="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
        </ToolButton>
      )}

      {/* Reset view */}
      <ToolButton tool="select" active={false} onClick={() => dispatch(resetView())} title="Reset View">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      </ToolButton>

      {/* Clear */}
      <ToolButton tool="select" active={false} onClick={handleClear} title="Clear Board">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF3B5C" strokeWidth="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          <line x1="10" y1="11" x2="10" y2="17"/>
          <line x1="14" y1="11" x2="14" y2="17"/>
        </svg>
      </ToolButton>

      {/* Zoom indicator */}
      <div style={{ paddingLeft: 8, fontSize: 11, color: '#64748B', fontFamily: 'Inter', minWidth: 36 }}>
        {Math.round(viewTransform.scale * 100)}%
      </div>
    </div>
  );
};

const Divider: React.FC = () => (
  <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />
);

interface ColorPickerProps {
  currentColor: string;
  onSelect: (color: string) => void;
  onClose: () => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ currentColor, onSelect, onClose }) => {
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={onClose} />
      <div style={{
        position: 'absolute',
        bottom: 54,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(15,15,25,0.96)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12,
        padding: 12,
        zIndex: 999,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        gap: 6,
        width: 180,
      }}>
        {COLORS.map(c => (
          <button
            key={c}
            onClick={() => onSelect(c)}
            style={{
              width: 24, height: 24, borderRadius: 6,
              background: c,
              border: c === currentColor ? '2px solid #6366F1' : '1.5px solid rgba(255,255,255,0.1)',
              cursor: 'pointer',
              transition: 'transform 0.1s',
              boxShadow: c === '#FFFFFF' ? '0 0 0 1px rgba(0,0,0,0.2)' : 'none',
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.2)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          />
        ))}
        {/* Custom color input */}
        <input
          type="color"
          value={currentColor}
          onChange={e => onSelect(e.target.value)}
          style={{ width: 24, height: 24, borderRadius: 6, border: 'none', cursor: 'pointer', padding: 0 }}
          title="Custom color"
        />
      </div>
    </>
  );
};

interface StrokePanelProps {
  current: number;
  onSelect: (w: number) => void;
}

const StrokePanel: React.FC<StrokePanelProps> = ({ current, onSelect }) => {
  const color = useAppSelector(s => s.tool.color);
  return (
    <div style={{
      position: 'absolute',
      bottom: 54,
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(15,15,25,0.96)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 12,
      padding: '8px 12px',
      zIndex: 999,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      minWidth: 120,
    }}>
      {STROKE_WIDTHS.map(w => (
        <button
          key={w}
          onClick={() => onSelect(w)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: w === current ? 'rgba(99,102,241,0.15)' : 'transparent',
            border: 'none', borderRadius: 6, padding: '6px 8px',
            cursor: 'pointer', color: '#94A3B8',
          }}
        >
          <div style={{ width: 40, height: w, background: color, borderRadius: w, maxHeight: 16 }} />
          <span style={{ fontSize: 11, fontFamily: 'Inter' }}>{w}px</span>
        </button>
      ))}
    </div>
  );
};

export default Toolbar;
