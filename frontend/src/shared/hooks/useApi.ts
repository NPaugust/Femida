import { useState, useEffect } from 'react';

export const useApi = () => {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setToken(localStorage.getItem('access'));
    }
  }, []);

  const handleApiRequest = async (url: string, options: RequestInit = {}) => {
    if (!token) {
      window.location.href = '/login';
      return null;
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 401) {
      // Токен истек или недействителен
      localStorage.removeItem('access');
      localStorage.removeItem('refresh');
      window.location.href = '/login';
      return null;
    }

    return response;
  };

  const handleApiRequestWithAuth = async (url: string, options: RequestInit = {}) => {
    const response = await handleApiRequest(url, options);
    if (!response) return null;
    
    try {
      return await response.json();
    } catch (error) {
      console.error('Error parsing JSON response:', error);
      return null;
    }
  };

  return {
    token,
    handleApiRequest,
    handleApiRequestWithAuth,
  };
}; 