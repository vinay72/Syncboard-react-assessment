import { useEffect, useCallback, useRef } from 'react';
import { useAppDispatch, useAppSelector } from './redux';
import wsService from '../services/websocket';
import {
  setElements,
  remoteAddElement,
  remoteUpdateElement,
  remoteUpdatePoints,
  remoteFinalizeElement,
  remoteDeleteElement,
  remoteDeleteElements,
  remoteClearBoard,
} from '../store/slices/boardSlice';
import {
  setCurrentUser,
  setRoomUsers,
  addRoomUser,
  removeRoomUser,
  updateCursor,
  removeCursor,
} from '../store/slices/userSlice';
import { setStatus, setLatency, incrementReconnectAttempts } from '../store/slices/connectionSlice';
import { WSMessage, User, UserCursor } from '../types';

const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8080';

export function useWebSocket() {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(s => s.user.currentUser);
  const isSetupRef = useRef(false);

  useEffect(() => {
    if (isSetupRef.current) return;
    isSetupRef.current = true;

    // Status handler
    const offStatus = wsService.onStatus((status) => {
      if (status.startsWith('ping:')) {
        const latency = parseInt(status.split(':')[1]);
        dispatch(setLatency(latency));
      } else if (status === 'reconnecting') {
        dispatch(setStatus('reconnecting'));
        dispatch(incrementReconnectAttempts());
      } else {
        dispatch(setStatus(status as any));
      }
    });

    // Room state (initial sync)
    const offRoomState = wsService.on('ROOM_STATE', (msg: WSMessage<any>) => {
      const { room, elements, users } = msg.payload;
      dispatch(setElements(elements || []));
      dispatch(setRoomUsers(users || []));
    });

    // User events
    const offUserJoined = wsService.on('USER_JOINED', (msg: WSMessage<any>) => {
      dispatch(addRoomUser(msg.payload.user));
    });

    const offUserLeft = wsService.on('USER_LEFT', (msg: WSMessage<any>) => {
      dispatch(removeRoomUser(msg.payload.userId));
      dispatch(removeCursor(msg.payload.userId));
    });

    // Drawing events
    const offDrawStart = wsService.on('DRAW_START', (msg: WSMessage<any>) => {
      dispatch(remoteAddElement(msg.payload.element));
    });

    const offDrawUpdate = wsService.on('DRAW_UPDATE', (msg: WSMessage<any>) => {
      dispatch(remoteUpdatePoints({ id: msg.payload.elementId, points: msg.payload.points }));
    });

    const offDrawEnd = wsService.on('DRAW_END', (msg: WSMessage<any>) => {
      dispatch(remoteFinalizeElement(msg.payload.element));
    });

    // Element events
    const offAddEl = wsService.on('ADD_ELEMENT', (msg: WSMessage<any>) => {
      dispatch(remoteAddElement(msg.payload.element));
    });

    const offUpdateEl = wsService.on('UPDATE_ELEMENT', (msg: WSMessage<any>) => {
      dispatch(remoteUpdateElement({ id: msg.payload.elementId, updates: msg.payload.updates }));
    });

    const offDeleteEl = wsService.on('DELETE_ELEMENT', (msg: WSMessage<any>) => {
      dispatch(remoteDeleteElement(msg.payload.elementId));
    });

    const offDeleteEls = wsService.on('DELETE_ELEMENTS', (msg: WSMessage<any>) => {
      dispatch(remoteDeleteElements(msg.payload.elementIds));
    });

    const offClear = wsService.on('CLEAR_BOARD', () => {
      dispatch(remoteClearBoard());
    });

    // Cursor events
    const offCursor = wsService.on('CURSOR_MOVE', (msg: WSMessage<any>) => {
      const cursor: UserCursor = {
        userId: msg.userId,
        username: msg.payload.username,
        color: msg.payload.color,
        x: msg.payload.x,
        y: msg.payload.y,
        isActive: true,
        lastSeen: msg.timestamp,
      };
      dispatch(updateCursor(cursor));
    });

    const offCursorLeave = wsService.on('CURSOR_LEAVE', (msg: WSMessage<any>) => {
      dispatch(removeCursor(msg.userId));
    });

    wsService.connect(WS_URL);

    return () => {
      offStatus();
      offRoomState();
      offUserJoined();
      offUserLeft();
      offDrawStart();
      offDrawUpdate();
      offDrawEnd();
      offAddEl();
      offUpdateEl();
      offDeleteEl();
      offDeleteEls();
      offClear();
      offCursor();
      offCursorLeave();
      wsService.disconnect();
      isSetupRef.current = false;
    };
  }, [dispatch]);

  const joinRoom = useCallback((roomId: string, userId: string, username: string, color: string) => {
    wsService.send({
      type: 'JOIN_ROOM',
      payload: { roomId, username, color },
      userId,
      roomId,
    });
  }, []);

  const leaveRoom = useCallback((roomId: string, userId: string) => {
    wsService.send({
      type: 'LEAVE_ROOM',
      payload: {},
      userId,
      roomId,
    });
  }, []);

  return { joinRoom, leaveRoom };
}
