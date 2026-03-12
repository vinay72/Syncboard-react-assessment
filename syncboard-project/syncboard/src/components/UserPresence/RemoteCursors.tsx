import React from 'react';
import { useAppSelector } from '../../hooks/redux';
import { ViewTransform } from '../../types';

interface Props {
  viewTransform: ViewTransform;
}

const RemoteCursors: React.FC<Props> = ({ viewTransform }) => {
  const cursors = useAppSelector(s => s.user.cursors);
  const currentUserId = useAppSelector(s => s.user.currentUser?.id);

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {Object.values(cursors).map(cursor => {
        if (cursor.userId === currentUserId) return null;

        // Transform canvas coords to screen coords
        const screenX = cursor.x * viewTransform.scale + viewTransform.x;
        const screenY = cursor.y * viewTransform.scale + viewTransform.y;

        return (
          <div
            key={cursor.userId}
            style={{
              position: 'absolute',
              left: screenX,
              top: screenY,
              transform: 'translate(-2px, -2px)',
              transition: 'left 0.05s linear, top 0.05s linear',
              pointerEvents: 'none',
              zIndex: 9999,
            }}
          >
            {/* Cursor SVG */}
            <svg width="20" height="22" viewBox="0 0 20 22" fill="none">
              <path
                d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
                fill={cursor.color}
                stroke="white"
                strokeWidth="1"
              />
            </svg>

            {/* Name badge */}
            <div style={{
              position: 'absolute',
              top: 18,
              left: 8,
              background: cursor.color,
              color: '#fff',
              padding: '2px 8px',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              fontFamily: 'Inter, sans-serif',
            }}>
              {cursor.username}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default RemoteCursors;
