'use client';

import { useEffect, useState } from 'react';
// @ts-ignore
import { saveAs } from 'file-saver';
import { useTranslation } from 'react-i18next';
import { FaBed, FaCrown, FaStar, FaEdit, FaTrash, FaFileCsv, FaCheckCircle, FaTimesCircle, FaPlus } from 'react-icons/fa';
import { API_URL } from '../../shared/api';

type Room = {
  id: number;
  number: string;
  room_class: string;
  capacity: number;
  floor: number;
  description: string;
};

type Booking = {
  room: Room;
  date_from: string;
  date_to: string;
};

function getStatusColor(bookings: Booking[], roomId: number) {
  const today = new Date().toISOString().slice(0, 10);
  return bookings.some(
    b => b.room.id === roomId && b.date_from <= today && b.date_to >= today
  )
    ? 'bg-red-200 text-red-800'
    : 'bg-green-200 text-green-800';
}

const ROOM_CLASSES = [
  { value: '', label: 'Все классы' },
  { value: 'standard', label: 'Стандарт' },
  { value: 'semi_lux', label: 'Полу-люкс' },
  { value: 'lux', label: 'Люкс' },
];

const ROOM_CLASS_ICONS: Record<string, React.ReactNode> = {
  standard: <FaBed className="text-gray-500 mr-1" />,
  semi_lux: <FaStar className="text-yellow-500 mr-1" />,
  lux: <FaCrown className="text-purple-600 mr-1" />,
};

const ROOM_CLASS_COLORS: Record<string, string> = {
  standard: 'bg-gray-100 text-gray-700',
  semi_lux: 'bg-yellow-100 text-yellow-800',
  lux: 'bg-purple-100 text-purple-800',
};

const ROOM_CLASS_LABELS: Record<string, string> = {
  standard: 'Стандарт',
  semi_lux: 'Полу-люкс',
  lux: 'Люкс',
};

export default function RoomsPage() {
  const { t } = useTranslation();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState('');
  const [roomClass, setRoomClass] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editRoom, setEditRoom] = useState<Room | null>(null);
  const [editNumber, setEditNumber] = useState('');
  const [editClass, setEditClass] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState([{ number: '', room_class: 'standard', description: '' }]);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('access');
    if (!token) {
      window.location.href = '/login';
      return;
    }
    setLoading(true);
    Promise.all([
      fetch(`${API_URL}/api/rooms/`, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json()),
      fetch(`${API_URL}/api/bookings/`, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json())
    ])
      .then(([roomsData, bookingsData]) => {
        setRooms(roomsData);
        setBookings(bookingsData);
        setLoading(false);
      })
      .catch(() => {
        setError('Ошибка загрузки данных');
        setLoading(false);
      });
  }, []);

  const filteredRooms = rooms.filter(room =>
    (roomClass ? room.room_class === roomClass : true) &&
    (search ? room.number.includes(search) : true)
  );

  const handleEdit = (room: Room) => {
    setEditRoom(room);
    setEditNumber(room.number);
    setEditClass(room.room_class);
    setEditDescription(room.description);
  };

  const handleEditSave = async () => {
    if (!editRoom) return;
    const token = localStorage.getItem('access');
    const res = await fetch(`${API_URL}/api/rooms/${editRoom.id}/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        number: editNumber,
        room_class: editClass,
        description: editDescription,
      }),
    });
    if (res.ok) {
      setEditRoom(null);
      window.location.reload();
    }
  };

  const handleDelete = async (roomId: number) => {
    if (!window.confirm('Удалить номер?')) return;
    const token = localStorage.getItem('access');
    await fetch(`${API_URL}/api/rooms/${roomId}/`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    window.location.reload();
  };

  const exportToCSV = () => {
    const header = 'Номер,Класс,Описание,Статус';
    const rows = filteredRooms.map(room => {
      const status = getStatusColor(bookings, room.id).includes('red') ? 'Занят' : 'Свободен';
      return `${room.number},${ROOM_CLASS_LABELS[room.room_class] || '—'},${room.description},${status}`;
    });
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'rooms.csv');
  };

  const handleAddChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setAddForm(prevForm => prevForm.map((form, i) =>
      i === index ? { ...form, [e.target.name]: e.target.value } : form
    ));
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError('');
    setAddSuccess(false);
    try {
      const token = localStorage.getItem('access');
      const res = await fetch(`${API_URL}/api/rooms/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rooms: addForm,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setAddError(data.detail || JSON.stringify(data) || 'Ошибка при добавлении гостя. Проверьте корректность данных.');
      } else {
        setAddSuccess(true);
        setShowAddModal(false);
        setAddForm([{ number: '', room_class: 'standard', description: '' }]);
        // Обновить список номеров
        const roomsRes = await fetch(`${API_URL}/api/rooms/`, { headers: { Authorization: `Bearer ${token}` } });
        setRooms(await roomsRes.json());
      }
    } catch {
      setAddError('Ошибка сети');
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">{t('Номера комнат')}</h1>
        <div className="flex gap-2 items-center bg-white rounded-lg shadow px-4 py-2">
          <select
            value={roomClass}
            onChange={e => setRoomClass(e.target.value)}
            className="input w-40"
          >
            {ROOM_CLASSES.map(opt => (
              <option key={opt.value} value={opt.value}>{t(opt.label)}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder={t('search') + ' ' + t('room')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input w-48"
          />
          <button onClick={exportToCSV} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow transition-all duration-200">
            <FaFileCsv /> {t('export_csv')}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow transition-all duration-200 ml-2"
          >
            <FaPlus /> {t('Добавить номер')}
          </button>
        </div>
      </div>
      {/* Модальное окно добавления номера */}
      {showAddModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#1a1a1a]/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-0 w-full max-w-xl relative animate-modal-in border border-gray-100">
            <div className={`flex flex-col items-center pt-8 pb-2 px-8 ${addForm.length > 4 ? 'overflow-y-auto max-h-[80vh]' : ''}`}>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><FaBed className="text-blue-600" />Добавить номер</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none"
                aria-label="Закрыть"
              >×</button>
              <form onSubmit={handleAddSubmit} className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                {addForm.map((form, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-2 md:col-span-2 relative border-b pb-2 mb-2">
                    <div className="flex flex-col">
                      <label className="font-semibold">Номер комнаты</label>
                      <input name="number" value={form.number} onChange={e => handleAddChange(index, e)} required className="input" />
                    </div>
                    <div className="flex flex-col">
                      <label className="font-semibold">Класс</label>
                      <select name="room_class" value={form.room_class} onChange={e => handleAddChange(index, e)} className="input">
                        {ROOM_CLASSES.filter(r => r.value).map(r => (
                          <option key={r.value} value={r.value}>{t(r.label)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col">
                      <label className="font-semibold">Описание</label>
                      <textarea name="description" value={form.description} onChange={e => handleAddChange(index, e)} className="input" rows={2} />
                    </div>
                    {addForm.length > 1 && (
                      <button type="button" onClick={() => setAddForm(f => f.filter((_, i) => i !== index))} className="absolute right-0 top-0 text-red-500 hover:text-red-700 text-lg">×</button>
                    )}
                  </div>
                ))}
                <div className="md:col-span-2 flex justify-end">
                  <button type="button" disabled={addForm.length >= 10} onClick={() => setAddForm(f => [...f, { number: '', room_class: 'standard', description: '' }])} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded mb-2 disabled:opacity-50">Добавить ещё номер</button>
                </div>
                <div className="md:col-span-2 flex justify-end mt-4">
                  <button
                    type="submit"
                    disabled={addLoading}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded shadow transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <FaBed /> {addLoading ? t('Добавление...') : t('Добавить')}
                  </button>
                </div>
                {addError && <div className="text-red-500 md:col-span-2">{addError}</div>}
                {addSuccess && <div className="text-green-600 md:col-span-2">Номера успешно добавлены!</div>}
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Табличный список номеров */}
      {loading ? (
        <div className="text-center text-gray-500">Загрузка...</div>
      ) : error ? (
        <div className="text-red-500 mb-4">{error}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl shadow bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Номер комнаты</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Класс</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Описание</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Статус</th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Действия</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredRooms.map(room => {
                const classColor = ROOM_CLASS_COLORS[room.room_class] || 'bg-gray-100 text-gray-700';
                const classIcon = ROOM_CLASS_ICONS[room.room_class] || <FaBed className="text-gray-400 mr-1" />;
                const isBusy = getStatusColor(bookings, room.id).includes('red');
                return (
                  <tr key={room.id} className="hover:bg-blue-50 transition-all">
                    <td className="px-6 py-4 font-bold text-lg">{room.number}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-sm font-semibold ${classColor}`}>{classIcon}{ROOM_CLASS_LABELS[room.room_class] || '—'}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 min-w-[120px]">{room.description}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${isBusy ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{isBusy ? <FaTimesCircle /> : <FaCheckCircle />}{isBusy ? 'Занят' : 'Свободен'}</span>
                    </td>
                    <td className="px-6 py-4 flex gap-2 justify-center">
                      <button onClick={() => handleEdit(room)} className="flex items-center gap-1 bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded shadow transition-all"><FaEdit />Редактировать</button>
                      <button onClick={() => handleDelete(room.id)} className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded shadow transition-all"><FaTrash />Удалить</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}