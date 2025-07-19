'use client';

import { useState } from 'react';
import { API_URL } from '../../shared/api';
import { FiUser, FiLock, FiEye, FiEyeOff, FiHome, FiUsers, FiCalendar } from 'react-icons/fi';
import { useAuth } from '../../shared/hooks/useAuth';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
        const user = data.user;
        login(data.access, data.refresh, user.role);
        window.location.href = '/dashboard';
      } else {
        setError('Неверный логин или пароль');
      }
    } catch {
      setError('Ошибка соединения с сервером');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        {/* Logo and branding */}
        <div className="text-center mb-8 animate-fade-in-down">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-2xl mb-6">
            <FiHome className="text-white text-3xl" />
          </div>
          <h1 className="text-5xl font-black bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent mb-2">
            Femida
          </h1>
          <p className="text-lg text-gray-600 font-medium">Система управления пансионатом</p>
        </div>

        {/* Login form */}
        <div className="w-full max-w-md">
          <form
            onSubmit={handleLogin}
            className="bg-white/90 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/20 animate-fade-in-up"
            style={{
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)'
            }}
          >
            <div className="space-y-6">
              {/* Username field */}
              <div className="relative group">
                <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl group-focus-within:text-blue-500 transition-colors duration-200" />
                <input
                  type="text"
                  placeholder="Введите логин"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50/50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:bg-white text-gray-800 placeholder:text-gray-400 text-base font-medium transition-all duration-300 hover:border-gray-300"
                  required
                  autoFocus
                />
              </div>

              {/* Password field */}
              <div className="relative group">
                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl group-focus-within:text-blue-500 transition-colors duration-200" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Введите пароль"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-4 bg-gray-50/50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:bg-white text-gray-800 placeholder:text-gray-400 text-base font-medium transition-all duration-300 hover:border-gray-300"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  {showPassword ? <FiEyeOff className="text-xl" /> : <FiEye className="text-xl" />}
                </button>
              </div>

              {/* Error message */}
              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-2xl px-4 py-3 text-center animate-shake">
                  <p className="text-red-600 font-medium">{error}</p>
                </div>
              )}

              {/* Login button */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ${
                  loading ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                    Вход в систему...
                  </div>
                ) : (
                  'Войти в систему'
                )}
              </button>
            </div>
          </form>

          {/* Features preview */}
          <div className="mt-8 grid grid-cols-3 gap-4 animate-fade-in-up animation-delay-300">
            <div className="text-center p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20">
              <FiUsers className="text-2xl text-blue-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">Управление гостями</p>
            </div>
            <div className="text-center p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20">
              <FiCalendar className="text-2xl text-blue-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">Бронирования</p>
            </div>
            <div className="text-center p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20">
              <FiHome className="text-2xl text-blue-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">Номера</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        
        @keyframes fade-in-down {
          0% { opacity: 0; transform: translateY(-30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes shake {
          10%, 90% { transform: translateX(-2px); }
          20%, 80% { transform: translateX(4px); }
          30%, 50%, 70% { transform: translateX(-8px); }
          40%, 60% { transform: translateX(8px); }
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        .animate-fade-in-down {
          animation: fade-in-down 0.8s ease-out;
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-3000 {
          animation-delay: 3s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}
