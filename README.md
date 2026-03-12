# SyncBoard — Real-Time Collaborative Whiteboard

A production-grade real-time collaborative whiteboard built with React, Redux Toolkit, TypeScript, and WebSockets — no whiteboard SDKs, no Firebase.

## Quick Start

```bash
# Terminal 1: Start WebSocket server
cd server && npm install && npx ts-node src/index.ts

# Terminal 2: Start React app  
npm install && npm start
```

Open http://localhost:3000, create or join a room, and invite others with the Room ID.

## Architecture Overview

```
syncboard/
├── src/
│   ├── types/           # Shared TypeScript interfaces
│   ├── store/slices/    # Redux slices: board, tool, user, canvas, connection
│   ├── services/        # WebSocket singleton with auto-reconnect
│   ├── hooks/           # useWebSocket (WS↔Redux bridge), typed selectors
│   ├── utils/           # Canvas drawing, hit-testing, coordinate transforms
│   └── components/      # Canvas, Toolbar, TextTool, UserPresence, UI
└── server/src/          # Express + ws WebSocket server with room management
```

## State Management

Five Redux Toolkit slices manage distinct concerns:

- **boardSlice** — Elements array, undo/redo history (50 steps), room ID
- **toolSlice** — Active tool, color, stroke width, font settings  
- **canvasSlice** — Pan/zoom transform, selection state, drawing state
- **userSlice** — Current user, room users list, remote cursors map
- **connectionSlice** — WS status, latency, reconnect count

Remote updates use `remote*` actions that skip undo history. Local actions push to history.

## Real-Time Synchronization Approach

### Optimistic Local Updates
Every action renders locally first (0ms latency), then broadcasts via WebSocket. Other users receive the message and apply it via `remote*` Redux actions.

### Drawing Protocol (3-phase)
1. **DRAW_START** — Creates element immediately on all peers
2. **DRAW_UPDATE** — Throttled point stream (every 5 points) 
3. **DRAW_END** — Finalized element with full data

### Cursor Presence
Cursor moves throttled to 30fps (33ms gate). Server relays immediately without persisting.

### Room State Sync
Late joiners receive full `ROOM_STATE` (all elements + users) on join.

## Performance Considerations

- **RAF render loop** — Single requestAnimationFrame loop drives all canvas draws
- **Cursor throttling** — At most 30 cursor updates/second per user
- **Catmull-Rom smoothing** — Applied at draw time, not stored in state
- **Canvas API (not DOM/SVG)** — Handles hundreds of strokes without DOM overhead
- **Pending message queue** — Non-cursor messages queue during brief disconnects
- **In-memory server state** — No DB round-trips on each operation

## Trade-offs & Assumptions

| Decision | Trade-off |
|----------|-----------|
| Last-write-wins on conflicts | Simpler than OT/CRDT; occasional divergence on simultaneous edits |
| In-memory room state | Fast; no persistence across server restarts |
| Optimistic updates | Zero perceived latency; divergence risk on network drop |
| No auth | Open rooms by ID; suitable for demo/assignment scope |
| 50-step undo history | Memory bounded; deep histories truncate oldest entries |

## Environment Variables

| Variable | Default |
|----------|---------|
| `REACT_APP_WS_URL` | `ws://localhost:8080` |
| `PORT` | `8080` |

## Keyboard Shortcuts

V=Select, P=Pen, E=Eraser, T=Text, R=Rect, O=Ellipse, A=Arrow, H=Hand
Ctrl+Z=Undo, Ctrl+Y=Redo, Delete=Delete selected, Scroll=Zoom
