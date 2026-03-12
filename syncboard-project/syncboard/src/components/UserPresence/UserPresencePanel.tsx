import React, { useState } from 'react';
import { useAppSelector } from '../../hooks/redux';

const UserPresencePanel: React.FC = () => {
  const roomUsers = useAppSelector(s => s.user.roomUsers);
  const currentUser = useAppSelector(s => s.user.currentUser);
  const roomId = useAppSelector(s => s.board.roomId);
  const connectionStatus = useAppSelector(s => s.connection.status);
  const latency = useAppSelector(s => s.connection.latency);
  const [copied, setCopied] = useState(false);

  const copyRoomId = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const statusColor = connectionStatus === 'connected' ? '#34C759' : connectionStatus === 'connecting' ? '#FF9500' : '#FF3B5C';

  return (
    <div style={{
      position: 'absolute',
      top: 16,
      right: 16,
      background: 'rgba(15,15,25,0.92)',
      backdropFilter: 'blur(20px)',
      borderRadius: 16,
      border: '1px solid rgba(255,255,255,0.08)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      padding: 14,
      minWidth: 200,
      zIndex: 1000,
      fontFamily: 'Inter, sans-serif',
    }}>
      {/* Room ID */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
          Room
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <code style={{ fontSize: 12, color: '#94A3B8', background: 'rgba(255,255,255,0.06)', padding: '3px 8px', borderRadius: 6 }}>
            {roomId || '—'}
          </code>
          <button
            onClick={copyRoomId}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#34C759' : '#6366F1', padding: 0, fontSize: 11 }}
          >
            {copied ? '✓' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Connection status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor, boxShadow: `0 0 6px ${statusColor}` }} />
        <span style={{ fontSize: 11, color: '#64748B', textTransform: 'capitalize' }}>{connectionStatus}</span>
        {connectionStatus === 'connected' && latency > 0 && (
          <span style={{ fontSize: 10, color: '#4B5563', marginLeft: 'auto' }}>{latency}ms</span>
        )}
      </div>

      {/* Users */}
      <div style={{ fontSize: 10, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        {roomUsers.length} {roomUsers.length === 1 ? 'Person' : 'People'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {roomUsers.map(user => (
          <div key={user.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: user.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: '#fff',
              boxShadow: `0 0 0 2px ${user.id === currentUser?.id ? 'rgba(99,102,241,0.5)' : 'transparent'}`,
              flexShrink: 0,
            }}>
              {user.username.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontSize: 12, color: user.id === currentUser?.id ? '#E2E8F0' : '#94A3B8', fontWeight: user.id === currentUser?.id ? 600 : 400 }}>
              {user.username}
              {user.id === currentUser?.id && <span style={{ color: '#6366F1', fontSize: 10 }}> (you)</span>}
            </span>
            {user.isHost && (
              <span style={{ marginLeft: 'auto', fontSize: 9, color: '#FF9500', background: 'rgba(255,149,0,0.1)', padding: '1px 5px', borderRadius: 4 }}>HOST</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserPresencePanel;
