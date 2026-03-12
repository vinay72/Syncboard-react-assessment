import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CanvasState, ViewTransform, SelectionBox } from '../../types';

const initialState: CanvasState = {
  isDrawing: false,
  isPanning: false,
  activeElementId: null,
  selectedElementIds: [],
  viewTransform: { x: 0, y: 0, scale: 1 },
  selectionBox: null,
};

const canvasSlice = createSlice({
  name: 'canvas',
  initialState,
  reducers: {
    setIsDrawing(state, action: PayloadAction<boolean>) {
      state.isDrawing = action.payload;
    },
    setIsPanning(state, action: PayloadAction<boolean>) {
      state.isPanning = action.payload;
    },
    setActiveElementId(state, action: PayloadAction<string | null>) {
      state.activeElementId = action.payload;
    },
    setSelectedElementIds(state, action: PayloadAction<string[]>) {
      state.selectedElementIds = action.payload;
    },
    addToSelection(state, action: PayloadAction<string>) {
      if (!state.selectedElementIds.includes(action.payload)) {
        state.selectedElementIds.push(action.payload);
      }
    },
    clearSelection(state) {
      state.selectedElementIds = [];
      state.activeElementId = null;
    },
    setViewTransform(state, action: PayloadAction<ViewTransform>) {
      state.viewTransform = action.payload;
    },
    panBy(state, action: PayloadAction<{ dx: number; dy: number }>) {
      state.viewTransform.x += action.payload.dx;
      state.viewTransform.y += action.payload.dy;
    },
    zoomTo(state, action: PayloadAction<{ scale: number; cx: number; cy: number }>) {
      const { scale, cx, cy } = action.payload;
      const prevScale = state.viewTransform.scale;
      const newScale = Math.min(Math.max(scale, 0.1), 5);
      state.viewTransform.x = cx - (cx - state.viewTransform.x) * (newScale / prevScale);
      state.viewTransform.y = cy - (cy - state.viewTransform.y) * (newScale / prevScale);
      state.viewTransform.scale = newScale;
    },
    resetView(state) {
      state.viewTransform = { x: 0, y: 0, scale: 1 };
    },
    setSelectionBox(state, action: PayloadAction<SelectionBox | null>) {
      state.selectionBox = action.payload;
    },
  },
});

export const {
  setIsDrawing,
  setIsPanning,
  setActiveElementId,
  setSelectedElementIds,
  addToSelection,
  clearSelection,
  setViewTransform,
  panBy,
  zoomTo,
  resetView,
  setSelectionBox,
} = canvasSlice.actions;

export default canvasSlice.reducer;
