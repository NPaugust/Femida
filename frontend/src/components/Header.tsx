'use client';

import { useState, useEffect } from 'react';
import { FaUserCircle, FaSignOutAlt, FaCog, FaQuestionCircle, FaSearch } from 'react-icons/fa';
import { API_URL } from '../shared/api';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../shared/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch, setAuth } from '../app/store';

// Логотип Фемида
const FemidaLogo = () => (
  <img src="/femida-logo.png" alt="Фемида" className="w-full h-full rounded-full" />
);

type User = {
  username: string;
  first_name: string;
  last_name: string;
  role: string;
  email: string;
  phone?: string;
};

export default function Header({ onSidebarOpen }: { onSidebarOpen: () => void }) {
  const dispatch = useDispatch<AppDispatch>();
  const auth = useSelector((state: RootState) => state.auth);
  const user = auth.user;
  const role = auth.role;
  const access = auth.access;
  const [loading, setLoading] = useState(!user);
  const [showProfile, setShowProfile] = useState(false);
  const [showDocumentation, setShowDocumentation] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const { i18n } = useTranslation();
  const { logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        if (!access) {
          window.location.href = '/login';
          return;
        }
        const res = await fetch(`${API_URL}/api/users/me/`, {
          headers: { Authorization: `Bearer ${access}` },
        });
        if (res.ok) {
          const userData = await res.json();
          dispatch(setAuth({ user: userData, role: userData.role }));
        }
      } catch (error) {
        console.error('Ошибка загрузки пользователя:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
    // Язык из Redux (если есть langSlice), иначе i18n.language
  }, [access, dispatch]);

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'superadmin':
        return 'Супер Админ';
      case 'admin':
        return 'Админ';
      default:
        return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'superadmin':
        return 'bg-blue-100 text-blue-700';
      case 'admin':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const handleEditSave = async () => {
    try {
      if (!access || !user?.id) return;
      // Собираем только нужные поля
      const payload: any = {
        first_name: editForm.first_name,
        last_name: editForm.last_name,
      };
      // Если backend требует username/email, добавь их:
      if (user.username) payload.username = user.username;
      if (user.email) payload.email = user.email;

      const res = await fetch(`${API_URL}/api/users/${user.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${access}`,
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const updatedUser = await res.json();
        dispatch(setAuth({ user: updatedUser }));
        setEditMode(false);
      } else {
        const errorData = await res.json();
        alert(errorData.detail || errorData.error || 'Ошибка обновления профиля');
      }
    } catch (error) {
      alert('Ошибка сети');
    }
  };

  // handleLangChange — если есть langSlice, диспатчить setLang, иначе i18n.changeLanguage
  const handleLangChange = (lang: string) => {
    i18n.changeLanguage(lang);
    // localStorage.setItem('lang', lang); // Удалено
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      
      // Проверяем названия разделов
      if (query.includes('бронирования') || query.includes('бронирование') || query.includes('booking')) {
        router.push(`/bookings?search=${encodeURIComponent(searchQuery.trim())}`);
        return;
      }
      
      if (query.includes('гости') || query.includes('гость') || query.includes('guest')) {
        router.push(`/guests?search=${encodeURIComponent(searchQuery.trim())}`);
        return;
      }
      
      if (query.includes('отчеты') || query.includes('отчёт') || query.includes('отчёты') || query.includes('report')) {
        router.push(`/reports?search=${encodeURIComponent(searchQuery.trim())}`);
        return;
      }
      
      if (query.includes('корзина') || query.includes('trash') || query.includes('удаленные')) {
        router.push(`/trash?search=${encodeURIComponent(searchQuery.trim())}`);
        return;
      }
      
      if (query.includes('корпус') || query.includes('здание') || query.includes('building')) {
        router.push(`/buildings?search=${encodeURIComponent(searchQuery.trim())}`);
        return;
      }
      
      if (query.includes('номер') || query.includes('комната') || query.includes('room') || /^\d+$/.test(query)) {
        router.push(`/rooms?search=${encodeURIComponent(searchQuery.trim())}`);
        return;
      }
      
      // По умолчанию ищем в бронированиях
      router.push(`/bookings?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="bg-gradient-to-r from-white to-blue-50 shadow-lg border-b border-blue-100 flex items-center justify-between px-6 md:px-8 py-4 h-18">
      {/* Кнопка-меню для открытия сайдбара */}
      <button 
        className="mr-4 p-3 text-gray-600 hover:text-blue-700 focus:outline-none rounded-xl bg-white/80 hover:bg-blue-100 transition-all duration-300 shadow-sm hover:shadow-md" 
        aria-label="Меню" 
        onClick={onSidebarOpen}
      >
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
          <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
      
      {/* Логотип и заголовок */}
      <div 
        className="flex items-center gap-4 cursor-pointer select-none group transition-all duration-300 hover:scale-105" 
        onClick={() => window.location.href = '/dashboard'}
      >
        <div className="w-12 h-12 flex items-center justify-center bg-white rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300 border border-gray-200">
          <FemidaLogo />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800 leading-tight group-hover:text-blue-700 transition-colors">Фемида</h1>
          <p className="text-sm text-gray-600 -mt-1 font-bold">Админ-панель пансионата</p>
        </div>
      </div>
      
      {/* Правая часть */}
      <div className="flex items-center gap-3 ml-auto">
        {/* Глобальный поиск */}
        <div className="max-w-lg">
          <form onSubmit={handleSearch} className="relative">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск гостей, номеров ..."
                className="w-full pl-10 pr-4 py-2 bg-white/90 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm hover:shadow-md transition-all duration-300 text-sm"
              />
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
            </div>
          </form>
        </div>
        {/* Документация */}
        <a 
          href="/docs" 
          className="p-3 text-gray-500 hover:text-blue-600 transition-all duration-300 rounded-xl bg-white/80 hover:bg-blue-100 shadow-sm hover:shadow-md" 
          title="Документация"
        >
          <FaQuestionCircle size={18} />
        </a>
        
        {/* Настройки */}
        <button 
          className="p-3 text-gray-500 hover:text-blue-600 transition-all duration-300 rounded-xl bg-white/80 hover:bg-blue-100 shadow-sm hover:shadow-md" 
          onClick={() => setShowProfile(true)} 
          title="Профиль"
        >
          <FaCog size={18} />
        </button>
        
        {/* Информация о пользователе и выход */}
        {user && (
          <div className="flex items-center gap-3">
            <span className={`px-3 py-2 rounded-xl text-sm font-semibold shadow-sm ${getRoleColor(user.role)}`}>
              {getRoleLabel(user.role)}
            </span>
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg border border-gray-200">
              <FaUserCircle className="text-gray-600" size={20} />
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all duration-300 shadow-sm hover:shadow-md"
              title="Выйти"
            >
              <FaSignOutAlt size={14} />
              <span className="hidden sm:inline font-medium">Выйти</span>
            </button>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-xl animate-pulse"></div>
            <div className="w-24 h-4 bg-gray-200 rounded animate-pulse"></div>
          </div>
        )}
      </div>

      {/* Модалка профиля */}
      {showProfile && user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md relative">
            <button onClick={() => setShowProfile(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold">×</button>
            <h2 className="text-2xl font-bold mb-4">Профиль</h2>
            
            {!editMode ? (
              <div className="space-y-2">
                <div><b>Имя:</b> {user.first_name}</div>
                <div><b>Фамилия:</b> {user.last_name}</div>
                <div><b>Роль:</b> {getRoleLabel(user.role)}</div>
                <div><b>Логин:</b> {user.username}</div>
                <button 
                  onClick={() => {
                    setEditForm({
                      first_name: user.first_name,
                      last_name: user.last_name,
                    });
                    setEditMode(true);
                  }} 
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
                >
                  Редактировать
                </button>
              </div>
            ) : (
              <form className="space-y-3" onSubmit={e => { e.preventDefault(); handleEditSave(); }}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Имя</label>
                  <input 
                    name="first_name" 
                    value={editForm.first_name} 
                    onChange={e => setEditForm({...editForm, first_name: e.target.value})} 
                    className="input w-full" 
                    placeholder="Имя" 
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Фамилия</label>
                  <input 
                    name="last_name" 
                    value={editForm.last_name} 
                    onChange={e => setEditForm({...editForm, last_name: e.target.value})} 
                    className="input w-full" 
                    placeholder="Фамилия" 
                    required
                  />
                </div>
                <div className="flex gap-2 mt-4">
                  <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors">
                    Сохранить
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setEditMode(false)} 
                    className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded transition-colors"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Модалка документации */}
      {showDocumentation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto relative">
            <button onClick={() => setShowDocumentation(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold">×</button>
            <h2 className="text-2xl font-bold mb-6 text-center">Документация по работе с админ-панелью</h2>
            
            <div className="space-y-6">
              {/* Основные разделы */}
              <section>
                <h3 className="text-lg font-semibold mb-3 text-blue-600">Основные разделы</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">🏠 Главная</h4>
                    <p className="text-sm text-gray-600">Обзор системы: статистика, карточки номеров, последние бронирования</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">🛏️ Номера</h4>
                    <p className="text-sm text-gray-600">Управление номерами: добавление, редактирование, статусы</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">📅 Бронирования</h4>
                    <p className="text-sm text-gray-600">Создание и управление бронированиями, фильтрация по датам</p>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">👥 Гости</h4>
                    <p className="text-sm text-gray-600">База данных гостей, добавление новых, поиск по ФИО</p>
                  </div>
                  <div className="bg-indigo-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">📊 Отчёты</h4>
                    <p className="text-sm text-gray-600">Аналитика и экспорт данных в CSV</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">💼 Сотрудники</h4>
                    <p className="text-sm text-gray-600">Управление персоналом (только для супер-админов)</p>
                  </div>
                </div>
              </section>

              {/* Статусы номеров */}
              <section>
                <h3 className="text-lg font-semibold mb-3 text-blue-600">Статусы номеров</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                    <span className="text-sm"><strong>Свободен</strong> — номер доступен для бронирования</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                    <span className="text-sm"><strong>Занят</strong> — есть активное бронирование</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm"><strong>На ремонте</strong> — номер недоступен</span>
                  </div>
                </div>
              </section>

              {/* Поиск и фильтрация */}
              <section>
                <h3 className="text-lg font-semibold mb-3 text-blue-600">Поиск и фильтрация</h3>
                <div className="space-y-3">
                  <div className="bg-gray-50 p-3 rounded">
                    <h4 className="font-medium mb-1">🔍 Поиск по тексту</h4>
                    <p className="text-sm text-gray-600">Введите часть названия, ФИО или номера для быстрого поиска</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <h4 className="font-medium mb-1">📅 Фильтр по дате</h4>
                    <p className="text-sm text-gray-600">Выберите точную дату в формате дд.мм.гггг для поиска по дате заезда/выезда</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <h4 className="font-medium mb-1">⬆️⬇️ Сортировка</h4>
                    <p className="text-sm text-gray-600">Кликните на заголовок колонки для сортировки. Третий клик сбрасывает сортировку</p>
                  </div>
                </div>
              </section>

              {/* Быстрые действия */}
              <section>
                <h3 className="text-lg font-semibold mb-3 text-blue-600">Быстрые действия</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">➕ Добавление</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Кнопки "Добавить" на главной — переход в раздел с открытой формой</li>
                      <li>• Клик по карточке номера — переход в раздел "Номера" с фильтром</li>
                      <li>• Все формы имеют валидацию и подсказки</li>
                    </ul>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">📤 Экспорт</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Кнопка "Экспорт в CSV" в каждом разделе</li>
                      <li>• Экспортируются только отфильтрованные данные</li>
                      <li>• Файл скачивается автоматически</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Советы */}
              <section>
                <h3 className="text-lg font-semibold mb-3 text-blue-600">Полезные советы</h3>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <ul className="text-sm text-gray-700 space-y-2">
                    <li>• <strong>Пагинация:</strong> В таблицах по 10 записей на страницу</li>
                    <li>• <strong>Статусы:</strong> Обновляются автоматически на основе бронирований</li>
                    <li>• <strong>Даты:</strong> Используйте формат дд.мм.гггг для корректного поиска</li>
                    <li>• <strong>Редактирование:</strong> Иконка карандаша для изменения, корзина для удаления</li>
                    <li>• <strong>Профиль:</strong> Нажмите на иконку настроек для изменения личных данных</li>
                  </ul>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </header>
  );
} 