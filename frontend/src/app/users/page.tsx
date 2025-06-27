"use client";

import React from 'react';
import { useEffect, useState } from 'react';
// @ts-ignore
import { saveAs } from 'file-saver';
import { useTranslation } from 'react-i18next';
import { FaFileCsv, FaUserShield, FaUserCog, FaUserTie, FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { API_URL } from '../../shared/api';

type User = {
  id: number;
  username: string;
  role: string;
  phone: string;
  first_name: string;
  last_name: string;
  is_online: boolean;
};

const roleLabels: Record<string, string> = {
  superadmin: 'Супер Админ',
  admin: 'Админ',
};

const roleColors: Record<string, string> = {
  superadmin: 'bg-blue-100 text-blue-700',
  admin: 'bg-green-100 text-green-700',
};

const roleIcons: Record<string, React.ReactNode> = {
  superadmin: <FaUserShield className="inline mr-1" />,
  admin: <FaUserCog className="inline mr-1" />,
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();
  const [showAddModal, setShowAddModal] = useState(false);
  const [onlineFilter, setOnlineFilter] = useState<string>('');
  const [addForm, setAddForm] = useState({
    username: '',
    first_name: '',
    last_name: '',
    role: 'admin',
    phone: '',
    password: '',
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const [addFieldErrors, setAddFieldErrors] = useState<any>({});
  const [editUser, setEditUser] = useState<User | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<number|null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('access');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      const res = await fetch(`${API_URL}/api/users/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 403) {
        setError('Доступ только для администратора');
        setLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error('Ошибка загрузки пользователей');
      }

      const data = await res.json();
      
      // Проверяем, что data - это массив
      if (Array.isArray(data)) {
        setUsers(data);
        // Обновляем роль пользователя, если есть данные
        if (data.length > 0) {
          localStorage.setItem('role', data[0].role);
        }
      } else {
        setUsers([]);
        setError('Неверный формат данных');
      }
    } catch (err) {
      setError('Ошибка загрузки пользователей');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    
    // Обновляем каждые 60 секунд для актуального онлайн-статуса
    const interval = setInterval(fetchUsers, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const exportToCSV = () => {
    if (!Array.isArray(users) || users.length === 0) return;
    const header = 'Логин,Имя,Фамилия,Роль,Телефон';
    const rows = users.map(u =>
      `${u.username},${u.first_name},${u.last_name},${u.role},${u.phone}`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'users.csv');
  };

  const roleReport = () => {
    if (!Array.isArray(users)) return '';
    
    const roles = users.reduce((acc, u) => {
      if (u.role === 'superadmin' || u.role === 'admin') {
        acc[u.role] = (acc[u.role] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(roles)
      .map(([role, count]) => `${roleLabels[role] || role}: ${count}`)
      .join(', ');
  };

  const handleAddChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setAddForm({ ...addForm, [e.target.name]: e.target.value });
    setAddFieldErrors({ ...addFieldErrors, [e.target.name]: '' });
  };
  
  const handlePhoneChange = (value: string) => {
    setAddForm({ ...addForm, phone: '+' + value });
    setAddFieldErrors({ ...addFieldErrors, phone: '' });
  };
  
  const validateAddForm = () => {
    const errors: any = {};
    if (!addForm.username) errors.username = 'Обязательное поле';
    if (!addForm.first_name) errors.first_name = 'Обязательное поле';
    if (!addForm.last_name) errors.last_name = 'Обязательное поле';
    if (!addForm.role) errors.role = 'Обязательное поле';
    if (!addForm.phone || addForm.phone.length < 10) errors.phone = 'Введите корректный телефон';
    if (!addForm.password || addForm.password.length < 8) errors.password = 'Минимум 8 символов';
    return errors;
  };
  
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(''); 
    setAddSuccess('');
    const errors = validateAddForm();
    setAddFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    
    setAddLoading(true);
    try {
      const token = localStorage.getItem('access');
      let res;
      if (editUser) {
        // PATCH для редактирования
        res = await fetch(`${API_URL}/api/users/${editUser.id}/`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(addForm),
        });
      } else {
        // POST для создания
        res = await fetch(`${API_URL}/api/users/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(addForm),
        });
      }

      if (!res.ok) {
        const data = await res.json();
        setAddError(data.detail || (editUser ? 'Ошибка обновления пользователя' : 'Ошибка создания пользователя'));
        setAddFieldErrors(data);
      } else {
        setAddSuccess(editUser ? 'Пользователь успешно обновлён!' : 'Пользователь успешно создан!');
        setShowAddModal(false);
        setEditUser(null);
        setAddForm({ username: '', first_name: '', last_name: '', role: 'admin', phone: '', password: '' });
        await fetchUsers();
      }
    } catch (e) {
      setAddError('Ошибка сети');
    } finally {
      setAddLoading(false);
    }
  };

  const openEditModal = (u: User) => {
    setEditUser(u);
    setAddForm({
      username: u.username,
      first_name: u.first_name,
      last_name: u.last_name,
      role: u.role,
      phone: u.phone,
      password: '',
    });
    setShowAddModal(true);
  };

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm('Удалить пользователя?')) return;
    
    try {
      const token = localStorage.getItem('access');
      const res = await fetch(`${API_URL}/api/users/${userId}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        await fetchUsers();
      } else {
        setError('Ошибка удаления пользователя');
      }
    } catch (e) {
      setError('Ошибка сети');
    }
  };

  // Фильтрация пользователей
  const filteredUsers = Array.isArray(users) ? users.filter(user => {
    if (onlineFilter === 'online') return user.is_online;
    if (onlineFilter === 'offline') return !user.is_online;
    return true;
  }) : [];

  // Пагинация
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * usersPerPage,
    currentPage * usersPerPage
  );

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center text-gray-500">Загрузка пользователей...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Список сотрудников</h1>
        <div className="flex gap-2 items-center">
          <select
            value={onlineFilter}
            onChange={e => setOnlineFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Все пользователи</option>
            <option value="online">Только онлайн</option>
            <option value="offline">Только офлайн</option>
          </select>
          <button
            onClick={exportToCSV}
            disabled={!Array.isArray(users) || users.length === 0}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded shadow transition-all duration-200"
          >
            <FaFileCsv />
            {t('Экспорт в CSV')}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow transition-all duration-200"
          >
            <FaPlus /> Добавить сотрудника
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#1a1a1a]/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-0 w-full max-w-xl relative animate-modal-in border border-gray-100">
            <div className="flex flex-col items-center pt-8 pb-2 px-8">
              <div className="-mt-12 mb-2 flex items-center justify-center">
                <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center">
                  <FaUserShield className="text-white text-3xl" />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                {editUser ? 'Редактировать' : 'Добавить'} сотрудника
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none"
                aria-label="Закрыть"
              >×</button>
              <form onSubmit={handleAddSubmit} className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-sm">Логин *</label>
                  <input
                    name="username"
                    value={addForm.username}
                    onChange={handleAddChange}
                    className={`input w-full h-11 px-4 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 ${addFieldErrors.username ? 'border-red-500' : ''}`}
                    required
                  />
                  {addFieldErrors.username && <span className="text-red-500 text-xs">{addFieldErrors.username}</span>}
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-sm">Роль *</label>
                  <select
                    name="role"
                    value={addForm.role}
                    onChange={handleAddChange}
                    className={`input w-full h-11 px-4 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 ${addFieldErrors.role ? 'border-red-500' : ''}`}
                    required
                  >
                    <option value="admin">Админ</option>
                    <option value="superadmin">Супер Админ</option>
                  </select>
                  {addFieldErrors.role && <span className="text-red-500 text-xs">{addFieldErrors.role}</span>}
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-sm">Имя *</label>
                  <input
                    name="first_name"
                    value={addForm.first_name}
                    onChange={handleAddChange}
                    className={`input w-full h-11 px-4 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 ${addFieldErrors.first_name ? 'border-red-500' : ''}`}
                    required
                  />
                  {addFieldErrors.first_name && <span className="text-red-500 text-xs">{addFieldErrors.first_name}</span>}
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-sm">Фамилия *</label>
                  <input
                    name="last_name"
                    value={addForm.last_name}
                    onChange={handleAddChange}
                    className={`input w-full h-11 px-4 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 ${addFieldErrors.last_name ? 'border-red-500' : ''}`}
                    required
                  />
                  {addFieldErrors.last_name && <span className="text-red-500 text-xs">{addFieldErrors.last_name}</span>}
                </div>
                <div className="flex flex-col gap-1 md:col-span-1">
                  <label className="font-semibold text-sm">Телефон *</label>
                  <PhoneInput
                    country={'kg'}
                    value={typeof addForm.phone === 'string' ? addForm.phone.replace('+', '') : ''}
                    onChange={handlePhoneChange}
                    inputClass={`!w-full !h-11 !pl-14 !pr-4 !rounded !border !border-gray-300 !focus:ring-2 !focus:ring-blue-500 ${addFieldErrors.phone ? '!border-red-500' : ''}`}
                    containerClass="!w-full"
                  />
                  {addFieldErrors.phone && <span className="text-red-500 text-xs">{addFieldErrors.phone}</span>}
                </div>
                <div className="flex flex-col gap-1 md:col-span-1">
                  <label className="font-semibold text-sm">Пароль *</label>
                  <input
                    name="password"
                    type="password"
                    value={addForm.password}
                    onChange={handleAddChange}
                    className={`input w-full h-11 px-4 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 ${addFieldErrors.password ? 'border-red-500' : ''}`}
                    required
                  />
                  {addFieldErrors.password && <span className="text-red-500 text-xs">{addFieldErrors.password}</span>}
                </div>
                <div className="md:col-span-2 flex justify-end mt-4">
                  <button
                    type="submit"
                    disabled={addLoading}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded shadow transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <FaPlus /> {addLoading ? 'Сохранение...' : (editUser ? 'Сохранить' : 'Добавить')}
                  </button>
                </div>
                {addError && <div className="text-red-500 md:col-span-2">{addError}</div>}
                {addSuccess && <div className="text-green-600 md:col-span-2">{addSuccess}</div>}
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg shadow">
        <table className="min-w-full bg-white rounded-lg">
          <thead>
            <tr className="bg-gray-50 text-gray-700">
              <th className="p-3 text-left">Пользователь</th>
              <th className="p-3 text-left">Роль</th>
              <th className="p-3 text-left">Контакты</th>
              <th className="p-3 text-left">Статус</th>
              <th className="p-3 text-left">Действия</th>
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.map(user => (
              <tr key={user.id} className="hover:bg-blue-50 transition-all">
                <td className="p-3">
                  <div className="font-semibold">{user.first_name} {user.last_name}</div>
                  <div className="text-sm text-gray-500">{user.username}</div>
                </td>
                <td className="p-3">
                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${roleColors[user.role] || 'bg-gray-100 text-gray-700'}`}>
                    {roleIcons[user.role]}
                    {roleLabels[user.role] || user.role}
                  </span>
                </td>
                <td className="p-3">
                  <div className="text-sm">{user.phone}</div>
                </td>
                <td className="p-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${user.is_online ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    <span className={`w-2 h-2 rounded-full ${user.is_online ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                    {user.is_online ? 'Онлайн' : 'Офлайн'}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <button onClick={() => openEditModal(user)} className="flex items-center gap-1 bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded shadow transition-all">
                      <FaEdit /> Редактировать
                    </button>
                    <button onClick={() => handleDeleteUser(user.id)} className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded shadow transition-all">
                      <FaTrash /> Удалить
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-4">
          <button
            className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Назад
          </button>
          <span className="text-sm text-gray-500">Страница {currentPage} из {totalPages}</span>
          <button
            className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Вперёд
          </button>
        </div>
      )}

      {filteredUsers.length === 0 && !loading && (
        <div className="text-center text-gray-500 mt-8">
          {error ? 'Ошибка загрузки данных' : 'Пользователи не найдены'}
        </div>
      )}

      {roleReport() && (
        <div className="mt-4 text-sm text-gray-600 bg-blue-50 rounded-lg px-4 py-2 shadow-inner">
          {roleReport()}
        </div>
      )}
    </div>
  );
} 