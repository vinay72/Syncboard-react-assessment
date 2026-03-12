import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { WhiteboardElement, HistoryEntry, Point } from '../../types';

interface BoardState {
  elements: WhiteboardElement[];
  history: HistoryEntry[];
  historyIndex: number;
  activeDrawingId: string | null;
  roomId: string | null;
  roomName: string | null;
  isLoading: boolean;
}

const MAX_HISTORY = 50;

const initialState: BoardState = {
  elements: [],
  history: [],
  historyIndex: -1,
  activeDrawingId: null,
  roomId: null,
  roomName: null,
  isLoading: false,
};

const boardSlice = createSlice({
  name: 'board',
  initialState,
  reducers: {
    setRoom(state, action: PayloadAction<{ roomId: string; roomName: string }>) {
      state.roomId = action.payload.roomId;
      state.roomName = action.payload.roomName;
    },

    setElements(state, action: PayloadAction<WhiteboardElement[]>) {
      state.elements = action.payload;
      state.history = [{ elements: action.payload, timestamp: Date.now(), description: 'Initial state' }];
      state.historyIndex = 0;
    },

    addElement(state, action: PayloadAction<WhiteboardElement>) {
      state.elements.push(action.payload);
      pushHistory(state, `Added ${action.payload.type}`);
    },

    updateElement(state, action: PayloadAction<{ id: string; updates: Partial<WhiteboardElement> }>) {
      const idx = state.elements.findIndex(el => el.id === action.payload.id);
      if (idx !== -1) {
        state.elements[idx] = {
          ...state.elements[idx],
          ...action.payload.updates,
          updatedAt: Date.now(),
        } as WhiteboardElement;
      }
    },

    updateElementPoints(state, action: PayloadAction<{ id: string; points: Point[] }>) {
      const idx = state.elements.findIndex(el => el.id === action.payload.id);
      if (idx !== -1 && state.elements[idx].type === 'path') {
        (state.elements[idx] as any).points = action.payload.points;
      }
    },

    finalizeElement(state, action: PayloadAction<WhiteboardElement>) {
      const idx = state.elements.findIndex(el => el.id === action.payload.id);
      if (idx !== -1) {
        state.elements[idx] = action.payload;
      } else {
        state.elements.push(action.payload);
      }
      pushHistory(state, `Drew ${action.payload.type}`);
    },

    deleteElement(state, action: PayloadAction<string>) {
      state.elements = state.elements.filter(el => el.id !== action.payload);
      pushHistory(state, 'Deleted element');
    },

    deleteElements(state, action: PayloadAction<string[]>) {
      const ids = new Set(action.payload);
      state.elements = state.elements.filter(el => !ids.has(el.id));
      pushHistory(state, `Deleted ${action.payload.length} elements`);
    },

    clearBoard(state) {
      state.elements = [];
      pushHistory(state, 'Cleared board');
    },

    setActiveDrawing(state, action: PayloadAction<string | null>) {
      state.activeDrawingId = action.payload;
    },

    undo(state) {
      if (state.historyIndex > 0) {
        state.historyIndex--;
        state.elements = [...state.history[state.historyIndex].elements];
      }
    },

    redo(state) {
      if (state.historyIndex < state.history.length - 1) {
        state.historyIndex++;
        state.elements = [...state.history[state.historyIndex].elements];
      }
    },

    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },

    // Remote actions - do NOT push to history
    remoteAddElement(state, action: PayloadAction<WhiteboardElement>) {
      const exists = state.elements.find(el => el.id === action.payload.id);
      if (!exists) state.elements.push(action.payload);
    },

    remoteUpdateElement(state, action: PayloadAction<{ id: string; updates: Partial<WhiteboardElement> }>) {
      const idx = state.elements.findIndex(el => el.id === action.payload.id);
      if (idx !== -1) {
        state.elements[idx] = { ...state.elements[idx], ...action.payload.updates } as WhiteboardElement;
      }
    },

    remoteUpdatePoints(state, action: PayloadAction<{ id: string; points: Point[] }>) {
      const idx = state.elements.findIndex(el => el.id === action.payload.id);
      if (idx !== -1 && state.elements[idx].type === 'path') {
        (state.elements[idx] as any).points = action.payload.points;
      }
    },

    remoteFinalizeElement(state, action: PayloadAction<WhiteboardElement>) {
      const idx = state.elements.findIndex(el => el.id === action.payload.id);
      if (idx !== -1) {
        state.elements[idx] = action.payload;
      } else {
        state.elements.push(action.payload);
      }
    },

    remoteDeleteElement(state, action: PayloadAction<string>) {
      state.elements = state.elements.filter(el => el.id !== action.payload);
    },

    remoteDeleteElements(state, action: PayloadAction<string[]>) {
      const ids = new Set(action.payload);
      state.elements = state.elements.filter(el => !ids.has(el.id));
    },

    remoteClearBoard(state) {
      state.elements = [];
    },
  },
});

function pushHistory(state: BoardState, description: string) {
  // Truncate future on new action
  state.history = state.history.slice(0, state.historyIndex + 1);
  state.history.push({
    elements: JSON.parse(JSON.stringify(state.elements)),
    timestamp: Date.now(),
    description,
  });
  if (state.history.length > MAX_HISTORY) {
    state.history.shift();
  }
  state.historyIndex = state.history.length - 1;
}

export const {
  setRoom,
  setElements,
  addElement,
  updateElement,
  updateElementPoints,
  finalizeElement,
  deleteElement,
  deleteElements,
  clearBoard,
  setActiveDrawing,
  undo,
  redo,
  setLoading,
  remoteAddElement,
  remoteUpdateElement,
  remoteUpdatePoints,
  remoteFinalizeElement,
  remoteDeleteElement,
  remoteDeleteElements,
  remoteClearBoard,
} = boardSlice.actions;

export default boardSlice.reducer;
