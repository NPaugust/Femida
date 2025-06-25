"use client";

import React from 'react';
import { useEffect, useState } from 'react';
// @ts-ignore
import { saveAs } from 'file-saver';
import { useTranslation } from 'react-i18next';
import { FaFileCsv, FaUserShield, FaUserCog, FaUserTie, FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

type User = {
  id: number;
  username: string;
  role: string;
  phone: string;
  email: string;
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
  const { t } = useTranslation();
  const [showAddModal, setShowAddModal] = useState(false);
  const [onlineFilter, setOnlineFilter] = useState<string>('');
  const [addForm, setAddForm] = useState({
    username: '',
    first_name: '',
    last_name: '',
    role: 'operator',
    phone: '',
    email: '',
    password: '',
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const [addFieldErrors, setAddFieldErrors] = useState<any>({});
  const [editUser, setEditUser] = useState<User | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<number|null>(null);

  useEffect(() => {
    const token = localStorage.getItem('access');
    if (!token) {
      window.location.href = '/login';
      return;
    }
    
    const fetchUsers = () => {
      fetch('http://127.0.0.1:8000/api/users/', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => {
          if (res.status === 403) {
            setError('Доступ только для администратора');
            return [];
          }
          return res.json();
        })
        .then(data => setUsers(data))
        .catch(() => setError('Ошибка загрузки пользователей'));
    };

    fetchUsers();
    
    // Обновляем каждые 30 секунд для актуального онлайн-статуса
    const interval = setInterval(fetchUsers, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const exportToCSV = () => {
    const header = 'Логин,Имя,Фамилия,Роль,Телефон,Email';
    const rows = users.map(u =>
      `${u.username},${u.first_name},${u.last_name},${u.role},${u.phone},${u.email}`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'users.csv');
  };

  const roleReport = () => {
    const roles = filteredUsers.reduce((acc, u) => {
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
    if (!addForm.email) errors.email = 'Обязательное поле';
    if (!addForm.password || addForm.password.length < 8) errors.password = 'Минимум 8 символов';
    return errors;
  };
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(''); setAddSuccess('');
    const errors = validateAddForm();
    setAddFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setAddLoading(true);
    try {
      const token = localStorage.getItem('access');
      const res = await fetch('http://127.0.0.1:8000/api/users/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(addForm),
      });
      if (!res.ok) {
        const data = await res.json();
        setAddError(data.detail || 'Ошибка создания пользователя');
        setAddFieldErrors(data);
      } else {
        setAddSuccess('Пользователь успешно создан!');
        setShowAddModal(false);
        setAddForm({ username: '', first_name: '', last_name: '', role: 'operator', phone: '', email: '', password: '' });
        // обновить список
        fetch('http://127.0.0.1:8000/api/users/', {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then(res => res.json())
          .then(data => setUsers(data));
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
      email: u.email,
      password: '',
    });
    setShowAddModal(true);
  };

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm('Удалить пользователя?')) return;
    const token = localStorage.getItem('access');
    await fetch(`http://127.0.0.1:8000/api/users/${userId}/`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    // обновить список
    fetch('http://127.0.0.1:8000/api/users/', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => setUsers(data));
  };

  // Фильтрация пользователей
  const filteredUsers = users.filter(user => {
    if (onlineFilter === 'online') return user.is_online;
    if (onlineFilter === 'offline') return !user.is_online;
    return true;
  });

  return (
    <div className="">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Пользователи</h1>
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
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow transition-all duration-200"
          >
            <FaFileCsv />
            {t('export_csv')}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow transition-all duration-200"
          >
            <FaPlus /> Добавить сотрудника
          </button>
        </div>
      </div>
      {showAddModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#1a1a1a]/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-0 w-full max-w-xl relative animate-modal-in border border-gray-100">
            <div className="flex flex-col items-center pt-8 pb-2 px-8">
              <div className="-mt-12 mb-2 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-4xl shadow-lg border-4 border-white -translate-y-4">
                  <FaUserShield />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-6">Добавить сотрудника</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none"
                aria-label="Закрыть"
              >
                ×
              </button>
              <form onSubmit={handleAddSubmit} className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-sm">Логин</label>
                  <input name="username" value={addForm.username} onChange={handleAddChange} required className={`input text-base py-2 ${addFieldErrors.username ? 'border-red-400' : ''}`} placeholder="Логин (например, ivanov)" autoFocus />
                  {addFieldErrors.username && <span className="text-xs text-red-500 mt-1">{addFieldErrors.username}</span>}
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-sm">Имя</label>
                  <input name="first_name" value={addForm.first_name} onChange={handleAddChange} required className={`input text-base py-2 ${addFieldErrors.first_name ? 'border-red-400' : ''}`} placeholder="Имя" />
                  {addFieldErrors.first_name && <span className="text-xs text-red-500 mt-1">{addFieldErrors.first_name}</span>}
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-sm">Фамилия</label>
                  <input name="last_name" value={addForm.last_name} onChange={handleAddChange} required className={`input text-base py-2 ${addFieldErrors.last_name ? 'border-red-400' : ''}`} placeholder="Фамилия" />
                  {addFieldErrors.last_name && <span className="text-xs text-red-500 mt-1">{addFieldErrors.last_name}</span>}
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-sm">Роль</label>
                  <select name="role" value={addForm.role} onChange={handleAddChange} className={`input text-base py-2 ${addFieldErrors.role ? 'border-red-400' : ''}`}> 
                    <option value="superadmin">Супер Админ</option>
                    <option value="admin">Админ</option>
                  </select>
                  {addFieldErrors.role && <span className="text-xs text-red-500 mt-1">{addFieldErrors.role}</span>}
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-sm">Телефон</label>
                  <PhoneInput
                    country={'kg'}
                    value={addForm.phone.replace('+', '')}
                    onChange={handlePhoneChange}
                    inputClass={`!w-full !text-base !py-2 ${addFieldErrors.phone ? '!border-red-400' : ''}`}
                    buttonClass="!bg-gray-100"
                    containerClass="!w-full"
                    placeholder="Телефон сотрудника"
                    enableSearch
                  />
                  {addFieldErrors.phone && <span className="text-xs text-red-500 mt-1">{addFieldErrors.phone}</span>}
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-sm">Email</label>
                  <input name="email" value={addForm.email} onChange={handleAddChange} required className={`input text-base py-2 ${addFieldErrors.email ? 'border-red-400' : ''}`} placeholder="Email" />
                  {addFieldErrors.email && <span className="text-xs text-red-500 mt-1">{addFieldErrors.email}</span>}
                </div>
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="font-semibold text-sm">Пароль</label>
                  {editUser ? (
                    <input name="password" type="password" value={addForm.password} onChange={handleAddChange} required className={`input text-base py-2 ${addFieldErrors.password ? 'border-red-400' : ''}`} placeholder="Пароль (минимум 8 символов)" />
                  ) : (
                    <input name="password" type="password" value={addForm.password} onChange={handleAddChange} required className={`input text-base py-2 ${addFieldErrors.password ? 'border-red-400' : ''}`} placeholder="Пароль (минимум 8 символов)" />
                  )}
                  {addFieldErrors.password && <span className="text-xs text-red-500 mt-1">{addFieldErrors.password}</span>}
                </div>
                <div className="md:col-span-2 flex justify-end mt-2">
                  <button
                    type="submit"
                    disabled={addLoading}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-7 py-2 rounded-lg shadow font-semibold text-base transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <FaPlus /> {addLoading ? 'Добавление...' : 'Добавить'}
                  </button>
                </div>
                {addError && <div className="md:col-span-2 text-center text-red-500 text-sm mt-2">{addError}</div>}
                {addSuccess && <div className="md:col-span-2 text-center text-green-600 text-sm mt-2">Пользователь успешно создан!</div>}
              </form>
            </div>
          </div>
        </div>
      )}
      {error && <div className="text-red-500 mb-4">{error}</div>}
      <div className="overflow-x-auto rounded-lg shadow">
        <table className="min-w-full bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
          <thead>
            <tr className="bg-gray-50 text-gray-700">
              <th className="p-3 text-left">Аватар</th>
              <th className="p-3 text-left">Логин</th>
              <th className="p-3 text-left">Имя</th>
              <th className="p-3 text-left">Фамилия</th>
              <th className="p-3 text-left">Роль</th>
              <th className="p-3 text-left">Статус</th>
              <th className="p-3 text-left">Телефон</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(u => (
              <tr key={u.id} className="hover:bg-blue-50 transition-all">
                <td className="p-3">
                  <div className="w-9 h-9 rounded-full bg-blue-200 flex items-center justify-center font-bold text-blue-700">
                    {u.first_name?.[0] || u.username?.[0] || ''}
                  </div>
                </td>
                <td className="p-3 font-mono text-gray-700">{u.username}</td>
                <td className="p-3">{u.first_name}</td>
                <td className="p-3">{u.last_name}</td>
                <td className="p-3">
                  <span className={`inline-flex items-center px-2 py-1 rounded text-sm font-semibold ${roleColors[u.role] || 'bg-gray-100 text-gray-700'}`}> 
                    {roleIcons[u.role] || null}
                    {roleLabels[u.role] || u.role}
                  </span>
                </td>
                <td className="p-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${u.is_online ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    <span className={`inline-block w-2 h-2 rounded-full ${u.is_online ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                    {u.is_online ? 'Онлайн' : 'Офлайн'}
                  </span>
                </td>
                <td className="p-3">{u.phone}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(u)}
                      className="flex items-center gap-1 bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded shadow transition-all"
                    >
                      <FaEdit />Редактировать
                    </button>
                    <button
                      onClick={() => { setDeleteUserId(u.id); setShowDeleteModal(true); }}
                      className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded shadow transition-all"
                    >
                      <FaTrash />Удалить
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-4 mt-4 items-center">
        {filteredUsers.length > 0 && (
          <div className="font-semibold text-gray-600">
            {t('users')}: {filteredUsers.length} | {roleReport()}
          </div>
        )}
      </div>
      {showDeleteModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#1a1a1a]/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-0 w-full max-w-md relative animate-modal-in border border-gray-100">
            <div className="flex flex-col items-center pt-8 pb-2 px-8">
              <h2 className="text-xl font-bold mb-6">Удалить пользователя?</h2>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none"
                aria-label="Закрыть"
              >×</button>
              <div className="flex gap-4 mt-6 mb-4 justify-center">
                <button
                  onClick={async () => { if (deleteUserId !== null) { await handleDeleteUser(deleteUserId); setShowDeleteModal(false); } }}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-7 py-2 rounded-lg shadow font-semibold text-base transition-all duration-200"
                >Удалить</button>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 px-7 py-2 rounded-lg shadow font-semibold text-base transition-all duration-200"
                >Отмена</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 