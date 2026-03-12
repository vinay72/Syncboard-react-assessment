import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ToolState, ToolType } from '../../types';

const PRESET_COLORS = [
  '#FF3B5C', '#FF9500', '#FFCC02', '#34C759',
  '#00C7BE', '#32ADE6', '#5856D6', '#FF2D55',
  '#1C1C1E', '#636366', '#AEAEB2', '#FFFFFF',
];

const initialState: ToolState & {
  presetColors: string[];
  recentColors: string[];
  showColorPicker: boolean;
} = {
  activeTool: 'pen',
  color: '#1C1C1E',
  strokeWidth: 3,
  fontSize: 16,
  fontFamily: 'Inter',
  opacity: 1,
  fillColor: 'transparent',
  presetColors: PRESET_COLORS,
  recentColors: [],
  showColorPicker: false,
};

const toolSlice = createSlice({
  name: 'tool',
  initialState,
  reducers: {
    setActiveTool(state, action: PayloadAction<ToolType>) {
      state.activeTool = action.payload;
    },
    setColor(state, action: PayloadAction<string>) {
      const prev = state.color;
      state.color = action.payload;
      if (!state.recentColors.includes(prev)) {
        state.recentColors = [prev, ...state.recentColors].slice(0, 8);
      }
    },
    setStrokeWidth(state, action: PayloadAction<number>) {
      state.strokeWidth = action.payload;
    },
    setFontSize(state, action: PayloadAction<number>) {
      state.fontSize = action.payload;
    },
    setFontFamily(state, action: PayloadAction<string>) {
      state.fontFamily = action.payload;
    },
    setOpacity(state, action: PayloadAction<number>) {
      state.opacity = action.payload;
    },
    setFillColor(state, action: PayloadAction<string>) {
      state.fillColor = action.payload;
    },
    toggleColorPicker(state) {
      state.showColorPicker = !state.showColorPicker;
    },
    closeColorPicker(state) {
      state.showColorPicker = false;
    },
  },
});

export const {
  setActiveTool,
  setColor,
  setStrokeWidth,
  setFontSize,
  setFontFamily,
  setOpacity,
  setFillColor,
  toggleColorPicker,
  closeColorPicker,
} = toolSlice.actions;

export default toolSlice.reducer;
