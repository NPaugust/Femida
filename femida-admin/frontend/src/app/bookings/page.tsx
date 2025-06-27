'use client';

import { useEffect, useState } from 'react';
// @ts-ignore
import { saveAs } from 'file-saver';
import { useTranslation } from 'react-i18next';
import { FaCalendarCheck, FaTrash, FaFileCsv, FaPlus, FaEdit, FaMoneyBillWave, FaCreditCard, FaCheckCircle, FaTimesCircle, FaChartBar } from 'react-icons/fa';
import { API_URL } from '../../shared/api';
import dynamic from 'next/dynamic';
import 'react-datepicker/dist/react-datepicker.css';
import DatePickerClient from '../../components/DatePickerClient';
import { useSearchParams } from 'next/navigation';
import ConfirmModal from '../../components/ConfirmModal';

type RoomClass = string | { value: string; label: string };

type Room = {
  id: number;
  number: string;
  room_class: RoomClass;
  capacity: number;
  building: number;
  status: string;
};

type Guest = {
  id: number;
  full_name: string;
  inn: string;
  phone: string;
};

type Booking = {
  id: number;
  room: Room;
  guest: Guest;
  date_from: string;
  date_to: string;
  people_count: number;
  check_in: string;
  check_out: string;
  payment_status: string;
  payment_amount: number;
  payment_method: string;
  comments: string;
  total_amount: number;
};

const ROOM_CLASS_LABELS: Record<string, string> = {
  standard: 'Стандарт',
  semi_lux: 'Полу-люкс',
  lux: 'Люкс',
};

const PAYMENT_STATUSES = [
  { value: 'pending', label: 'Ожидает оплаты', color: 'bg-yellow-200 text-yellow-800' },
  { value: 'paid', label: 'Оплачено', color: 'bg-green-200 text-green-800' },
  { value: 'partial', label: 'Частично оплачено', color: 'bg-blue-200 text-blue-800' },
  { value: 'cancelled', label: 'Отменено', color: 'bg-red-200 text-red-800' },
];

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Наличные' },
  { value: 'card', label: 'Банковская карта' },
  { value: 'transfer', label: 'Банковский перевод' },
  { value: 'online', label: 'Онлайн оплата' },
  { value: 'other', label: 'Другое' },
];

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Добавить функцию для доступа к вложенным полям:
function getFieldValue(obj: any, path: string) {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

// Добавить утилиту для форматирования даты:
function toYMD(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export default function BookingsPage() {
  const { t } = useTranslation();
  const [token, setToken] = useState<string | null>(null);
  const [tokenLoaded, setTokenLoaded] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [roomId, setRoomId] = useState('');
  const [guestId, setGuestId] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [searchGuest, setSearchGuest] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    room: '',
    guest: '',
    date_from: '',
    date_to: '',
    payment_status: 'pending',
    payment_amount: '',
    payment_method: 'cash',
    comments: '',
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const [peopleCount, setPeopleCount] = useState(1);
  const [filterBuilding, setFilterBuilding] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const bookingsPerPage = 10;
  
  // Состояние для редактирования
  const [showEditModal, setShowEditModal] = useState(false);
  const [editBooking, setEditBooking] = useState<Booking | null>(null);
  const [editForm, setEditForm] = useState({
    room: '',
    guest: '',
    date_from: '',
    date_to: '',
    payment_status: 'pending',
    payment_amount: '',
    payment_method: 'cash',
    comments: '',
  });
  const [editPeopleCount, setEditPeopleCount] = useState(1);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  const searchParams = useSearchParams();

  const [sortState, setSortState] = useState<{ field: string | null; order: 'asc' | 'desc' | null }>({ field: null, order: null });

  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [selectedDeleteId, setSelectedDeleteId] = useState<number | null>(null);

  const [filterPaymentStatus, setFilterPaymentStatus] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
  const [filterAmountFrom, setFilterAmountFrom] = useState('');
  const [filterAmountTo, setFilterAmountTo] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSort = (field: string) => {
    setSortState(prev => {
      if (prev.field !== field) return { field, order: 'asc' };
      if (prev.order === 'asc') return { field, order: 'desc' };
      if (prev.order === 'desc') return { field: null, order: null };
      return { field, order: 'asc' };
    });
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setToken(localStorage.getItem('access'));
      setTokenLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!tokenLoaded) return;
    if (!token) {
      window.location.href = '/login';
      return;
    }
    setLoading(true);
    Promise.all([
      fetch(`${API_URL}/api/bookings/`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_URL}/api/rooms/`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_URL}/api/guests/`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_URL}/api/buildings/`, { headers: { Authorization: `Bearer ${token}` } }),
    ])
      .then(async ([bookingsRes, roomsRes, guestsRes, buildingsRes]) => {
        const bookingsData = await bookingsRes.json();
        const roomsData = await roomsRes.json();
        const guestsData = await guestsRes.json();
        const buildingsData = await buildingsRes.json();
        setBookings(bookingsData);
        setRooms(roomsData);
        setGuests(guestsData);
        setBuildings(buildingsData);
        setLoading(false);
      })
      .catch(() => {
        setError('Ошибка загрузки данных');
        setLoading(false);
      });
    if (searchParams.get('add') === '1') {
      setShowAddModal(true);
    } else {
      setShowAddModal(false);
    }
  }, [token, tokenLoaded, success, searchParams]);

  const handleAddChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setAddForm({ ...addForm, [e.target.name]: e.target.value });
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError('');
    setAddSuccess('');
    if (!addForm.room || !addForm.guest || !addForm.date_from || !addForm.date_to) {
      setAddError('Заполните все обязательные поля');
      setAddLoading(false);
      return;
    }
    try {
      if (!token) return;
      const res = await fetch(`${API_URL}/api/bookings/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          room_id: Number(addForm.room),
          guest_id: Number(addForm.guest),
          check_in: toYMD(addForm.date_from),
          check_out: toYMD(addForm.date_to),
          people_count: peopleCount,
          payment_status: addForm.payment_status,
          payment_amount: addForm.payment_amount ? Number(addForm.payment_amount) : 0,
          payment_method: addForm.payment_method,
          comments: addForm.comments,
        }),
      });
      if (!res.ok) {
        let data: any = {};
        try { data = await res.json(); } catch {}
        const errorMessage = data.detail || (data.non_field_errors && data.non_field_errors[0]) || JSON.stringify(data) || 'Ошибка при создании бронирования';
        setAddError(errorMessage);
        showToast('error', errorMessage);
      } else {
        setAddSuccess('Бронирование успешно создано');
        showToast('success', 'Бронирование успешно создано');
        setShowAddModal(false);
        setAddForm({ room: '', guest: '', date_from: '', date_to: '', payment_status: 'pending', payment_amount: '', payment_method: 'cash', comments: '' });
        // Обновить список
        const bookingsData = await fetch(`${API_URL}/api/bookings/`, { headers: { Authorization: `Bearer ${token}` } });
        if (bookingsData) {
          setBookings(await bookingsData.json());
        }
      }
    } catch {
      const errorMessage = 'Ошибка сети';
      setAddError(errorMessage);
      showToast('error', errorMessage);
    } finally {
      setAddLoading(false);
    }
  };

  const handleDelete = async (bookingId: number) => {
    setSelectedDeleteId(bookingId);
    setShowConfirmDelete(true);
  };

  const confirmDelete = async () => {
    if (!selectedDeleteId || !token) return;
    const res = await fetch(`${API_URL}/api/bookings/${selectedDeleteId}/`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setSuccess('Бронирование удалено');
      showToast('success', 'Бронирование успешно удалено');
      setBookings(bookings.filter(b => b.id !== selectedDeleteId));
    } else {
      showToast('error', 'Ошибка при удалении бронирования');
    }
    setShowConfirmDelete(false);
    setSelectedDeleteId(null);
  };

  const handleEdit = (bookingId: number) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (booking) {
      setEditBooking(booking);
      setEditForm({
        room: booking.room.id.toString(),
        guest: booking.guest.id.toString(),
        date_from: booking.date_from || booking.check_in || '',
        date_to: booking.date_to || booking.check_out || '',
        payment_status: booking.payment_status || 'pending',
        payment_amount: booking.payment_amount ? String(booking.payment_amount) : '',
        payment_method: booking.payment_method || 'cash',
        comments: booking.comments || '',
      });
      setEditPeopleCount(booking.people_count || 1);
      setShowEditModal(true);
    }
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError('');
    setEditSuccess('');
    if (!editForm.room || !editForm.guest || !editForm.date_from || !editForm.date_to) {
      setEditError('Заполните все обязательные поля');
      setEditLoading(false);
      return;
    }
    try {
      if (!token) return;
      const res = await fetch(`${API_URL}/api/bookings/${editBooking?.id}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          room_id: Number(editForm.room),
          guest_id: Number(editForm.guest),
          check_in: toYMD(editForm.date_from),
          check_out: toYMD(editForm.date_to),
          people_count: editPeopleCount,
          payment_status: editForm.payment_status,
          payment_amount: editForm.payment_amount ? Number(editForm.payment_amount) : 0,
          payment_method: editForm.payment_method,
          comments: editForm.comments,
        }),
      });
      if (!res.ok) {
        let data: any = {};
        try { data = await res.json(); } catch {}
        const errorMessage = data.detail || (data.non_field_errors && data.non_field_errors[0]) || JSON.stringify(data) || 'Ошибка при обновлении бронирования';
        setEditError(errorMessage);
        showToast('error', errorMessage);
      } else {
        setEditSuccess('Бронирование успешно обновлено');
        showToast('success', 'Бронирование успешно обновлено');
        setShowEditModal(false);
        setEditBooking(null);
        // Обновить список
        const bookingsData = await fetch(`${API_URL}/api/bookings/`, { headers: { Authorization: `Bearer ${token}` } });
        if (bookingsData) {
          setBookings(await bookingsData.json());
        }
      }
    } catch {
      const errorMessage = 'Ошибка сети';
      setEditError(errorMessage);
      showToast('error', errorMessage);
    } finally {
      setEditLoading(false);
    }
  };

  // Фильтрация и пагинация
  const filteredBookings = bookings.filter(b => {
    let matchesDate = true;
    if (filterDate) {
      // Используем date_from/date_to или check_in/check_out
      const from = new Date(b.date_from || b.check_in);
      const to = new Date(b.date_to || b.check_out);
      const filter = new Date(filterDate);
      from.setHours(0,0,0,0);
      to.setHours(0,0,0,0);
      filter.setHours(0,0,0,0);
      matchesDate = filter >= from && filter <= to;
    }
    const matchesBuilding = !filterBuilding || (rooms.find(r => r.id === b.room.id)?.building === Number(filterBuilding));
    const matchesGuest = !searchGuest || b.guest.full_name.toLowerCase().includes(searchGuest.toLowerCase());
    const matchesPaymentStatus = !filterPaymentStatus || b.payment_status === filterPaymentStatus;
    const matchesPaymentMethod = !filterPaymentMethod || b.payment_method === filterPaymentMethod;
    const matchesAmountFrom = !filterAmountFrom || (b.total_amount || 0) >= Number(filterAmountFrom);
    const matchesAmountTo = !filterAmountTo || (b.total_amount || 0) <= Number(filterAmountTo);
    
    return matchesDate && matchesBuilding && matchesGuest && matchesPaymentStatus && matchesPaymentMethod && matchesAmountFrom && matchesAmountTo;
  });

  const totalPages = Math.ceil(filteredBookings.length / bookingsPerPage);
  const paginatedBookings = filteredBookings.slice(
    (currentPage - 1) * bookingsPerPage,
    currentPage * bookingsPerPage
  );

  const sortedBookings = [...paginatedBookings];
  if (sortState.field && sortState.order) {
    sortedBookings.sort((a, b) => {
      let aValue = getFieldValue(a, sortState.field!);
      let bValue = getFieldValue(b, sortState.field!);
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();
      if (aValue < bValue) return sortState.order === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortState.order === 'asc' ? 1 : -1;
      return 0;
  });
  }

  const exportToCSV = () => {
    const header = 'Комната,Гость,Дата заезда,Дата выезда,Кол-во гостей,Статус оплаты,Сумма оплаты,Способ оплаты,Общая сумма,Комментарии';
    const rows = filteredBookings.map(b => {
      const paymentStatus = PAYMENT_STATUSES.find(s => s.value === b.payment_status)?.label || b.payment_status;
      const paymentMethod = PAYMENT_METHODS.find(m => m.value === b.payment_method)?.label || b.payment_method;
      return `№${b.room.number} — ${b.room.room_class},${b.guest.full_name},${b.date_from},${b.date_to},${b.people_count},${paymentStatus},${b.payment_amount || 0},${paymentMethod},${b.total_amount || 0},"${b.comments || ''}"`;
    });
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'bookings.csv');
  };

  const getOccupancyReport = () => {
    if (!filterDate) return null;
    const total = rooms.length;
    const occupied = bookings.filter(b => b.date_from <= filterDate && b.date_to >= filterDate).length;
    return `На ${filterDate}: занято ${occupied} из ${total} номеров (${Math.round((occupied/total)*100)}%)`;
  };

  // Получаем массив занятых дат для выбранной комнаты
  const getDisabledDates = (roomId: string) => {
    if (!roomId) return [];
    const busy = bookings.filter(b => String(b.room.id) === String(roomId));
    let dates: Date[] = [];
    busy.forEach(b => {
      const from = new Date(b.date_from);
      const to = new Date(b.date_to);
      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d));
      }
    });
    return dates;
  };

  const getAvailableRooms = () => {
    return rooms.filter(room => {
      if (room.capacity < peopleCount) return false;
      const overlaps = bookings.some(b =>
        b.room.id === room.id &&
        (
          (addForm.date_from && addForm.date_to) &&
          (
            (addForm.date_from >= b.date_from && addForm.date_from <= b.date_to) ||
            (addForm.date_to >= b.date_from && addForm.date_to <= b.date_to) ||
            (addForm.date_from <= b.date_from && addForm.date_to >= b.date_to)
          )
        )
      );
      return !overlaps;
    });
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const getBookingStatistics = () => {
    const total = filteredBookings.length;
    const paid = filteredBookings.filter(b => b.payment_status === 'paid').length;
    const pending = filteredBookings.filter(b => b.payment_status === 'pending').length;
    const partial = filteredBookings.filter(b => b.payment_status === 'partial').length;
    const totalAmount = filteredBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
    const paidAmount = filteredBookings.filter(b => b.payment_status === 'paid').reduce((sum, b) => sum + (b.payment_amount || 0), 0);
    
    return {
      total,
      paid,
      pending,
      partial,
      totalAmount,
      paidAmount,
      paidPercentage: total > 0 ? Math.round((paid / total) * 100) : 0,
      amountPercentage: totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0,
    };
  };

  const handlePaymentStatusChange = async (bookingId: number, newStatus: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/bookings/${bookingId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          payment_status: newStatus,
        }),
      });
      if (res.ok) {
        showToast('success', 'Статус оплаты обновлён');
        // Обновить список
        const bookingsData = await fetch(`${API_URL}/api/bookings/`, { headers: { Authorization: `Bearer ${token}` } });
        if (bookingsData) {
          setBookings(await bookingsData.json());
        }
      } else {
        showToast('error', 'Ошибка при обновлении статуса');
      }
    } catch {
      showToast('error', 'Ошибка сети');
    }
  };

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">{t('Бронирование номеров')}</h1>
        <div className="flex gap-2 flex-wrap items-center bg-white rounded-lg shadow px-4 py-2">
          <input
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="input w-40"
            placeholder="Фильтр по дате"
          />
          <select value={filterBuilding} onChange={e => setFilterBuilding(e.target.value)} className="input w-40">
            <option value="">Все корпуса</option>
            {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select value={filterPaymentStatus} onChange={e => setFilterPaymentStatus(e.target.value)} className="input w-40">
            <option value="">Все статусы оплаты</option>
            {PAYMENT_STATUSES.map(status => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
          <select value={filterPaymentMethod} onChange={e => setFilterPaymentMethod(e.target.value)} className="input w-40">
            <option value="">Все способы оплаты</option>
            {PAYMENT_METHODS.map(method => (
              <option key={method.value} value={method.value}>{method.label}</option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Сумма от"
            value={filterAmountFrom}
            onChange={e => setFilterAmountFrom(e.target.value)}
            className="input w-24"
          />
          <input
            type="number"
            placeholder="до"
            value={filterAmountTo}
            onChange={e => setFilterAmountTo(e.target.value)}
            className="input w-24"
          />
          <input
            type="text"
            placeholder="Поиск по гостю"
            value={searchGuest}
            onChange={e => setSearchGuest(e.target.value)}
            className="input w-48"
          />
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow transition-all duration-200 h-11 min-w-[170px] text-base font-normal"
          >
            <FaFileCsv /> Экспорт в CSV
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow transition-all duration-200 h-11 min-w-[170px] text-base font-normal ml-2"
          >
            <FaPlus /> Добавить бронирование
          </button>
        </div>
      </div>
      {/* Статистика бронирований */}
      {(() => {
        const stats = getBookingStatistics();
        return (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2">
                <FaChartBar className="text-blue-600" />
                <span className="font-semibold">Всего бронирований</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2">
                <FaCheckCircle className="text-green-600" />
                <span className="font-semibold">Оплачено</span>
              </div>
              <div className="text-2xl font-bold text-green-600">{stats.paid} ({stats.paidPercentage}%)</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2">
                <FaMoneyBillWave className="text-yellow-600" />
                <span className="font-semibold">Общая сумма</span>
              </div>
              <div className="text-2xl font-bold text-yellow-600">{stats.totalAmount.toLocaleString()} сом</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2">
                <FaCreditCard className="text-purple-600" />
                <span className="font-semibold">Оплачено</span>
              </div>
              <div className="text-2xl font-bold text-purple-600">{stats.paidAmount.toLocaleString()} сом ({stats.amountPercentage}%)</div>
            </div>
          </div>
        );
      })()}
      {showAddModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#1a1a1a]/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-0 w-full max-w-xl relative animate-modal-in border border-gray-100">
            <div className="flex flex-col items-center pt-8 pb-2 px-8">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><FaCalendarCheck className="text-blue-600" />Добавить бронирование</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none"
                aria-label="Закрыть"
              >×</button>
              <form onSubmit={handleAddSubmit} className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-sm">Гость</label>
                  <select name="guest" value={addForm.guest} onChange={handleAddChange} className="input w-full h-11" required>
                    <option value="">Выберите гостя</option>
                    {guests.map(guest => (
                      <option key={guest.id} value={guest.id}>{guest.full_name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-sm">Количество гостей</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={peopleCount}
                    onChange={e => setPeopleCount(Number(e.target.value))}
                    className="input w-full h-11"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="font-semibold text-sm">Комната</label>
                  <select name="room" value={addForm.room} onChange={handleAddChange} className="input w-full h-11" required>
                    <option value="">Выберите комнату</option>
                    {getAvailableRooms().map(room => (
                      <option key={room.id} value={room.id}>
                        Номер: {room.number} — Вместимость: {room.capacity}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-sm">Дата заезда</label>
                  <DatePickerClient
                    selected={addForm.date_from ? new Date(addForm.date_from) : null}
                    onChange={(date: Date | null) => setAddForm(f => ({ ...f, date_from: date ? date.toISOString() : '' }))}
                    className="input w-full h-11"
                    dateFormat="HH:mm dd.MM.yyyy"
                    timeFormat="HH:mm"
                    showTimeSelect
                    timeIntervals={15}
                    excludeDates={getDisabledDates(addForm.room)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-sm">Дата выезда</label>
                  <DatePickerClient
                    selected={addForm.date_to ? new Date(addForm.date_to) : null}
                    onChange={(date: Date | null) => setAddForm(f => ({ ...f, date_to: date ? date.toISOString() : '' }))}
                    className="input w-full h-11"
                    dateFormat="HH:mm dd.MM.yyyy"
                    timeFormat="HH:mm"
                    showTimeSelect
                    timeIntervals={15}
                    excludeDates={getDisabledDates(addForm.room)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-sm">Статус оплаты</label>
                  <select name="payment_status" value={addForm.payment_status} onChange={handleAddChange} className="input w-full h-11">
                    {PAYMENT_STATUSES.map(status => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-sm">Сумма оплаты (сом)</label>
                  <input
                    type="number"
                    name="payment_amount"
                    value={addForm.payment_amount}
                    onChange={handleAddChange}
                    className="input w-full h-11"
                    min="0"
                    step="100"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-sm">Способ оплаты</label>
                  <select name="payment_method" value={addForm.payment_method} onChange={handleAddChange} className="input w-full h-11">
                    {PAYMENT_METHODS.map(method => (
                      <option key={method.value} value={method.value}>{method.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="font-semibold text-sm">Комментарии</label>
                  <textarea
                    name="comments"
                    value={addForm.comments}
                    onChange={handleAddChange}
                    className="input w-full h-11"
                    rows={3}
                    placeholder="Дополнительная информация..."
                  />
                </div>
                <div className="md:col-span-2 flex justify-end mt-4">
                  <button
                    type="submit"
                    disabled={addLoading}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded shadow transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <FaPlus /> {addLoading ? 'Добавление...' : 'Добавить'}
                  </button>
                </div>
                {addError && <div className="text-red-500 md:col-span-2">{addError}</div>}
                {addSuccess && <div className="text-green-600 md:col-span-2">Бронирование успешно создано!</div>}
              </form>
            </div>
          </div>
        </div>
      )}
      <div className="overflow-x-auto rounded-lg shadow max-w-full">
        <table className="w-full bg-white rounded-lg shadow">
          <thead>
            <tr className="bg-gray-50 text-gray-700">
              <th className="p-2 text-left" onClick={() => handleSort('room.number')}>Комната {sortState.field === 'room.number' && (sortState.order === 'asc' ? '▲' : sortState.order === 'desc' ? '▼' : '')}</th>
              <th className="p-2 text-left" onClick={() => handleSort('room.building')}>Корпус {sortState.field === 'room.building' && (sortState.order === 'asc' ? '▲' : sortState.order === 'desc' ? '▼' : '')}</th>
              <th className="p-2 text-left" onClick={() => handleSort('room.room_class')}>Класс {sortState.field === 'room.room_class' && (sortState.order === 'asc' ? '▲' : sortState.order === 'desc' ? '▼' : '')}</th>
              <th className="p-2 text-left" onClick={() => handleSort('room.capacity')}>Вместимость {sortState.field === 'room.capacity' && (sortState.order === 'asc' ? '▲' : sortState.order === 'desc' ? '▼' : '')}</th>
              <th className="p-2 text-left" onClick={() => handleSort('room.status')}>Статус {sortState.field === 'room.status' && (sortState.order === 'asc' ? '▲' : sortState.order === 'desc' ? '▼' : '')}</th>
              <th className="p-2 text-left" onClick={() => handleSort('guest.full_name')}>Гость {sortState.field === 'guest.full_name' && (sortState.order === 'asc' ? '▲' : sortState.order === 'desc' ? '▼' : '')}</th>
              <th className="p-2 text-left" onClick={() => handleSort('guest.phone')}>Телефон {sortState.field === 'guest.phone' && (sortState.order === 'asc' ? '▲' : sortState.order === 'desc' ? '▼' : '')}</th>
              <th className="p-2 text-left" onClick={() => handleSort('date_from')}>Дата заезда {sortState.field === 'date_from' && (sortState.order === 'asc' ? '▲' : sortState.order === 'desc' ? '▼' : '')}</th>
              <th className="p-2 text-left" onClick={() => handleSort('date_to')}>Дата выезда {sortState.field === 'date_to' && (sortState.order === 'asc' ? '▲' : sortState.order === 'desc' ? '▼' : '')}</th>
              <th className="p-2 text-left" onClick={() => handleSort('people_count')}>Кол-во гостей {sortState.field === 'people_count' && (sortState.order === 'asc' ? '▲' : sortState.order === 'desc' ? '▼' : '')}</th>
              <th className="p-2 text-left" onClick={() => handleSort('payment_status')}>Статус оплаты {sortState.field === 'payment_status' && (sortState.order === 'asc' ? '▲' : sortState.order === 'desc' ? '▼' : '')}</th>
              <th className="p-2 text-left" onClick={() => handleSort('payment_amount')}>Сумма оплаты {sortState.field === 'payment_amount' && (sortState.order === 'asc' ? '▲' : sortState.order === 'desc' ? '▼' : '')}</th>
              <th className="p-2 text-left" onClick={() => handleSort('total_amount')}>Общая сумма {sortState.field === 'total_amount' && (sortState.order === 'asc' ? '▲' : sortState.order === 'desc' ? '▼' : '')}</th>
              <th className="p-2 text-left" onClick={() => handleSort('payment_method')}>Способ оплаты {sortState.field === 'payment_method' && (sortState.order === 'asc' ? '▲' : sortState.order === 'desc' ? '▼' : '')}</th>
              <th className="p-2 text-left">Действия</th>
            </tr>
          </thead>
          <tbody>
            {sortedBookings.map(b => {
              const room = rooms.find(r => r.id === b.room.id);
              let buildingName = '-';
              if (room?.building) {
                const buildingVal: any = room.building;
                if (typeof buildingVal === 'object' && buildingVal.name) buildingName = buildingVal.name;
                else if (typeof buildingVal === 'number') {
                  const bld = buildings.find((b: any) => b.id === buildingVal);
                  if (bld && bld.name) buildingName = bld.name;
                } else if (typeof buildingVal === 'string') {
                  buildingName = buildingVal;
                }
              }
              const now = new Date().toISOString().slice(0, 10);
              const isActive = b.date_from <= now && b.date_to >= now;
              return (
                <tr key={b.id} className="hover:bg-blue-50 transition-all">
                  <td className="p-2">№{b.room.number}</td>
                  <td className="p-2">{buildingName}</td>
                  <td className="p-2">{typeof b.room.room_class === 'object' && b.room.room_class !== null ? b.room.room_class.label : ROOM_CLASS_LABELS[b.room.room_class as string] || b.room.room_class || '-'}</td>
                  <td className="p-2">{b.room.capacity || '-'}</td>
                  <td className="p-2">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${room?.status === 'busy' ? 'bg-red-200 text-red-800' : room?.status === 'repair' ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'}`}>
                      {room?.status === 'busy' ? 'Занят' : room?.status === 'repair' ? 'Ремонт' : 'Свободен'}
                    </span>
                  </td>
                  <td className="p-2 truncate max-w-[120px]" title={b.guest.full_name}>{b.guest.full_name}</td>
                  <td className="p-2 text-sm">{b.guest.phone || '-'}</td>
                  <td className="p-2">{formatDate(b.date_from || b.check_in)}</td>
                  <td className="p-2">{formatDate(b.date_to || b.check_out)}</td>
                  <td className="p-2">{b.people_count || '-'}</td>
                  <td className="p-2">
                    <select
                      value={b.payment_status || 'pending'}
                      onChange={(e) => handlePaymentStatusChange(b.id, e.target.value)}
                      className={`text-xs px-2 py-1 rounded-full font-semibold border-0 ${PAYMENT_STATUSES.find(s => s.value === b.payment_status)?.color || 'bg-gray-200 text-gray-800'}`}
                    >
                      {PAYMENT_STATUSES.map(status => (
                        <option key={status.value} value={status.value}>{status.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">{b.payment_amount ? `${b.payment_amount.toLocaleString()} сом` : '-'}</td>
                  <td className="p-2">{b.total_amount ? `${b.total_amount.toLocaleString()} сом` : '-'}</td>
                  <td className="p-2">{PAYMENT_METHODS.find(m => m.value === b.payment_method)?.label || b.payment_method || '-'}</td>
                  <td className="p-2">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleEdit(b.id)} 
                        className="text-blue-600 hover:text-blue-800"
                        title="Редактировать"
                      >
                        <FaEdit />
                      </button>
                      <button 
                        onClick={() => handleDelete(b.id)} 
                        className="text-red-600 hover:text-red-800"
                        title="Удалить"
                      >
                      <FaTrash />
                    </button>
                    </div>
                  </td>
                </tr>
              );
            })}
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
      
      {getOccupancyReport() && (
        <div className="mt-4 text-sm text-gray-600 bg-blue-50 rounded-lg px-4 py-2 shadow-inner">
          {getOccupancyReport()}
        </div>
      )}
      
      {/* Модальное окно редактирования */}
      {showEditModal && editBooking && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#1a1a1a]/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-0 w-full max-w-xl relative animate-modal-in border border-gray-100">
            <div className="flex flex-col items-center pt-8 pb-2 px-8">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><FaEdit className="text-blue-600" />Редактировать бронирование</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none"
                aria-label="Закрыть"
              >×</button>
              <form onSubmit={handleEditSubmit} className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-sm">Гость</label>
                  <select name="guest" value={editForm.guest} onChange={handleEditChange} className="input w-full h-11" required>
                    <option value="">Выберите гостя</option>
                    {guests.map(guest => (
                      <option key={guest.id} value={guest.id}>{guest.full_name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-sm">Количество гостей</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={editPeopleCount}
                    onChange={e => setEditPeopleCount(Number(e.target.value))}
                    className="input w-full h-11"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="font-semibold text-sm">Комната</label>
                  <select name="room" value={editForm.room} onChange={handleEditChange} className="input w-full h-11" required>
                    <option value="">Выберите комнату</option>
                    {rooms.map(room => (
                      <option key={room.id} value={room.id}>
                        Номер: {room.number} — Вместимость: {room.capacity}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-sm">Дата заезда</label>
                  <DatePickerClient
                    selected={editForm.date_from ? new Date(editForm.date_from) : null}
                    onChange={(date: Date | null) => setEditForm(f => ({ ...f, date_from: date ? date.toISOString() : '' }))}
                    className="input w-full h-11"
                    dateFormat="HH:mm dd.MM.yyyy"
                    timeFormat="HH:mm"
                    showTimeSelect
                    timeIntervals={15}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-sm">Дата выезда</label>
                  <DatePickerClient
                    selected={editForm.date_to ? new Date(editForm.date_to) : null}
                    onChange={(date: Date | null) => setEditForm(f => ({ ...f, date_to: date ? date.toISOString() : '' }))}
                    className="input w-full h-11"
                    dateFormat="HH:mm dd.MM.yyyy"
                    timeFormat="HH:mm"
                    showTimeSelect
                    timeIntervals={15}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-sm">Статус оплаты</label>
                  <select name="payment_status" value={editForm.payment_status} onChange={handleEditChange} className="input w-full h-11">
                    {PAYMENT_STATUSES.map(status => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-sm">Сумма оплаты (сом)</label>
                  <input
                    type="number"
                    name="payment_amount"
                    value={editForm.payment_amount}
                    onChange={handleEditChange}
                    className="input w-full h-11"
                    min="0"
                    step="100"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-sm">Способ оплаты</label>
                  <select name="payment_method" value={editForm.payment_method} onChange={handleEditChange} className="input w-full h-11">
                    {PAYMENT_METHODS.map(method => (
                      <option key={method.value} value={method.value}>{method.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="font-semibold text-sm">Комментарии</label>
                  <textarea
                    name="comments"
                    value={editForm.comments}
                    onChange={handleEditChange}
                    className="input w-full h-11"
                    rows={3}
                    placeholder="Дополнительная информация..."
                  />
                </div>
                <div className="md:col-span-2 flex justify-end mt-4">
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded shadow transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <FaEdit /> {editLoading ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </div>
                {editError && <div className="text-red-500 md:col-span-2">{editError}</div>}
                {editSuccess && <div className="text-green-600 md:col-span-2">{editSuccess}</div>}
              </form>
            </div>
          </div>
        </div>
      )}
      <ConfirmModal
        open={showConfirmDelete}
        title="Удалить бронирование?"
        description="Вы действительно хотите удалить это бронирование? Это действие необратимо."
        confirmText="Удалить"
        cancelText="Отмена"
        onConfirm={confirmDelete}
        onCancel={() => { setShowConfirmDelete(false); setSelectedDeleteId(null); }}
      />
      {/* Toast уведомления */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg animate-fade-in ${
          toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? (
              <FaCheckCircle className="text-white" />
            ) : (
              <FaTimesCircle className="text-white" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
