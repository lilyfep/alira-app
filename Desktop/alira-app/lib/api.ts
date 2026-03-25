// ─── lib/api.ts ─────────────────────────────────────────────────────────────
// Cliente API centralizado. Maneja:
//   • Token de acceso (15 min) y refresh automático (30 días)
//   • Todas las llamadas pasan por apiFetch()
//   • Si el access_token expira → refresca y reintenta la llamada original

import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_URL = 'https://web-production-cfc01.up.railway.app/api/v1';

// ── Guardar / leer tokens ────────────────────────────────────────────────────
export const saveTokens = async (access: string, refresh: string) => {
  await AsyncStorage.multiSet([
    ['access_token',  access],
    ['refresh_token', refresh],
  ]);
};

export const clearSession = async () => {
  await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
};

// ── Refresh del access token ─────────────────────────────────────────────────
const refreshAccessToken = async (): Promise<string | null> => {
  try {
    const refresh = await AsyncStorage.getItem('refresh_token');
    if (!refresh) return null;

    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${refresh}`,
      },
    });

    if (!res.ok) {
      await clearSession();
      return null;
    }

    const data = await res.json();
    const newToken = data.data?.access_token;
    if (newToken) {
      await AsyncStorage.setItem('access_token', newToken);
      return newToken;
    }
    return null;
  } catch {
    return null;
  }
};

// ── Cliente principal ─────────────────────────────────────────────────────────
export const apiFetch = async (
  path: string,
  options: RequestInit = {},
  retry = true
): Promise<{ ok: boolean; status: number; data: any }> => {
  const token = await AsyncStorage.getItem('access_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  // Token expirado → intentar refresh y reintentar UNA vez
  if (res.status === 401 && retry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return apiFetch(path, options, false);
    }
    // Sin refresh válido → sesión expirada
    return { ok: false, status: 401, data: { message: 'Sesión expirada' } };
  }

  let data: any = {};
  try { data = await res.json(); } catch { /* respuesta vacía */ }

  return { ok: res.ok, status: res.status, data };
};

// ── Helpers de dominio ────────────────────────────────────────────────────────
export const api = {
  // Auth
  login: (email: string, password: string) =>
    apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (username: string, email: string, password: string) =>
    apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    }),

  logout: () => apiFetch('/auth/logout', { method: 'POST' }),

  forgotPassword: (email: string) =>
    apiFetch('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  // Libros
  getBooks: () => apiFetch('/books/'),

  updateBook: (id: number, payload: Record<string, any>) =>
    apiFetch(`/books/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  // Buscar (Google Books via API)
  search: (q: string) => apiFetch(`/search/?q=${encodeURIComponent(q)}`),

  // Wishreads
  getWishreads: () => apiFetch('/wishreads/'),

  addWishread: (payload: Record<string, any>) =>
    apiFetch('/wishreads/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateWishread: (id: number, payload: Record<string, any>) =>
    apiFetch(`/wishreads/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteWishread: (id: number) =>
    apiFetch(`/wishreads/${id}`, { method: 'DELETE' }),

  // Perfil
  // Bibliotecas
  getLibraries: () =>
    apiFetch('/libraries/'),

  getLibrary: (id: number) =>
    apiFetch(`/libraries/${id}`),

  createLibrary: (nombre: string, emoji: string, color: string) =>
    apiFetch('/libraries/', {
      method: 'POST',
      body: JSON.stringify({ nombre, emoji, color }),
    }),

  updateLibrary: (id: number, payload: { nombre?: string; emoji?: string; color?: string }) =>
    apiFetch(`/libraries/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteLibrary: (id: number) =>
    apiFetch(`/libraries/${id}`, { method: 'DELETE' }),

  addBookToLibrary: (libraryId: number, bookId: number) =>
    apiFetch(`/libraries/${libraryId}/books`, {
      method: 'POST',
      body: JSON.stringify({ book_id: bookId }),
    }),

  removeBookFromLibrary: (libraryId: number, bookId: number) =>
    apiFetch(`/libraries/${libraryId}/books/${bookId}`, { method: 'DELETE' }),

  getBookLibraries: (bookId: number) =>
    apiFetch(`/libraries/book/${bookId}`),

  // Perfil
  getProfile: () => apiFetch('/profile/'),

  updateEmail: (email: string, password: string) =>
    apiFetch('/profile/email', {
      method: 'PATCH',
      body: JSON.stringify({ email, password }),
    }),

  updatePassword: (current_password: string, new_password: string) =>
    apiFetch('/profile/password', {
      method: 'PATCH',
      body: JSON.stringify({ current_password, new_password }),
    }),

  deleteAccount: (password: string) =>
    apiFetch('/profile/', {
      method: 'DELETE',
      body: JSON.stringify({ password, confirmacion: 'ELIMINAR' }),
    }),
  getStats: () => apiFetch('/stats/'),

  // Racha diaria

  getRachaDiaria: () =>
    apiFetch('/stats/racha-diaria'),

  marcarLeerHoy: () =>
    apiFetch('/stats/leer-hoy', { method: 'POST' }),

  desmarcarLeerHoy: () =>
    apiFetch('/stats/leer-hoy', { method: 'DELETE' }),

  getResumenAnual: (year: number, objetivo?: number) =>
    apiFetch(`/books/resumen/${year}${objetivo ? `?objetivo=${objetivo}` : ''}`),

  // Racha mensual
  getRachaMensual: () =>
    apiFetch('/stats/racha-mensual'),

  setObjetivoMensual: (year: number, month: number, objetivo: number) =>
    apiFetch('/stats/racha-mensual/objetivo', {
      method: 'POST',
      body: JSON.stringify({ year, month, objetivo }),
    }),

};
