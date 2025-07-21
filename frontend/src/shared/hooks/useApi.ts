import { useSelector } from 'react-redux';
import { RootState } from '../../app/store';

export const useApi = () => {
  const token = useSelector((state: RootState) => state.auth.access);

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

export default useApi; 