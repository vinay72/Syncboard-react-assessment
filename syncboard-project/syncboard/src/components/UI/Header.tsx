import React from 'react';
import { useAppSelector } from '../../hooks/redux';

const Header: React.FC = () => {
  const roomName = useAppSelector(s => s.board.roomName);
  const elements = useAppSelector(s => s.board.elements);
  const selectedIds = useAppSelector(s => s.canvas.selectedElementIds);
  const viewTransform = useAppSelector(s => s.canvas.viewTransform);
  const activeTool = useAppSelector(s => s.tool.activeTool);

  return (
    <div style={{
      position: 'absolute',
      top: 16,
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      background: 'rgba(15,15,25,0.88)',
      backdropFilter: 'blur(20px)',
      borderRadius: 12,
      padding: '8px 16px',
      border: '1px solid rgba(255,255,255,0.07)',
      boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
      zIndex: 1000,
      fontFamily: 'Inter, sans-serif',
      userSelect: 'none',
    }}>
      {/* Logo Mark */}
      <div style={{
        width: 26, height: 26, borderRadius: 7,
        background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 800, color: '#fff',
      }}>
        S
      </div>

      <span style={{ fontSize: 14, fontWeight: 700, color: '#E2E8F0', letterSpacing: '-0.02em' }}>
        Sync<span style={{ color: '#6366F1' }}>Board</span>
      </span>

      <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.07)' }} />

      <span style={{ fontSize: 12, color: '#64748B' }}>
        {roomName}
      </span>

      <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.07)' }} />

      {/* Stats */}
      <span style={{ fontSize: 11, color: '#475569' }}>
        {elements.length} {elements.length === 1 ? 'object' : 'objects'}
      </span>

      {selectedIds.length > 0 && (
        <>
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.07)' }} />
          <span style={{ fontSize: 11, color: '#6366F1' }}>
            {selectedIds.length} selected
          </span>
        </>
      )}

      <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.07)' }} />

      {/* Active tool indicator */}
      <span style={{ fontSize: 11, color: '#475569', textTransform: 'capitalize' }}>
        {activeTool}
      </span>
    </div>
  );
};

export default Header;
