'use client';

import { useEffect, useState } from 'react';
// @ts-ignore
import { saveAs } from 'file-saver';
import { useTranslation } from 'react-i18next';
import { FaCalendarCheck, FaTrash, FaFileCsv, FaPlus, FaEdit } from 'react-icons/fa';
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
};

const ROOM_CLASS_LABELS: Record<string, string> = {
  standard: 'Стандарт',
  semi_lux: 'Полу-люкс',
  lux: 'Люкс',
};

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

export default function BookingsPage() {
  const { t } = useTranslation();
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
  });
  const [editPeopleCount, setEditPeopleCount] = useState(1);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('access') : '';
  const searchParams = useSearchParams();

  const [sortState, setSortState] = useState<{ field: string | null; order: 'asc' | 'desc' | null }>({ field: null, order: null });

  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [selectedDeleteId, setSelectedDeleteId] = useState<number | null>(null);

  const handleSort = (field: string) => {
    setSortState(prev => {
      if (prev.field !== field) return { field, order: 'asc' };
      if (prev.order === 'asc') return { field, order: 'desc' };
      if (prev.order === 'desc') return { field: null, order: null };
      return { field, order: 'asc' };
    });
  };

  useEffect(() => {
    if (!token) {
      window.location.href = '/login';
      return;
    }
    setLoading(true);
    Promise.all([
      fetch(`${API_URL}/api/bookings/`, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json()),
      fetch(`${API_URL}/api/rooms/`, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json()),
      fetch(`${API_URL}/api/guests/`, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json()),
      fetch(`${API_URL}/api/buildings/`, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json()),
    ])
      .then(([bookingsData, roomsData, guestsData, buildingsData]) => {
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
  }, [token, success, searchParams]);

  const handleAddChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setAddForm({ ...addForm, [e.target.name]: e.target.value });
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError('');
    setAddSuccess('');
    if (!addForm.room || !addForm.guest || !addForm.date_from || !addForm.date_to) {
      setAddError('Заполните все поля');
      setAddLoading(false);
      return;
    }
    try {
      const token = localStorage.getItem('access');
      const res = await fetch(`${API_URL}/api/bookings/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          room_id: Number(addForm.room),
          guest_id: Number(addForm.guest),
          check_in: addForm.date_from,
          check_out: addForm.date_to,
          people_count: peopleCount,
        }),
      });
      if (!res.ok) {
        let data: any = {};
        try { data = await res.json(); } catch {}
        setAddError(data.detail || (data.non_field_errors && data.non_field_errors[0]) || JSON.stringify(data) || 'Ошибка при создании бронирования');
      } else {
        setAddSuccess('Бронирование успешно создано');
        setShowAddModal(false);
        setAddForm({ room: '', guest: '', date_from: '', date_to: '' });
        // Обновить список
        const bookingsRes = await fetch(`${API_URL}/api/bookings/`, { headers: { Authorization: `Bearer ${token}` } });
        setBookings(await bookingsRes.json());
      }
    } catch {
      setAddError('Ошибка сети');
    } finally {
      setAddLoading(false);
    }
  };

  const handleDelete = async (bookingId: number) => {
    setSelectedDeleteId(bookingId);
    setShowConfirmDelete(true);
  };

  const confirmDelete = async () => {
    if (!selectedDeleteId) return;
    const token = localStorage.getItem('access');
    const res = await fetch(`${API_URL}/api/bookings/${selectedDeleteId}/`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setSuccess('Бронирование удалено');
      setBookings(bookings.filter(b => b.id !== selectedDeleteId));
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
      });
      setEditPeopleCount(booking.people_count || 1);
      setShowEditModal(true);
    }
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError('');
    setEditSuccess('');
    
    if (!editForm.room || !editForm.guest || !editForm.date_from || !editForm.date_to) {
      setEditError('Заполните все поля');
      setEditLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('access');
      const res = await fetch(`${API_URL}/api/bookings/${editBooking?.id}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          room_id: Number(editForm.room),
          guest_id: Number(editForm.guest),
          check_in: editForm.date_from,
          check_out: editForm.date_to,
          people_count: editPeopleCount,
        }),
      });
      
      if (!res.ok) {
        let data: any = {};
        try { data = await res.json(); } catch {}
        setEditError(data.detail || (data.non_field_errors && data.non_field_errors[0]) || JSON.stringify(data) || 'Ошибка при обновлении бронирования');
      } else {
        setEditSuccess('Бронирование успешно обновлено');
        setShowEditModal(false);
        setEditBooking(null);
        // Обновить список
        const bookingsRes = await fetch(`${API_URL}/api/bookings/`, { headers: { Authorization: `Bearer ${token}` } });
        setBookings(await bookingsRes.json());
      }
    } catch {
      setEditError('Ошибка сети');
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
    return matchesDate && matchesBuilding && matchesGuest;
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
    const header = 'Комната,Гость,Дата заезда,Дата выезда';
    const rows = filteredBookings.map(b => {
      return `№${b.room.number} — ${b.room.room_class},${b.guest.full_name},${b.date_from},${b.date_to}`;
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

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">{t('Бронирование номеров')}</h1>
        <div className="flex gap-2 items-center bg-white rounded-lg shadow px-4 py-2">
          <input
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="input w-40"
            placeholder="Фильтр по дате"
          />
          <div className="text-xs text-gray-400 mt-1">Введите точную дату заезда/выезда</div>
          <select value={filterBuilding} onChange={e => setFilterBuilding(e.target.value)} className="input w-40">
            <option value="">Все корпуса</option>
            {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
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
      <div className="overflow-x-auto rounded-lg shadow">
        <table className="min-w-full bg-white rounded-lg shadow">
          <thead>
            <tr className="bg-gray-50 text-gray-700">
              <th className="p-3 text-left" onClick={() => handleSort('room.number')}>Комната {sortState.field === 'room.number' && (sortState.order === 'asc' ? '▲' : sortState.order === 'desc' ? '▼' : '')}</th>
              <th className="p-3 text-left" onClick={() => handleSort('room.building')}>Корпус {sortState.field === 'room.building' && (sortState.order === 'asc' ? '▲' : sortState.order === 'desc' ? '▼' : '')}</th>
              <th className="p-3 text-left" onClick={() => handleSort('room.room_class')}>Класс {sortState.field === 'room.room_class' && (sortState.order === 'asc' ? '▲' : sortState.order === 'desc' ? '▼' : '')}</th>
              <th className="p-3 text-left" onClick={() => handleSort('room.capacity')}>Вместимость {sortState.field === 'room.capacity' && (sortState.order === 'asc' ? '▲' : sortState.order === 'desc' ? '▼' : '')}</th>
              <th className="p-3 text-left" onClick={() => handleSort('room.status')}>Статус {sortState.field === 'room.status' && (sortState.order === 'asc' ? '▲' : sortState.order === 'desc' ? '▼' : '')}</th>
              <th className="p-3 text-left" onClick={() => handleSort('guest.full_name')}>Гость {sortState.field === 'guest.full_name' && (sortState.order === 'asc' ? '▲' : sortState.order === 'desc' ? '▼' : '')}</th>
              <th className="p-3 text-left" onClick={() => handleSort('guest.phone')}>Телефон {sortState.field === 'guest.phone' && (sortState.order === 'asc' ? '▲' : sortState.order === 'desc' ? '▼' : '')}</th>
              <th className="p-3 text-left" onClick={() => handleSort('date_from')}>Дата заезда {sortState.field === 'date_from' && (sortState.order === 'asc' ? '▲' : sortState.order === 'desc' ? '▼' : '')}</th>
              <th className="p-3 text-left" onClick={() => handleSort('date_to')}>Дата выезда {sortState.field === 'date_to' && (sortState.order === 'asc' ? '▲' : sortState.order === 'desc' ? '▼' : '')}</th>
              <th className="p-3 text-left" onClick={() => handleSort('people_count')}>Кол-во гостей {sortState.field === 'people_count' && (sortState.order === 'asc' ? '▲' : sortState.order === 'desc' ? '▼' : '')}</th>
              <th className="p-3 text-left">Действия</th>
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
                  <td className="p-3">№{b.room.number}</td>
                  <td className="p-3">{buildingName}</td>
                  <td className="p-3">{typeof b.room.room_class === 'object' && b.room.room_class !== null ? b.room.room_class.label : ROOM_CLASS_LABELS[b.room.room_class as string] || b.room.room_class || '-'}</td>
                  <td className="p-3">{b.room.capacity || '-'}</td>
                  <td className="p-3">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${room?.status === 'busy' ? 'bg-red-200 text-red-800' : room?.status === 'repair' ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'}`}>
                      {room?.status === 'busy' ? 'Занят' : room?.status === 'repair' ? 'Ремонт' : 'Свободен'}
                    </span>
                  </td>
                  <td className="p-3">{b.guest.full_name}</td>
                  <td className="p-3 text-sm">{b.guest.phone || '-'}</td>
                  <td className="p-3">{formatDate(b.date_from || b.check_in)}</td>
                  <td className="p-3">{formatDate(b.date_to || b.check_out)}</td>
                  <td className="p-3">{b.people_count || '-'}</td>
                  <td className="p-3">
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
    </div>
  );
}
