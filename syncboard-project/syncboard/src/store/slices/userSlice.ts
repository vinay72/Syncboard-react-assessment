import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User, UserCursor } from '../../types';

interface UserState {
  currentUser: User | null;
  roomUsers: User[];
  cursors: Record<string, UserCursor>;
}

const initialState: UserState = {
  currentUser: null,
  roomUsers: [],
  cursors: {},
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setCurrentUser(state, action: PayloadAction<User>) {
      state.currentUser = action.payload;
    },

    setRoomUsers(state, action: PayloadAction<User[]>) {
      state.roomUsers = action.payload;
    },

    addRoomUser(state, action: PayloadAction<User>) {
      const exists = state.roomUsers.find(u => u.id === action.payload.id);
      if (!exists) state.roomUsers.push(action.payload);
    },

    removeRoomUser(state, action: PayloadAction<string>) {
      state.roomUsers = state.roomUsers.filter(u => u.id !== action.payload);
      delete state.cursors[action.payload];
    },

    updateCursor(state, action: PayloadAction<UserCursor>) {
      state.cursors[action.payload.userId] = action.payload;
    },

    removeCursor(state, action: PayloadAction<string>) {
      delete state.cursors[action.payload];
    },

    clearRoom(state) {
      state.roomUsers = [];
      state.cursors = {};
    },
  },
});

export const {
  setCurrentUser,
  setRoomUsers,
  addRoomUser,
  removeRoomUser,
  updateCursor,
  removeCursor,
  clearRoom,
} = userSlice.actions;

export default userSlice.reducer;
