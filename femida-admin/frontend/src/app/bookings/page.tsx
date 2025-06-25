'use client';

import { useEffect, useState } from 'react';
// @ts-ignore
import { saveAs } from 'file-saver';
import { useTranslation } from 'react-i18next';
import { FaCalendarCheck, FaTrash, FaFileCsv, FaPlus } from 'react-icons/fa';

type Room = {
  id: number;
  number: string;
  room_class: string;
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
};

const ROOM_CLASS_LABELS: Record<string, string> = {
  standard: 'Стандарт',
  semi_lux: 'Полу-люкс',
  lux: 'Люкс',
};

export default function BookingsPage() {
  const { t } = useTranslation();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
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

  const token = typeof window !== 'undefined' ? localStorage.getItem('access') : '';

  useEffect(() => {
    if (!token) {
      window.location.href = '/login';
      return;
    }
    setLoading(true);
    Promise.all([
      fetch('http://127.0.0.1:8000/api/bookings/', { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json()),
      fetch('http://127.0.0.1:8000/api/rooms/', { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json()),
      fetch('http://127.0.0.1:8000/api/guests/', { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json())
    ])
      .then(([bookingsData, roomsData, guestsData]) => {
        setBookings(bookingsData);
        setRooms(roomsData);
        setGuests(guestsData);
        setLoading(false);
      })
      .catch(() => {
        setError('Ошибка загрузки данных');
        setLoading(false);
      });
  }, [token, success]);

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
      const res = await fetch('http://127.0.0.1:8000/api/bookings/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          room_id: Number(addForm.room),
          guest_id: Number(addForm.guest),
          date_from: addForm.date_from,
          date_to: addForm.date_to,
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
        const bookingsRes = await fetch('http://127.0.0.1:8000/api/bookings/', { headers: { Authorization: `Bearer ${token}` } });
        setBookings(await bookingsRes.json());
      }
    } catch {
      setAddError('Ошибка сети');
    } finally {
      setAddLoading(false);
    }
  };

  const handleDelete = async (bookingId: number) => {
    if (!window.confirm('Удалить бронирование?')) return;
    const token = localStorage.getItem('access');
    await fetch(`http://127.0.0.1:8000/api/bookings/${bookingId}/`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setSuccess('Бронирование удалено');
    setBookings(bookings.filter(b => b.id !== bookingId));
  };

  const filteredBookings = bookings.filter(b =>
    (filterDate ? b.date_from === filterDate : true) &&
    (searchGuest ? b.guest.full_name.toLowerCase().includes(searchGuest.toLowerCase()) : true)
  );

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
          />
          <input
            type="text"
            placeholder="Поиск по гостю"
            value={searchGuest}
            onChange={e => setSearchGuest(e.target.value)}
            className="input w-48"
          />
          <button onClick={exportToCSV} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow transition-all duration-200">
            <FaFileCsv /> Экспорт
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow transition-all duration-200 ml-2"
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
                  <label className="font-semibold text-sm">Комната</label>
                  <select name="room" value={addForm.room} onChange={handleAddChange} className="input" required>
                    <option value="">Выберите комнату</option>
                    {rooms.map(room => (
                      <option key={room.id} value={room.id}>Номер комнаты: {room.number} — Класс: {ROOM_CLASS_LABELS[room.room_class] || room.room_class}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-sm">Гость</label>
                  <select name="guest" value={addForm.guest} onChange={handleAddChange} className="input" required>
                    <option value="">Выберите гостя</option>
                    {guests.map(guest => (
                      <option key={guest.id} value={guest.id}>{guest.full_name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-sm">Дата заезда</label>
                  <input name="date_from" type="date" value={addForm.date_from} onChange={handleAddChange} className="input" required />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-sm">Дата выезда</label>
                  <input name="date_to" type="date" value={addForm.date_to} onChange={handleAddChange} className="input" required />
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
        <table className="min-w-full bg-white rounded-lg">
          <thead>
            <tr className="bg-gray-50 text-gray-700">
              <th className="p-3 text-left">Комната</th>
              <th className="p-3 text-left">Гость</th>
              <th className="p-3 text-left">Дата заезда</th>
              <th className="p-3 text-left">Дата выезда</th>
              <th className="p-3 text-left">Статус</th>
              <th className="p-3 text-left">Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredBookings.map(b => {
              const now = new Date().toISOString().slice(0, 10);
              const isActive = b.date_from <= now && b.date_to >= now;
              return (
                <tr key={b.id} className="hover:bg-blue-50 transition-all">
                  <td className="p-3 font-semibold">
                    Номер комнаты: {b.room.number} — Класс: {ROOM_CLASS_LABELS[b.room.room_class] || b.room.room_class}
                  </td>
                  <td className="p-3">{b.guest.full_name}</td>
                  <td className="p-3">{b.date_from}</td>
                  <td className="p-3">{b.date_to}</td>
                  <td className="p-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{isActive ? 'Активно' : 'Будущее/Завершено'}</span>
                  </td>
                  <td className="p-3">
                    <button onClick={() => handleDelete(b.id)} className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded shadow transition-all"><FaTrash />Удалить</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {getOccupancyReport() && (
        <div className="mt-4 text-sm text-gray-600 bg-blue-50 rounded-lg px-4 py-2 shadow-inner">
          {getOccupancyReport()}
        </div>
      )}
    </div>
  );
}
