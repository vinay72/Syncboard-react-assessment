import { configureStore } from '@reduxjs/toolkit';
import boardReducer from './slices/boardSlice';
import toolReducer from './slices/toolSlice';
import userReducer from './slices/userSlice';
import canvasReducer from './slices/canvasSlice';
import connectionReducer from './slices/connectionSlice';

export const store = configureStore({
  reducer: {
    board: boardReducer,
    tool: toolReducer,
    user: userReducer,
    canvas: canvasReducer,
    connection: connectionReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['board/setElements'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
