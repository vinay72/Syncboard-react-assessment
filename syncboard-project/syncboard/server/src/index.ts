import * as http from 'http';
import * as WebSocket from 'ws';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// ─── Types ────────────────────────────────────────────────────────────────────

interface User {
  id: string;
  username: string;
  color: string;
  roomId: string;
  isHost: boolean;
  joinedAt: number;
}

interface Room {
  id: string;
  name: string;
  hostId: string;
  users: Map<string, User>;
  elements: any[];
  createdAt: number;
}

interface WSMessage {
  type: string;
  payload: any;
  userId: string;
  roomId: string;
  timestamp: number;
}

// ─── State ────────────────────────────────────────────────────────────────────

const rooms = new Map<string, Room>();
const clients = new Map<WebSocket, { userId: string; roomId: string }>();
const userSockets = new Map<string, WebSocket>();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function send(ws: WebSocket, type: string, payload: any, userId = '', roomId = '') {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, payload, userId, roomId, timestamp: Date.now() }));
  }
}

function broadcast(roomId: string, type: string, payload: any, excludeUserId?: string) {
  const room = rooms.get(roomId);
  if (!room) return;

  room.users.forEach((user, uid) => {
    if (uid === excludeUserId) return;
    const ws = userSockets.get(uid);
    if (ws) send(ws, type, payload, uid, roomId);
  });
}

function getOrCreateRoom(roomId: string): Room {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      id: roomId,
      name: `Room ${roomId}`,
      hostId: '',
      users: new Map(),
      elements: [],
      createdAt: Date.now(),
    });
  }
  return rooms.get(roomId)!;
}

function cleanupUser(ws: WebSocket) {
  const client = clients.get(ws);
  if (!client) return;

  const { userId, roomId } = client;
  const room = rooms.get(roomId);

  if (room) {
    room.users.delete(userId);
    userSockets.delete(userId);

    // Broadcast user left
    broadcast(roomId, 'USER_LEFT', { userId });

    // Clean up empty rooms (after 5 minutes)
    if (room.users.size === 0) {
      setTimeout(() => {
        if (rooms.get(roomId)?.users.size === 0) {
          rooms.delete(roomId);
          console.log(`[Room] Cleaned up empty room: ${roomId}`);
        }
      }, 5 * 60 * 1000);
    }
  }

  clients.delete(ws);
  console.log(`[User] ${userId} disconnected from room ${roomId}`);
}

// ─── Message Handlers ─────────────────────────────────────────────────────────

function handleJoinRoom(ws: WebSocket, msg: WSMessage) {
  const { roomId, username, color } = msg.payload;
  const userId = msg.userId;

  const room = getOrCreateRoom(roomId);

  const user: User = {
    id: userId,
    username,
    color,
    roomId,
    isHost: room.users.size === 0,
    joinedAt: Date.now(),
  };

  if (!room.hostId || room.users.size === 0) {
    room.hostId = userId;
    user.isHost = true;
  }

  room.users.set(userId, user);
  userSockets.set(userId, ws);
  clients.set(ws, { userId, roomId });

  console.log(`[Room] ${username} (${userId}) joined room ${roomId} (${room.users.size} users)`);

  // Send room state to the joining user
  send(ws, 'ROOM_STATE', {
    room: {
      id: room.id,
      name: room.name,
      hostId: room.hostId,
      createdAt: room.createdAt,
    },
    elements: room.elements,
    users: Array.from(room.users.values()),
    cursors: {},
  }, userId, roomId);

  // Notify others
  broadcast(roomId, 'USER_JOINED', { user }, userId);
}

function handleDrawStart(ws: WebSocket, msg: WSMessage) {
  const { roomId, userId } = msg;
  broadcast(roomId, 'DRAW_START', msg.payload, userId);
}

function handleDrawUpdate(ws: WebSocket, msg: WSMessage) {
  const { roomId, userId } = msg;
  broadcast(roomId, 'DRAW_UPDATE', msg.payload, userId);
}

function handleDrawEnd(ws: WebSocket, msg: WSMessage) {
  const { roomId, userId } = msg;
  const room = rooms.get(roomId);

  if (room && msg.payload.element) {
    // Update or add element in room state
    const idx = room.elements.findIndex((el: any) => el.id === msg.payload.element.id);
    if (idx !== -1) {
      room.elements[idx] = msg.payload.element;
    } else {
      room.elements.push(msg.payload.element);
    }
  }

  broadcast(roomId, 'DRAW_END', msg.payload, userId);
}

function handleAddElement(ws: WebSocket, msg: WSMessage) {
  const { roomId, userId } = msg;
  const room = rooms.get(roomId);

  if (room && msg.payload.element) {
    room.elements.push(msg.payload.element);
  }

  broadcast(roomId, 'ADD_ELEMENT', msg.payload, userId);
}

function handleUpdateElement(ws: WebSocket, msg: WSMessage) {
  const { roomId, userId } = msg;
  const room = rooms.get(roomId);

  if (room) {
    const idx = room.elements.findIndex((el: any) => el.id === msg.payload.elementId);
    if (idx !== -1) {
      room.elements[idx] = { ...room.elements[idx], ...msg.payload.updates };
    }
  }

  broadcast(roomId, 'UPDATE_ELEMENT', msg.payload, userId);
}

function handleDeleteElement(ws: WebSocket, msg: WSMessage) {
  const { roomId, userId } = msg;
  const room = rooms.get(roomId);

  if (room) {
    room.elements = room.elements.filter((el: any) => el.id !== msg.payload.elementId);
  }

  broadcast(roomId, 'DELETE_ELEMENT', msg.payload, userId);
}

function handleDeleteElements(ws: WebSocket, msg: WSMessage) {
  const { roomId, userId } = msg;
  const room = rooms.get(roomId);

  if (room) {
    const ids = new Set(msg.payload.elementIds);
    room.elements = room.elements.filter((el: any) => !ids.has(el.id));
  }

  broadcast(roomId, 'DELETE_ELEMENTS', msg.payload, userId);
}

function handleClearBoard(ws: WebSocket, msg: WSMessage) {
  const { roomId, userId } = msg;
  const room = rooms.get(roomId);

  if (room) room.elements = [];

  broadcast(roomId, 'CLEAR_BOARD', {}, userId);
}

function handleCursorMove(ws: WebSocket, msg: WSMessage) {
  const { roomId, userId } = msg;
  broadcast(roomId, 'CURSOR_MOVE', msg.payload, userId);
}

// ─── WS Connection ────────────────────────────────────────────────────────────

wss.on('connection', (ws: WebSocket) => {
  console.log('[WS] New connection');

  ws.on('message', (data: WebSocket.Data) => {
    try {
      const msg: WSMessage = JSON.parse(data.toString());

      if (msg.type === 'PING') {
        send(ws, 'PONG', {}, msg.userId, msg.roomId);
        return;
      }

      switch (msg.type) {
        case 'JOIN_ROOM': handleJoinRoom(ws, msg); break;
        case 'LEAVE_ROOM': cleanupUser(ws); break;
        case 'DRAW_START': handleDrawStart(ws, msg); break;
        case 'DRAW_UPDATE': handleDrawUpdate(ws, msg); break;
        case 'DRAW_END': handleDrawEnd(ws, msg); break;
        case 'ADD_ELEMENT': handleAddElement(ws, msg); break;
        case 'UPDATE_ELEMENT': handleUpdateElement(ws, msg); break;
        case 'DELETE_ELEMENT': handleDeleteElement(ws, msg); break;
        case 'DELETE_ELEMENTS': handleDeleteElements(ws, msg); break;
        case 'CLEAR_BOARD': handleClearBoard(ws, msg); break;
        case 'CURSOR_MOVE': handleCursorMove(ws, msg); break;
        default:
          console.warn('[WS] Unknown message type:', msg.type);
      }
    } catch (err) {
      console.error('[WS] Parse error:', err);
    }
  });

  ws.on('close', () => cleanupUser(ws));
  ws.on('error', (err) => {
    console.error('[WS] Error:', err);
    cleanupUser(ws);
  });
});

// ─── HTTP Routes ──────────────────────────────────────────────────────────────

app.get('/health', (_, res) => {
  res.json({
    status: 'ok',
    rooms: rooms.size,
    connections: wss.clients.size,
    uptime: process.uptime(),
  });
});

app.get('/rooms', (_, res) => {
  const roomList = Array.from(rooms.values()).map(r => ({
    id: r.id,
    name: r.name,
    userCount: r.users.size,
    elementCount: r.elements.length,
    createdAt: r.createdAt,
  }));
  res.json(roomList);
});

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════╗
║   SyncBoard WebSocket Server         ║
║   Port: ${PORT}                         ║
║   Health: http://localhost:${PORT}/health ║
╚══════════════════════════════════════╝
  `);
});

export default server;
