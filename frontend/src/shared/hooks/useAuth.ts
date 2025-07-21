import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch, setAuth, logout as reduxLogout } from '../../app/store';
import { useCallback } from 'react';

export const useAuth = () => {
  const auth = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch<AppDispatch>();

  // Логин: обновляет store и cookies (если нужно)
  const login = useCallback((accessToken: string, refreshToken: string, role: string, user?: any) => {
    document.cookie = `access=${accessToken}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Strict`;
    document.cookie = `refresh=${refreshToken}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Strict`;
    document.cookie = `role=${role}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Strict`;
    if (user) document.cookie = `user=${encodeURIComponent(JSON.stringify(user))}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Strict`;
    dispatch(setAuth({ access: accessToken, refresh: refreshToken, role, user }));
  }, [dispatch]);

  // Логаут: очищает store и cookies
  const logout = useCallback(() => {
    document.cookie = 'access=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'refresh=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    dispatch(reduxLogout());
  }, [dispatch]);

  // Получить токен из store
  const getToken = useCallback(() => auth.access, [auth.access]);

  // Проверка авторизации
  const isAuthenticated = !!auth.access;
  const user = auth.user;
  const role = auth.role;
  const loading = false; // Можно добавить логику загрузки при инициализации

  return {
    isAuthenticated,
    user,
    role,
    loading,
    login,
    logout,
    getToken,
  };
}; 