'use client';

import { useState, useEffect } from 'react';
import { FaUserCircle, FaSignOutAlt, FaCog, FaQuestionCircle } from 'react-icons/fa';
import { API_URL } from '../shared/api';
import { useTranslation } from 'react-i18next';

// SVG Lady Justice (упрощённая векторизация)
const LadyJusticeLogo = () => (
  <svg width="40" height="40" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g>
      <path d="M40 60 Q60 30 90 50 Q120 70 130 40 Q140 20 160 40 Q170 60 150 80 Q130 100 120 120 Q110 140 130 150 Q150 160 170 140" stroke="#17406A" strokeWidth="8" fill="none"/>
      <ellipse cx="60" cy="60" rx="18" ry="22" fill="#17406A"/>
      <rect x="120" y="120" width="12" height="40" rx="6" fill="#17406A"/>
      <path d="M126 160 Q130 180 150 180 Q170 180 174 160" stroke="#17406A" strokeWidth="6" fill="none"/>
      <g>
        <line x1="126" y1="140" x2="174" y2="140" stroke="#17406A" strokeWidth="6"/>
        <ellipse cx="135" cy="180" rx="8" ry="6" fill="none" stroke="#17406A" strokeWidth="3"/>
        <ellipse cx="165" cy="180" rx="8" ry="6" fill="none" stroke="#17406A" strokeWidth="3"/>
        <line x1="135" y1="140" x2="135" y2="180" stroke="#17406A" strokeWidth="3"/>
        <line x1="165" y1="140" x2="165" y2="180" stroke="#17406A" strokeWidth="3"/>
      </g>
    </g>
  </svg>
);

type User = {
  username: string;
  first_name: string;
  last_name: string;
  role: string;
  email: string;
  phone?: string;
};

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [showDocumentation, setShowDocumentation] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
  });
  const { i18n } = useTranslation();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('access');
        if (!token) {
          window.location.href = '/login';
          return;
        }

        const res = await fetch(`${API_URL}/api/users/me/`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
          localStorage.setItem('role', userData.role);
        }
      } catch (error) {
        console.error('Ошибка загрузки пользователя:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();

    // Устанавливаем язык из localStorage при загрузке
    const lang = localStorage.getItem('lang');
    if (lang && lang !== i18n.language) {
      i18n.changeLanguage(lang);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('role');
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
      const token = localStorage.getItem('access');
      const res = await fetch(`${API_URL}/api/users/profile/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editForm),
      });
      
      if (res.ok && user) {
        // Обновить данные пользователя в localStorage и состоянии
        const updatedUser: User = { 
          ...user, 
          first_name: editForm.first_name,
          last_name: editForm.last_name,
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        setEditMode(false);
      } else {
        console.error('Ошибка обновления профиля');
      }
    } catch (error) {
      console.error('Ошибка сети');
    }
  };

  const handleLangChange = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('lang', lang);
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 flex items-center justify-between px-8 py-4 h-16">
      {/* Логотип и заголовок */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center">
            <LadyJusticeLogo />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Фемида</h1>
            <p className="text-sm text-gray-500">Админ-панель пансионата</p>
          </div>
        </div>
      </div>

      {/* Правая часть с пользователем */}
      <div className="flex items-center gap-4">
        {/* Документация */}
        <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors" onClick={() => setShowDocumentation(true)} title="Документация">
          <FaQuestionCircle size={18} />
        </button>
        
        {/* Настройки */}
        <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors" onClick={() => setShowProfile(true)} title="Профиль">
          <FaCog size={18} />
        </button>

        {/* Информация о пользователе */}
        {user && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                {user.first_name} {user.last_name}
              </div>
              <div className="text-xs text-gray-500">{user.username}</div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                {getRoleLabel(user.role)}
              </span>
            </div>

            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <FaUserCircle className="text-blue-600" size={20} />
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              title="Выйти"
            >
              <FaSignOutAlt size={14} />
              <span className="hidden sm:inline">Выйти</span>
            </button>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
            <div className="w-20 h-4 bg-gray-200 rounded animate-pulse"></div>
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