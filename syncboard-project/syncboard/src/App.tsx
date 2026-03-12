import React, { useState, useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import JoinRoom from './components/UI/JoinRoom';
import WhiteboardCanvas from './components/Canvas/WhiteboardCanvas';
import Toolbar from './components/Toolbar/Toolbar';
import UserPresencePanel from './components/UserPresence/UserPresencePanel';
import Header from './components/UI/Header';
import { useWebSocket } from './hooks/useWebSocket';
import { useAppDispatch } from './hooks/redux';
import { setActiveTool } from './store/slices/toolSlice';
import { undo, redo } from './store/slices/boardSlice';
import { ToolType } from './types';

const TOOL_SHORTCUTS: Record<string, ToolType> = {
  v: 'select', p: 'pen', e: 'eraser', t: 'text', r: 'rect', o: 'ellipse', a: 'arrow', h: 'hand',
};

const BoardApp: React.FC = () => {
  const dispatch = useAppDispatch();
  useWebSocket();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      const key = e.key.toLowerCase();
      if (TOOL_SHORTCUTS[key]) { dispatch(setActiveTool(TOOL_SHORTCUTS[key])); return; }
      if ((e.ctrlKey || e.metaKey) && key === 'z' && !e.shiftKey) { e.preventDefault(); dispatch(undo()); }
      if ((e.ctrlKey || e.metaKey) && (key === 'y' || (key === 'z' && e.shiftKey))) { e.preventDefault(); dispatch(redo()); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dispatch]);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0B0B14', position: 'relative', overflow: 'hidden' }}>
      <WhiteboardCanvas />
      <Header />
      <Toolbar />
      <UserPresencePanel />
    </div>
  );
};

const App: React.FC = () => {
  const [joined, setJoined] = useState(false);
  return (
    <Provider store={store}>
      {!joined ? <JoinRoom onJoined={() => setJoined(true)} /> : <BoardApp />}
    </Provider>
  );
};

export default App;
