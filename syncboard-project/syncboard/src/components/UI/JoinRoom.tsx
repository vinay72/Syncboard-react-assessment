import React, { useState, useCallback } from 'react';
import { useAppDispatch } from '../../hooks/redux';
import { setCurrentUser } from '../../store/slices/userSlice';
import { setRoom } from '../../store/slices/boardSlice';
import { nanoid } from 'nanoid';
import wsService from '../../services/websocket';

const USER_COLORS = [
  '#FF3B5C', '#FF9500', '#34C759', '#32ADE6',
  '#5856D6', '#FF2D55', '#00C7BE', '#FFCC02',
];

const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8080';

interface Props {
  onJoined: () => void;
}

const JoinRoom: React.FC<Props> = ({ onJoined }) => {
  const dispatch = useAppDispatch();
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const [selectedColor, setSelectedColor] = useState(USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)]);
  const [isJoining, setIsJoining] = useState(false);
  const [mode, setMode] = useState<'create' | 'join'>('create');

  const handleJoin = useCallback(async () => {
    if (!username.trim()) return;
    setIsJoining(true);

    const userId = nanoid();
    const finalRoomId = mode === 'create' ? nanoid(8).toUpperCase() : roomId.trim().toUpperCase();

    const user = {
      id: userId,
      username: username.trim(),
      color: selectedColor,
      roomId: finalRoomId,
      isHost: mode === 'create',
      joinedAt: Date.now(),
    };

    dispatch(setCurrentUser(user));
    dispatch(setRoom({ roomId: finalRoomId, roomName: `Room ${finalRoomId}` }));

    // Connect and join
    wsService.connect(WS_URL);

    // Wait a moment for connection
    await new Promise(res => setTimeout(res, 800));

    wsService.send({
      type: 'JOIN_ROOM',
      payload: { roomId: finalRoomId, username: username.trim(), color: selectedColor },
      userId,
      roomId: finalRoomId,
    });

    onJoined();
  }, [username, roomId, selectedColor, mode, dispatch, onJoined]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 30% 20%, rgba(99,102,241,0.15) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(99,102,241,0.08) 0%, transparent 60%), #08080F',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '"Inter", -apple-system, sans-serif',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Animated grid background */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
        maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
      }} />

      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: 460,
        padding: '0 24px',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 24px rgba(99,102,241,0.4)',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="8" height="8" rx="2" fill="white" fillOpacity="0.9"/>
                <rect x="13" y="3" width="8" height="8" rx="2" fill="white" fillOpacity="0.6"/>
                <rect x="3" y="13" width="8" height="8" rx="2" fill="white" fillOpacity="0.6"/>
                <rect x="13" y="13" width="8" height="8" rx="2" fill="white" fillOpacity="0.3"/>
              </svg>
            </div>
            <span style={{ fontSize: 26, fontWeight: 800, color: '#F1F5F9', letterSpacing: '-0.03em' }}>
              Sync<span style={{ color: '#6366F1' }}>Board</span>
            </span>
          </div>
          <p style={{ color: '#475569', fontSize: 14, margin: 0 }}>
            Real-time collaborative whiteboard
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(15,15,25,0.8)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 20,
          padding: 32,
          backdropFilter: 'blur(20px)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}>
          {/* Mode Toggle */}
          <div style={{
            display: 'flex', gap: 4, marginBottom: 24,
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 10, padding: 4,
          }}>
            {(['create', 'join'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 7,
                  border: 'none', cursor: 'pointer',
                  background: mode === m ? 'rgba(99,102,241,0.2)' : 'transparent',
                  color: mode === m ? '#818CF8' : '#64748B',
                  fontSize: 13, fontWeight: 600,
                  transition: 'all 0.2s',
                  outline: mode === m ? '1px solid rgba(99,102,241,0.3)' : 'none',
                }}
              >
                {m === 'create' ? '✦ Create Room' : '→ Join Room'}
              </button>
            ))}
          </div>

          {/* Username */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
              Your Name
            </label>
            <input
              type="text"
              placeholder="Enter your name..."
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              maxLength={20}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10,
                padding: '12px 14px',
                color: '#E2E8F0',
                fontSize: 14,
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
          </div>

          {/* Room ID (join mode) */}
          {mode === 'join' && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                Room ID
              </label>
              <input
                type="text"
                placeholder="Enter room ID..."
                value={roomId}
                onChange={e => setRoomId(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                maxLength={12}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  color: '#E2E8F0',
                  fontSize: 14,
                  outline: 'none',
                  fontFamily: 'monospace',
                  letterSpacing: '0.1em',
                  boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
              />
            </div>
          )}

          {/* Color Selection */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              Your Color
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {USER_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setSelectedColor(c)}
                  style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: c, border: 'none', cursor: 'pointer',
                    boxShadow: selectedColor === c ? `0 0 0 3px rgba(255,255,255,0.3), 0 0 12px ${c}60` : 'none',
                    transform: selectedColor === c ? 'scale(1.2)' : 'scale(1)',
                    transition: 'all 0.15s ease',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleJoin}
            disabled={isJoining || !username.trim() || (mode === 'join' && !roomId.trim())}
            style={{
              width: '100%',
              padding: '14px',
              background: isJoining || !username.trim() ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg, #6366F1, #7C3AED)',
              border: 'none',
              borderRadius: 12,
              color: '#fff',
              fontSize: 15,
              fontWeight: 700,
              cursor: isJoining || !username.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              boxShadow: (!isJoining && username.trim()) ? '0 4px 16px rgba(99,102,241,0.4)' : 'none',
              letterSpacing: '-0.01em',
            }}
          >
            {isJoining ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
                Connecting...
              </span>
            ) : (
              mode === 'create' ? 'Create Board →' : 'Join Board →'
            )}
          </button>
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', fontSize: 12, color: '#374151', marginTop: 20 }}>
          Built with React · Redux Toolkit · WebSockets
        </p>
      </div>
    </div>
  );
};

export default JoinRoom;
