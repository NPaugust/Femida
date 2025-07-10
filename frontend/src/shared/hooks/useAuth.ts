import { useState, useEffect } from 'react';

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('access');
      setIsAuthenticated(!!token);
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = (accessToken: string, refreshToken: string, role: string) => {
    // Сохраняем в localStorage
    localStorage.setItem('access', accessToken);
    localStorage.setItem('refresh', refreshToken);
    localStorage.setItem('role', role);
    
    // Сохраняем в cookies для middleware
    document.cookie = `access=${accessToken}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Strict`;
    document.cookie = `refresh=${refreshToken}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Strict`;
    document.cookie = `role=${role}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Strict`;
    
    setIsAuthenticated(true);
  };

  const logout = () => {
    // Очищаем localStorage
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('role');
    
    // Очищаем cookies
    document.cookie = 'access=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'refresh=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    
    setIsAuthenticated(false);
    setUser(null);
  };

  const getToken = () => {
    return localStorage.getItem('access');
  };

  return {
    isAuthenticated,
    user,
    loading,
    login,
    logout,
    getToken,
  };
}; 