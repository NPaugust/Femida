'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaUser, FaEdit, FaTrash, FaFileCsv, FaPlus, FaFilter, FaEye, FaSearch, FaCalendarAlt, FaPhone, FaIdCard, FaMoneyBillWave, FaChartBar, FaCheckCircle, FaTimesCircle, FaUserPlus, FaBuilding, FaCreditCard } from 'react-icons/fa';
import dynamic from 'next/dynamic';
import 'react-phone-input-2/lib/style.css';
import { API_URL } from '../../shared/api';
import { useSearchParams } from 'next/navigation';
import ConfirmModal from '../../components/ConfirmModal';
import Pagination from '../../components/Pagination';

interface Guest {
  id: number;
  full_name: string;
  inn: string;
  phone: string;
  notes: string;
  registration_date: string;
  total_spent: number;
  visits_count: number;
  status: string;
}

const PhoneInput: any = dynamic(() => import('react-phone-input-2').then(mod => mod.default), { ssr: false });

const GUEST_STATUSES = [
  { value: 'active', label: 'Активный', color: 'bg-green-100 text-green-800' },
  { value: 'inactive', label: 'Неактивный', color: 'bg-gray-100 text-gray-800' },
  { value: 'vip', label: 'ВИП', color: 'bg-purple-100 text-purple-800' },
  { value: 'blacklist', label: 'Чёрный список', color: 'bg-red-100 text-red-800' },
];

interface GuestModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (guest: any) => void;
  initial?: Guest | null;
}

function GuestModal({ open, onClose, onSave, initial }: GuestModalProps) {
  const [form, setForm] = useState({
    full_name: initial?.full_name || '',
    inn: initial?.inn || '',
    phone: initial?.phone || '',
    country: 'kg',
    notes: initial?.notes || '',
    status: initial?.status || 'active',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  useEffect(() => {
    if (initial) {
      setForm({
        full_name: initial.full_name,
        inn: initial.inn,
        phone: initial.phone,
        country: 'kg',
        notes: initial.notes,
        status: initial.status,
      });
    } else {
      setForm({
        full_name: '',
        inn: '',
        phone: '',
        country: 'kg',
        notes: '',
        status: 'active',
      });
    }
    setErrors({});
  }, [initial, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
  };

  const handlePhoneChange = (value: string, data: any) => {
    setForm(f => ({ ...f, phone: '+' + value, country: data.countryCode }));
    if (errors.phone) {
      setErrors({ ...errors, phone: '' });
    }
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    if (!form.full_name || form.full_name.length < 3) {
      newErrors.full_name = 'ФИО должно содержать минимум 3 символа';
    }
    if (!form.inn || !/^[0-9]{14}$/.test(form.inn)) {
      newErrors.inn = 'ИНН должен содержать ровно 14 цифр';
    }
    if (!form.phone || !/^\+\d{7,16}$/.test(form.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Введите корректный номер телефона';
    }
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('access');
      const url = initial ? `${API_URL}/api/guests/${initial.id}/` : `${API_URL}/api/guests/`;
      const method = initial ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      if (response.ok) {
        const savedGuest = await response.json();
        onSave(savedGuest);
        onClose();
      } else {
        setErrors({ submit: 'Ошибка при сохранении гостя' });
      }
    } catch (error) {
      setErrors({ submit: 'Ошибка сети' });
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-xl relative animate-modal-in border border-gray-100 focus:outline-none">
        <h2 className="text-xl font-bold mb-6">{initial ? 'Редактировать гостя' : 'Добавить гостя'}</h2>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none">×</button>
        <form className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4" onSubmit={handleSubmit}>
          <label className="font-semibold md:text-right md:pr-2 flex items-center">ФИО *</label>
          <input type="text" name="full_name" className="input w-full" value={form.full_name} onChange={handleChange} />
          {errors.full_name && <div className="md:col-span-2 text-red-500 text-sm">{errors.full_name}</div>}

          <label className="font-semibold md:text-right md:pr-2 flex items-center">ИНН *</label>
          <input type="text" name="inn" className="input w-full" value={form.inn} onChange={handleChange} maxLength={14} />
          {errors.inn && <div className="md:col-span-2 text-red-500 text-sm">{errors.inn}</div>}

          <label className="font-semibold md:text-right md:pr-2 flex items-center">Телефон *</label>
          <PhoneInput
            country={'kg'}
            value={form.phone.replace('+', '')}
            onChange={handlePhoneChange}
            inputStyle={{ width: '100%' }}
            buttonClass="!bg-gray-100"
            containerClass="!w-full"
            placeholder="Введите номер телефона"
            enableSearch
          />
          {errors.phone && <div className="md:col-span-2 text-red-500 text-sm">{errors.phone}</div>}

          <label className="font-semibold md:text-right md:pr-2 flex items-center">Статус</label>
          <select name="status" className="input w-full" value={form.status} onChange={handleChange}>
            {GUEST_STATUSES.map(status => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>

          <label className="font-semibold md:text-right md:pr-2 flex items-center">Примечания</label>
          <textarea name="notes" className="input w-full md:col-span-1" rows={2} value={form.notes} onChange={handleChange} />

          {errors.submit && <div className="md:col-span-2 text-red-500 text-sm mt-2">{errors.submit}</div>}

          <div className="md:col-span-2 flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-5 py-2 rounded font-semibold">Отмена</button>
            <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-semibold shadow disabled:opacity-60 disabled:cursor-not-allowed">{loading ? 'Сохранение...' : (initial ? 'Сохранить' : 'Добавить')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function GuestsPage() {
  const { t } = useTranslation();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    spentFrom: '',
    spentTo: '',
  });
  const [selectedGuestIds, setSelectedGuestIds] = useState<number[]>([]);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | number[] | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  
  // Пагинация
  const [currentPage, setCurrentPage] = useState(1);
  const guestsPerPage = 9;

  useEffect(() => {
    fetchGuests();
    fetchBookings();
  }, []);

  const fetchGuests = async () => {
    try {
      const token = localStorage.getItem('access');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      const response = await fetch(`${API_URL}/api/guests/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setGuests(data);
      } else {
        setError('Ошибка загрузки гостей');
      }
    } catch (error) {
      setError('Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem('access');
      if (!token) return;
      const response = await fetch(`${API_URL}/api/bookings/`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setBookings(data);
      }
    } catch {}
  };

  const handleSave = (guest: Guest) => {
    if (editingGuest) {
      setGuests(prev => prev.map(g => g.id === guest.id ? guest : g));
    } else {
      setGuests(prev => [...prev, guest]);
    }
    setShowModal(false);
    setEditingGuest(null);
    setCurrentPage(1); // Сброс на первую страницу при добавлении/редактировании
  };

  const handleEdit = (guest: Guest) => {
    setEditingGuest(guest);
    setShowModal(true);
  };

  const handleDelete = (guestId: number) => {
    setDeleteTarget(guestId);
    setShowConfirmDelete(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      const token = localStorage.getItem('access');
      const ids = Array.isArray(deleteTarget) ? deleteTarget : [deleteTarget];
      
      await Promise.all(ids.map(id => 
        fetch(`${API_URL}/api/guests/${id}/`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
      ));

      setGuests(prev => prev.filter(g => !ids.includes(g.id)));
      setSelectedGuestIds([]);
    } catch (error) {
      setError('Ошибка при удалении');
    } finally {
      setDeleteTarget(null);
      setShowConfirmDelete(false);
    }
  };

  const handleSelectGuest = (id: number) => {
    setSelectedGuestIds(prev => 
      prev.includes(id) 
        ? prev.filter(gId => gId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedGuestIds.length === paginatedGuests.length) {
      setSelectedGuestIds([]);
    } else {
      setSelectedGuestIds(paginatedGuests.map(g => g.id));
    }
  };

  const handleMassDelete = () => {
    setDeleteTarget(selectedGuestIds);
    setShowConfirmDelete(true);
  };

  const exportToCSV = () => {
    const headers = ['ID', 'ФИО', 'ИНН', 'Телефон', 'Статус', 'Посещений', 'Оплачено', 'Дата регистрации'];
    const csvContent = [
      headers.join(','),
      ...filteredGuests.map(guest => [
        guest.id,
        `"${guest.full_name}"`,
        guest.inn,
        guest.phone,
        GUEST_STATUSES.find(s => s.value === guest.status)?.label || guest.status,
        guest.visits_count || 0,
        guest.total_spent || 0,
        guest.registration_date || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `guests_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const filteredGuests = guests.filter(guest => {
    const matchesSearch = !filters.search || 
      guest.full_name.toLowerCase().includes(filters.search.toLowerCase()) ||
      guest.phone.includes(filters.search) ||
      guest.inn.includes(filters.search);
    
    const matchesStatus = !filters.status || guest.status === filters.status;
    
    const spent = guest.total_spent || 0;
    const matchesSpent = (!filters.spentFrom || spent >= parseInt(filters.spentFrom)) &&
                        (!filters.spentTo || spent <= parseInt(filters.spentTo));

    return matchesSearch && matchesStatus && matchesSpent;
  });

  // Пагинация
  const totalPages = Math.ceil(filteredGuests.length / guestsPerPage);
  const paginatedGuests = filteredGuests.slice(
    (currentPage - 1) * guestsPerPage,
    currentPage * guestsPerPage
  );

  const getGuestStatistics = () => {
    const total = guests.length;
    const active = guests.filter(g => g.status === 'active').length;
    const totalBookings = guests.reduce((sum, g) => sum + (g.visits_count || 0), 0);
    const totalPaid = guests.reduce((sum, g) => sum + (Number(g.total_spent) || 0), 0);
    
    return { total, active, totalBookings, totalPaid };
  };

  // Для каждого гостя ищем его бронирования и сумму оплат
  const getGuestBookings = (guestId: number) => bookings.filter(b => 
    (typeof b.guest === 'object' ? b.guest.id : b.guest) === guestId
  );
  // Удаляю getGuestPaid и total_spent, amount_paid

  // Для карточки 'Забронированных гостей'
  const bookedGuestIds = new Set(
    bookings
      .filter(b => b.status === 'active')
      .map(b => typeof b.guest === 'object' ? b.guest.id : b.guest)
  );
  const bookedGuestsCount = guests.filter(g => bookedGuestIds.has(g.id)).length;

  // Для колонки 'Оплачено' в таблице гостей
  const totalPaid = bookings
    .filter(b => b.payment_status === 'paid')
    .reduce((sum, b) => sum + (b.total_amount || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка гостей...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-600 mb-4">{error}</p>
        <button 
          onClick={fetchGuests}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  const stats = getGuestStatistics();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Верхняя панель */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Гости</h1>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <FaUser className="text-blue-600" />
              <span>{stats.total} гостей</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                showFilters 
                  ? 'bg-blue-50 border-blue-200 text-blue-700' 
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FaFilter />
              Фильтры
            </button>
            
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <FaFileCsv />
              Экспорт
            </button>
            
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <FaPlus />
              Добавить
            </button>
          </div>
        </div>
      </div>

      {/* Статистика */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FaUser className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Всего гостей</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <FaCheckCircle className="text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Активных</p>
                <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <FaCalendarAlt className="text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Забронированных гостей</p>
                <p className="text-2xl font-bold text-gray-900">{bookedGuestsCount}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <FaCreditCard className="text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Оплачено</p>
                <p className="text-2xl font-bold text-gray-900">{Math.round(totalPaid).toLocaleString()} сом</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Фильтры */}
      {showFilters && (
        <div className="px-6 py-4 bg-white border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Поиск</label>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="ФИО, телефон, ИНН..."
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Статус</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Все статусы</option>
                {GUEST_STATUSES.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Оплачено</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={filters.spentFrom}
                  onChange={(e) => setFilters(prev => ({ ...prev, spentFrom: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="От"
                />
                <input
                  type="number"
                  value={filters.spentTo}
                  onChange={(e) => setFilters(prev => ({ ...prev, spentTo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="До"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Контент */}
      <div className="px-6 py-6">
        {paginatedGuests.length === 0 ? (
          <div className="text-center py-12">
            <FaUser className="text-gray-400 text-6xl mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Нет гостей</h3>
            <p className="text-gray-500 mb-4">
              {filters.search || filters.status || filters.spentFrom
                ? 'Попробуйте изменить фильтры'
                : 'Добавьте первого гостя'
              }
            </p>
            {!filters.search && !filters.status && !filters.spentFrom && (
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors mx-auto"
              >
                <FaPlus />
                Добавить гостя
              </button>
            )}
          </div>
        ) : (
          <div className='rounded-lg shadow bg-white w-full'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='bg-gray-50 text-gray-700'>
                  <th className='p-3 text-left '>
                    <input
                      type='checkbox'
                      checked={selectedGuestIds.length === paginatedGuests.length && paginatedGuests.length > 0}
                      onChange={handleSelectAll}
                      className='rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                    />
                  </th>
                  <th className='p-3 text-center '>Гость</th>
                  <th className='p-3 text-center '>ПИН</th>
                  <th className='p-3 text-center '>Контакты</th>
                  <th className='p-3 text-center '>Бронирование</th>
                  <th className='p-3 text-center '>Статус</th>
                  <th className='p-3 text-center '>Оплачено</th>
                  <th className='p-3 text-center'>Действия</th>
                </tr>
              </thead>
              <tbody>
                {paginatedGuests.map((guest, idx) => (
                  <tr key={guest.id} className={`transition-all border-b last:border-b-0 ${idx % 2 === 1 ? 'bg-gray-50' : 'bg-white'} hover:bg-blue-50`}>
                    <td className='p-3 text-left '>
                      <input
                        type='checkbox'
                        checked={selectedGuestIds.includes(guest.id)}
                        onChange={() => handleSelectGuest(guest.id)}
                        className='rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                      />
                    </td>
                    <td className='p-3 text-center '>
                      <span className='font-medium text-gray-900'>{guest.full_name}</span>
                      <div className='text-xs text-gray-500'>ID: {guest.id}</div>
                    </td>
                    <td className='p-3 text-center '>
                      <span className='text-sm font-mono'>{guest.inn}</span>
                    </td>
                    <td className='p-3 text-center '>
                      <span className='flex items-center gap-2 text-sm justify-center'>
                        <FaPhone className='text-gray-400' />
                        {guest.phone}
                      </span>
                    </td>
                    <td className='p-3 text-center'>
                      {(() => {
                        const guestBookings = bookings.filter(b => 
                          (typeof b.guest === 'object' ? b.guest.id : b.guest) === guest.id
                        );
                        if (guestBookings.length === 0) return 'Не забронирован';
                        const active = guestBookings.find(b => b.status === 'active');
                        if (active) return 'Забронирован';
                        const cancelled = guestBookings.find(b => b.status === 'cancelled');
                        if (cancelled) return 'Отменён';
                        return 'Не забронирован';
                      })()}
                    </td>
                    <td className='p-3 text-center '>
                      {(() => {
                        const status = GUEST_STATUSES.find(s => s.value === guest.status);
                        return (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status?.color || 'bg-gray-100 text-gray-800'}`}>
                            {status?.label || guest.status}
                          </span>
                        );
                      })()}
                    </td>
                    <td className='p-3 text-center'>
                      <span className='font-medium text-green-600'>
                        {(() => {
                          const guestBookings = bookings.filter(b => 
                            (typeof b.guest === 'object' ? b.guest.id : b.guest) === guest.id
                          );
                          const paidBookings = guestBookings.filter(b => b.payment_status === 'paid');
                          const totalPaid = paidBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
                          return totalPaid > 0 ? `${Math.round(totalPaid).toLocaleString()} сом` : 'Нет';
                        })()}
                      </span>
                    </td>
                    <td className='p-3 text-center'>
                      <div className='flex items-center gap-2 justify-center'>
                        <button
                          onClick={() => handleEdit(guest)}
                          className='bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded font-semibold flex items-center gap-1 text-xs'
                          title='Редактировать'
                        >
                          <FaEdit /> Ред.
                        </button>
                        <button
                          onClick={() => handleDelete(guest.id)}
                          className='bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded font-semibold flex items-center gap-1 text-xs'
                          title='Удалить'
                        >
                          <FaTrash /> Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Пагинация */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-white border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Показано {((currentPage - 1) * guestsPerPage) + 1} - {Math.min(currentPage * guestsPerPage, filteredGuests.length)} из {filteredGuests.length}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Назад
                </button>
                <span className="px-3 py-1 text-sm text-gray-700">
                  {currentPage} из {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Вперёд
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Массовые действия */}
      {selectedGuestIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex gap-4 bg-white shadow-xl rounded-full px-6 py-3 border items-center animate-fade-in">
          <span className="font-semibold text-blue-700">Выбрано: {selectedGuestIds.length}</span>
          <button
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded shadow flex items-center gap-2"
            onClick={handleMassDelete}
          >
            <FaTrash /> Удалить
          </button>
          <button
            className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded shadow flex items-center gap-2"
            onClick={() => { setSelectedGuestIds([]); }}
          >
            Отмена
          </button>
        </div>
      )}

      {/* Модалка */}
      <GuestModal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingGuest(null);
        }}
        onSave={handleSave}
        initial={editingGuest}
      />

      {/* Модалка подтверждения удаления */}
      <ConfirmModal
        open={showConfirmDelete}
        title="Удалить гостя?"
        description={
          Array.isArray(deleteTarget) 
            ? `Вы действительно хотите удалить ${deleteTarget.length} гостей? Это действие необратимо.`
            : "Вы действительно хотите удалить этого гостя? Это действие необратимо."
        }
        confirmText="Удалить"
        cancelText="Отмена"
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowConfirmDelete(false);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}