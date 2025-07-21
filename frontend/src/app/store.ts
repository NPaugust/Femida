import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';

// --- AUTH SLICE ---
interface AuthState {
  user: any | null;
  role: string | null;
  access: string | null;
  refresh: string | null;
}
const initialAuthState: AuthState = {
  user: null,
  role: null,
  access: null,
  refresh: null,
};
const authSlice = createSlice({
  name: 'auth',
  initialState: initialAuthState,
  reducers: {
    setAuth(state, action: PayloadAction<Partial<AuthState>>) {
      return { ...state, ...action.payload };
    },
    logout(state) {
      state.user = null;
      state.role = null;
      state.access = null;
      state.refresh = null;
    },
  },
});
export const { setAuth, logout } = authSlice.actions;

// --- GUESTS SLICE ---
export interface Guest { id: number; full_name: string; inn: string; phone: string; notes: string; registration_date: string; total_spent: number; visits_count: number; status: string; }
const guestsSlice = createSlice({
  name: 'guests',
  initialState: { guests: [], loading: false, error: null } as { guests: Guest[]; loading: boolean; error: string | null },
  reducers: {
    setGuests(state, action: PayloadAction<Guest[]>) { state.guests = action.payload; state.loading = false; state.error = null; },
    addGuest(state, action: PayloadAction<Guest>) { state.guests.push(action.payload); },
    updateGuest(state, action: PayloadAction<Guest>) { const idx = state.guests.findIndex(g => g.id === action.payload.id); if (idx !== -1) state.guests[idx] = action.payload; },
    removeGuest(state, action: PayloadAction<number>) { state.guests = state.guests.filter(g => g.id !== action.payload); },
    setGuestsLoading(state, action: PayloadAction<boolean>) { state.loading = action.payload; },
    setGuestsError(state, action: PayloadAction<string | null>) { state.error = action.payload; },
  },
});
export const { setGuests, addGuest, updateGuest, removeGuest, setGuestsLoading, setGuestsError } = guestsSlice.actions;

// --- ROOMS SLICE ---
export interface Room { id: number; number: string; room_class: string | { value: string; label: string }; description?: string; building: any; capacity: number; status: string; room_type?: string; is_active: boolean; price_per_night: number; rooms_count?: number; amenities?: string; }
const roomsSlice = createSlice({
  name: 'rooms',
  initialState: { rooms: [], loading: false, error: null } as { rooms: Room[]; loading: boolean; error: string | null },
  reducers: {
    setRooms(state, action: PayloadAction<Room[]>) { state.rooms = action.payload; state.loading = false; state.error = null; },
    addRoom(state, action: PayloadAction<Room>) { state.rooms.push(action.payload); },
    updateRoom(state, action: PayloadAction<Room>) { const idx = state.rooms.findIndex(r => r.id === action.payload.id); if (idx !== -1) state.rooms[idx] = action.payload; },
    removeRoom(state, action: PayloadAction<number>) { state.rooms = state.rooms.filter(r => r.id !== action.payload); },
    setRoomsLoading(state, action: PayloadAction<boolean>) { state.loading = action.payload; },
    setRoomsError(state, action: PayloadAction<string | null>) { state.error = action.payload; },
  },
});
export const { setRooms, addRoom, updateRoom, removeRoom, setRoomsLoading, setRoomsError } = roomsSlice.actions;

// --- BOOKINGS SLICE ---
export interface Booking { id: number; room: any; guest: any; check_in: string; check_out: string; status: string; people_count: number; payment_status?: string; total_amount?: number; price_per_night?: number; }
const bookingsSlice = createSlice({
  name: 'bookings',
  initialState: { bookings: [], loading: false, error: null } as { bookings: Booking[]; loading: boolean; error: string | null },
  reducers: {
    setBookings(state, action: PayloadAction<Booking[]>) { state.bookings = action.payload; state.loading = false; state.error = null; },
    addBooking(state, action: PayloadAction<Booking>) { state.bookings.push(action.payload); },
    updateBooking(state, action: PayloadAction<Booking>) { const idx = state.bookings.findIndex(b => b.id === action.payload.id); if (idx !== -1) state.bookings[idx] = action.payload; },
    removeBooking(state, action: PayloadAction<number>) { state.bookings = state.bookings.filter(b => b.id !== action.payload); },
    setBookingsLoading(state, action: PayloadAction<boolean>) { state.loading = action.payload; },
    setBookingsError(state, action: PayloadAction<string | null>) { state.error = action.payload; },
  },
});
export const { setBookings, addBooking, updateBooking, removeBooking, setBookingsLoading, setBookingsError } = bookingsSlice.actions;

// --- USERS SLICE ---
export interface User { id: number; username: string; role: string; phone: string; first_name: string; last_name: string; is_online: boolean; }
const usersSlice = createSlice({
  name: 'users',
  initialState: { users: [], loading: false, error: null } as { users: User[]; loading: boolean; error: string | null },
  reducers: {
    setUsers(state, action: PayloadAction<User[]>) { state.users = action.payload; state.loading = false; state.error = null; },
    addUser(state, action: PayloadAction<User>) { state.users.push(action.payload); },
    updateUser(state, action: PayloadAction<User>) { const idx = state.users.findIndex(u => u.id === action.payload.id); if (idx !== -1) state.users[idx] = action.payload; },
    removeUser(state, action: PayloadAction<number>) { state.users = state.users.filter(u => u.id !== action.payload); },
    setUsersLoading(state, action: PayloadAction<boolean>) { state.loading = action.payload; },
    setUsersError(state, action: PayloadAction<string | null>) { state.error = action.payload; },
  },
});
export const { setUsers, addUser, updateUser, removeUser, setUsersLoading, setUsersError } = usersSlice.actions;

// --- REPORTS SLICE ---
const reportsSlice = createSlice({
  name: 'reports',
  initialState: { reports: [], loading: false, error: null } as { reports: any[]; loading: boolean; error: string | null },
  reducers: {
    setReports(state, action: PayloadAction<any[]>) { state.reports = action.payload; state.loading = false; state.error = null; },
    setReportsLoading(state, action: PayloadAction<boolean>) { state.loading = action.payload; },
    setReportsError(state, action: PayloadAction<string | null>) { state.error = action.payload; },
  },
});
export const { setReports, setReportsLoading, setReportsError } = reportsSlice.actions;

// --- TRASH SLICE ---
const trashSlice = createSlice({
  name: 'trash',
  initialState: { trash: [], loading: false, error: null } as { trash: any[]; loading: boolean; error: string | null },
  reducers: {
    setTrash(state, action: PayloadAction<any[]>) { state.trash = action.payload; state.loading = false; state.error = null; },
    setTrashLoading(state, action: PayloadAction<boolean>) { state.loading = action.payload; },
    setTrashError(state, action: PayloadAction<string | null>) { state.error = action.payload; },
  },
});
export const { setTrash, setTrashLoading, setTrashError } = trashSlice.actions;

// --- LANG SLICE ---
interface LangState { lang: string; }
const initialLangState: LangState = { lang: 'ru' };
const langSlice = createSlice({
  name: 'lang',
  initialState: initialLangState,
  reducers: {
    setLang(state, action: PayloadAction<string>) { state.lang = action.payload; },
  },
});
export const { setLang } = langSlice.actions;

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    guests: guestsSlice.reducer,
    rooms: roomsSlice.reducer,
    bookings: bookingsSlice.reducer,
    users: usersSlice.reducer,
    reports: reportsSlice.reducer,
    trash: trashSlice.reducer,
    lang: langSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 