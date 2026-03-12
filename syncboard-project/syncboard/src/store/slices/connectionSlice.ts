import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ConnectionStatus } from '../../types';

interface ConnectionState {
  status: ConnectionStatus;
  error: string | null;
  latency: number;
  reconnectAttempts: number;
  lastConnectedAt: number | null;
}

const initialState: ConnectionState = {
  status: 'disconnected',
  error: null,
  latency: 0,
  reconnectAttempts: 0,
  lastConnectedAt: null,
};

const connectionSlice = createSlice({
  name: 'connection',
  initialState,
  reducers: {
    setStatus(state, action: PayloadAction<ConnectionStatus>) {
      state.status = action.payload;
      if (action.payload === 'connected') {
        state.lastConnectedAt = Date.now();
        state.reconnectAttempts = 0;
        state.error = null;
      }
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    setLatency(state, action: PayloadAction<number>) {
      state.latency = action.payload;
    },
    incrementReconnectAttempts(state) {
      state.reconnectAttempts++;
    },
    resetConnection(state) {
      state.status = 'disconnected';
      state.error = null;
      state.reconnectAttempts = 0;
    },
  },
});

export const {
  setStatus,
  setError,
  setLatency,
  incrementReconnectAttempts,
  resetConnection,
} = connectionSlice.actions;

export default connectionSlice.reducer;
