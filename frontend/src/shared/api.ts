// Определяем API URL в зависимости от окружения
const getApiUrl = () => {
  // Если есть переменная окружения, используем её
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // Если мы в браузере, определяем по текущему домену
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    // Для продакшена
    if (hostname === 'femida-two.vercel.app' || hostname === 'femida.kg') {
      return 'https://avgustin.pythonanywhere.com';
    }
    
    // Для локальной разработки
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://127.0.0.1:8000';
    }
  }
  
  // Fallback для серверного рендеринга
  return 'http://127.0.0.1:8000';
};

export const API_URL = getApiUrl(); 