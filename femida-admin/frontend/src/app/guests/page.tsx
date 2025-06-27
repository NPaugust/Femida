'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
// @ts-ignore
import { saveAs } from 'file-saver';
import { FaUser, FaEdit, FaTrash, FaFileCsv, FaPlus } from 'react-icons/fa';
import dynamic from 'next/dynamic';
import 'react-phone-input-2/lib/style.css';
import { API_URL } from '../../shared/api';
import { useSearchParams } from 'next/navigation';

type Guest = {
  id: number;
  full_name: string;
  inn: string;
  phone: string;
};

const PhoneInput: any = dynamic(() => import('react-phone-input-2').then(mod => mod.default), { ssr: false });

export default function GuestsPage() {
  const { t } = useTranslation();
  const [guests, setGuests] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fullName, setFullName] = useState('');
  const [inn, setInn] = useState('');
  const [phone, setPhone] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editGuest, setEditGuest] = useState<Guest | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    full_name: '',
    inn: '',
    phone: '',
    country: 'kg',
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const [addFieldErrors, setAddFieldErrors] = useState<{[k:string]: string}>({});
  const [currentPage, setCurrentPage] = useState(1);
  const guestsPerPage = 10;
  const searchParams = useSearchParams();
  const [sortState, setSortState] = useState<{ field: string | null; order: 'asc' | 'desc' | null }>({ field: null, order: null });

  useEffect(() => {
    setLoading(true);
    fetchGuests();
    if (searchParams.get('add') === '1') {
      setShowAddModal(true);
    } else {
      setShowAddModal(false);
    }
  }, [success, searchParams]);

  const fetchGuests = () => {
    const token = localStorage.getItem('access');
    if (!token) {
      window.location.href = '/login';
      return;
    }
    Promise.all([
      fetch(`${API_URL}/api/guests/`, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json()),
      fetch(`${API_URL}/api/bookings/`, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json()),
    ])
      .then(([guestsData, bookingsData]) => {
        setGuests(guestsData);
        setBookings(bookingsData);
        setLoading(false);
      })
      .catch(() => {
        setError('Ошибка загрузки гостей');
        setLoading(false);
      });
  };

  const handleAddChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddForm({ ...addForm, [e.target.name]: e.target.value });
  };

  const handlePhoneChange = (value: string, data: any) => {
    setAddForm(f => ({ ...f, phone: '+' + value, country: data.countryCode }));
  };

  const validateGuestForm = () => {
    const errors: {[k:string]: string} = {};
    if (!addForm.full_name || addForm.full_name.length < 5) errors.full_name = 'ФИО слишком короткое';
    if (!/^[0-9]{14}$/.test(addForm.inn)) errors.inn = 'ИНН должен содержать ровно 14 цифр';
    if (!/^\+\d{7,16}$/.test(addForm.phone.replace(/\s/g, ''))) errors.phone = 'Введите корректный номер телефона';
    return errors;
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    setAddSuccess('');
    const errors = validateGuestForm();
    setAddFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setAddLoading(true);
    try {
      const token = localStorage.getItem('access');
      const res = await fetch(`${API_URL}/api/guests/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(addForm),
      });
      if (!res.ok) {
        setAddError('Ошибка при добавлении гостя. Проверьте корректность данных.');
      } else {
        setAddSuccess('Гость успешно добавлен');
        setShowAddModal(false);
        setAddForm({ full_name: '', inn: '', phone: '', country: 'kg' });
        setAddFieldErrors({});
        fetchGuests();
      }
    } catch {
      setAddError('Ошибка сети');
    } finally {
      setAddLoading(false);
    }
  };

  const handleEdit = (guest: Guest) => {
    setEditGuest(guest);
    setFullName(guest.full_name);
    setInn(guest.inn);
    setPhone(guest.phone);
  };

  const handleEditSave = async () => {
    if (!editGuest) return;
    const token = localStorage.getItem('access');
    const res = await fetch(`${API_URL}/api/guests/${editGuest.id}/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        full_name: fullName,
        inn: inn,
        phone: phone,
      }),
    });
    if (res.ok) {
      setEditGuest(null);
      setSuccess('Гость обновлён');
      fetchGuests();
    }
  };

  const handleDelete = async (guestId: number) => {
    if (!window.confirm('Удалить гостя?')) return;
    const token = localStorage.getItem('access');
    const res = await fetch(`${API_URL}/api/guests/${guestId}/`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setSuccess('Гость удалён');
      fetchGuests();
    }
  };

  const guestsArray = Array.isArray(guests) ? guests : [];
  const filteredGuests = guestsArray.filter(g =>
    (search ? g.full_name.toLowerCase().includes(search.toLowerCase()) : true)
  );

  const handleSort = (field: string) => {
    setSortState(prev => {
      if (prev.field !== field) return { field, order: 'asc' };
      if (prev.order === 'asc') return { field, order: 'desc' };
      if (prev.order === 'desc') return { field: null, order: null };
      return { field, order: 'asc' };
    });
  };

  const sortedGuests = [...filteredGuests];
  if (sortState.field && sortState.order) {
    sortedGuests.sort((a, b) => {
      let aValue = a[sortState.field!];
      let bValue = b[sortState.field!];
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();
      if (aValue < bValue) return sortState.order === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortState.order === 'asc' ? 1 : -1;
      return 0;
    });
  }

  // Пагинация
  const totalPages = Math.ceil(filteredGuests.length / guestsPerPage);
  const paginatedGuests = filteredGuests.slice(
    (currentPage - 1) * guestsPerPage,
    currentPage * guestsPerPage
  );

  const exportToCSV = () => {
    const header = 'ФИО,ИНН,Телефон';
    const rows = filteredGuests.map(g =>
      `${g.full_name},${g.inn},${g.phone}`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'guests.csv');
  };

  const getBookingCount = (guestId: number) => {
    return bookings.filter(b => b.guest?.id === guestId).length;
  };

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">{t('Список гостей')}</h1>
        <div className="flex gap-2 items-center bg-white rounded-lg shadow px-4 py-2">
          <input
            type="text"
            placeholder="Поиск по ФИО"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input w-48"
          />
          <button onClick={exportToCSV} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow transition-all duration-200">
            <FaFileCsv /> Экспорт в CSV
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow transition-all duration-200 ml-2"
          >
            <FaPlus /> Добавить гостя
          </button>
        </div>
      </div>
      {/* Модальное окно добавления гостя */}
      {showAddModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#1a1a1a]/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-0 w-full max-w-xl relative animate-modal-in border border-gray-100">
            <div className="flex flex-col items-center pt-8 pb-2 px-8">
              <div className="-mt-12 mb-2 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-4xl shadow-lg border-4 border-white -translate-y-4">
                  <FaUser />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-6">Добавить гостя</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none"
                aria-label="Закрыть"
              >
                ×
              </button>
              <form onSubmit={handleAddSubmit} className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="font-semibold">ФИО</label>
                  <input name="full_name" value={addForm.full_name} onChange={handleAddChange} required className="input" placeholder="Ваше фамилия имя и отчество" />
                </div>
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="font-semibold">ИНН</label>
                  <input name="inn" value={addForm.inn} onChange={handleAddChange} required className="input" placeholder="ИНН 14 цифр" />
                </div>
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="font-semibold">Телефон</label>
                  <PhoneInput
                    country={'kg'}
                    value={addForm.phone.replace('+', '')}
                    onChange={handlePhoneChange}
                    inputClass="!w-full !text-base !py-2"
                    buttonClass="!bg-gray-100"
                    containerClass="!w-full"
                    placeholder="Телефон"
                    enableSearch
                  />
                </div>
                <div className="md:col-span-2 flex justify-end mt-4">
                  <button
                    type="submit"
                    disabled={addLoading}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded shadow transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <FaUser /> {addLoading ? 'Добавление...' : 'Добавить'}
                  </button>
                </div>
                {addError && <div className="text-red-500 md:col-span-2">{addError}</div>}
                {addSuccess && <div className="text-green-600 md:col-span-2">Гость успешно добавлен!</div>}
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Современный list-view гостей */}
      {loading ? (
        <div className="text-center text-gray-500">Загрузка...</div>
      ) : error ? (
        <div className="text-red-500 mb-4">{error}</div>
      ) : (
        <div className="space-y-3">
          <table className="min-w-full bg-white rounded-lg shadow">
            <thead>
              <tr className="bg-gray-50 text-gray-700">
                <th className="p-3 text-left" onClick={() => handleSort('full_name')}>ФИО {sortState.field === 'full_name' && (sortState.order === 'asc' ? '▲' : sortState.order === 'desc' ? '▼' : '')}</th>
                <th className="p-3 text-left" onClick={() => handleSort('inn')}>ИНН {sortState.field === 'inn' && (sortState.order === 'asc' ? '▲' : sortState.order === 'desc' ? '▼' : '')}</th>
                <th className="p-3 text-left" onClick={() => handleSort('phone')}>Телефон {sortState.field === 'phone' && (sortState.order === 'asc' ? '▲' : sortState.order === 'desc' ? '▼' : '')}</th>
                <th className="p-3 text-left">Бронирования</th>
                <th className="p-3 text-left">Действия</th>
              </tr>
            </thead>
            <tbody>
              {sortedGuests.map(guest => (
                <tr key={guest.id} className="hover:bg-blue-50 transition-all">
                  <td className="p-3 font-semibold">{guest.full_name}</td>
                  <td className="p-3">{guest.inn}</td>
                  <td className="p-3">{guest.phone}</td>
                  <td className="p-3">
                    <span className="inline-block px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                      {getBookingCount(guest.id)}
                    </span>
                  </td>
                  <td className="p-3 flex gap-2">
                    <button onClick={() => handleEdit(guest)} className="text-yellow-600 hover:text-yellow-800">
                      <FaEdit />
                    </button>
                    <button onClick={() => handleDelete(guest.id)} className="text-red-600 hover:text-red-800">
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
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
        </div>
      )}
      {editGuest && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-lg animate-fade-in">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><FaEdit /> Редактировать гостя</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="font-semibold">ФИО</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="input" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-semibold">ИНН</label>
                <input type="text" value={inn} onChange={e => setInn(e.target.value)} className="input" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-semibold">Телефон</label>
                <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="input" />
              </div>
            </div>
            <div className="flex gap-2 mt-6 justify-end">
              <button onClick={handleEditSave} className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow transition-all"><FaEdit />Сохранить</button>
              <button onClick={() => setEditGuest(null)} className="flex items-center gap-1 bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded shadow transition-all">Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
