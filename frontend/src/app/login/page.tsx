'use client';

import { useState } from 'react';
import { API_URL } from '../../shared/api';
import { FiUser, FiLock } from 'react-icons/fi';
import { useAuth } from '../../shared/hooks/useAuth';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/auth/token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok && data.access) {
        const resUser = await fetch(`${API_URL}/api/users/me/`, { headers: { Authorization: `Bearer ${data.access}` } });
        const user = await resUser.json();
        
        // Используем хук для логина
        login(data.access, data.refresh, user.role);
        
        window.location.href = '/';
      } else {
        setError('Неверный логин или пароль');
      }
    } catch {
      setError('Ошибка соединения с сервером');
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 via-blue-200 to-blue-400 animate-gradient-x">
      <form
        onSubmit={handleLogin}
        className="bg-white/90 p-8 rounded-3xl shadow-2xl w-full max-w-md flex flex-col gap-5 border border-blue-100 backdrop-blur-md"
        style={{ boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.18)' }}
      >
        <div className="flex flex-col items-center mb-2">
          <span className="text-4xl font-extrabold text-blue-700 tracking-tight mb-1">Femida</span>
          <span className="text-base text-blue-400 font-medium">Админ-панель пансионата</span>
        </div>
        <div className="relative">
          <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 text-xl" />
          <input
            type="text"
            placeholder="Логин"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50 text-gray-800 placeholder:text-blue-300 text-base transition"
            required
            autoFocus
          />
        </div>
        <div className="relative">
          <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 text-xl" />
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50 text-gray-800 placeholder:text-blue-300 text-base transition"
            required
          />
        </div>
        {error && <div className="text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center animate-shake">{error}</div>}
        <button
          type="submit"
          className={`w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white py-3 rounded-xl font-bold text-lg shadow-md hover:from-blue-700 hover:to-blue-600 transition-all duration-200 active:scale-95 ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
          disabled={loading}
        >
          {loading ? 'Вход...' : 'Войти'}
        </button>
      </form>
      <style>{`
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 6s ease-in-out infinite;
        }
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-shake {
          animation: shake 0.3s linear;
        }
        @keyframes shake {
          10%, 90% { transform: translateX(-2px); }
          20%, 80% { transform: translateX(4px); }
          30%, 50%, 70% { transform: translateX(-8px); }
          40%, 60% { transform: translateX(8px); }
        }
      `}</style>
    </div>
  );
}
