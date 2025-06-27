'use client';

import { useEffect, useState } from 'react';
// @ts-ignore
import { saveAs } from 'file-saver';
import { useTranslation } from 'react-i18next';
import { FaBed, FaCrown, FaStar, FaEdit, FaTrash, FaFileCsv, FaCheckCircle, FaTimesCircle, FaPlus, FaUserFriends, FaUserTie, FaHome } from 'react-icons/fa';
import { API_URL } from '../../shared/api';
import { useSearchParams } from 'next/navigation';
import ConfirmModal from '../../components/ConfirmModal';

type Room = {
  id: number;
  number: string;
  room_class: string;
  description: string;
  building: number;
  capacity: number;
  status: string;
  room_type: string;
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
  { value: 'lux', label: 'Люкс' },
  { value: 'semi_lux', label: 'Полу-люкс' },
  { value: 'vip', label: 'ВИП' },
  { value: 'proraba', label: 'Дом прораба' },
  { value: 'aurora', label: 'Аврора' },
  { value: 'domik', label: 'Домик' },
  { value: 'three_floor_lux', label: '3-х этажка люкс' },
  { value: 'middle_vip_lux', label: 'Средний ВИП люкс' },
  { value: 'pink', label: 'Розовый' },
  { value: 'sklad', label: 'Склад' },
  { value: 'other', label: 'Другое' },
];

const ROOM_CLASS_ICONS: Record<string, React.ReactNode> = {
  standard: <FaBed className="text-gray-500 mr-1" />,
  semi_lux: <FaStar className="text-yellow-500 mr-1" />,
  lux: <FaCrown className="text-purple-600 mr-1" />,
  vip: <FaCrown className="text-yellow-500 mr-1" />,
  proraba: <FaUserTie className="text-blue-700 mr-1" />,
  aurora: <FaStar className="text-blue-400 mr-1" />,
  domik: <FaHome className="text-green-700 mr-1" />,
};

const ROOM_CLASS_COLORS: Record<string, string> = {
  standard: 'bg-gray-100 text-gray-700',
  semi_lux: 'bg-yellow-100 text-yellow-800',
  lux: 'bg-purple-100 text-purple-800',
};

const ROOM_CLASS_LABELS: Record<string, string> = {
  standard: 'Стандарт',
  lux: 'Люкс',
  semi_lux: 'Полу-люкс',
  vip: 'ВИП',
  proraba: 'Дом прораба',
  aurora: 'Аврора',
  domik: 'Домик',
  three_floor_lux: '3-х этажка люкс',
  middle_vip_lux: 'Средний ВИП люкс',
  pink: 'Розовый',
  sklad: 'Склад',
  other: 'Другое',
};

const ROOM_STATUSES = [
  { value: 'free', label: 'Свободен' },
  { value: 'busy', label: 'Занят' },
  { value: 'repair', label: 'На ремонте' },
];

export default function RoomsPage() {
  const { t } = useTranslation();
  const [rooms, setRooms] = useState<any[]>([]);
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
  const [addForm, setAddForm] = useState([{ number: '', room_class: 'standard', description: '', building: '', capacity: '', status: 'free', room_type: '' }]);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState(false);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [showAddBuildingModal, setShowAddBuildingModal] = useState(false);
  const [newBuildingName, setNewBuildingName] = useState('');
  const [newBuildingAddress, setNewBuildingAddress] = useState('');
  const [addBuildingError, setAddBuildingError] = useState('');
  const [addBuildingSuccess, setAddBuildingSuccess] = useState(false);
  const [editBuilding, setEditBuilding] = useState('');
  const [editCapacity, setEditCapacity] = useState('');
  const [editStatus, setEditStatus] = useState('free');
  const [editType, setEditType] = useState('');
  const [sortState, setSortState] = useState<{ field: string | null; order: 'asc' | 'desc' | null }>({ field: null, order: null });
  const searchParams = useSearchParams();
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [selectedDeleteId, setSelectedDeleteId] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('access');
    if (!token) {
      window.location.href = '/login';
      return;
    }
    setLoading(true);
    Promise.all([
      fetch(`${API_URL}/api/rooms/`, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json()),
      fetch(`${API_URL}/api/bookings/`, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json()),
      fetch(`${API_URL}/api/buildings/`, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json()),
    ])
      .then(([roomsData, bookingsData, buildingsData]) => {
        setRooms(roomsData);
        setBookings(bookingsData);
        setBuildings(buildingsData);
        setLoading(false);
      })
      .catch(() => {
        setError('Ошибка загрузки данных');
        setLoading(false);
      });
    // Открытие модалки по add=1
    if (searchParams.get('add') === '1') {
      setShowAddModal(true);
    } else {
      setShowAddModal(false);
    }
    // Фильтрация по номеру
    if (searchParams.get('number')) {
      setSearch(searchParams.get('number') || '');
    }
  }, [searchParams]);

  const roomsArray = Array.isArray(rooms) ? rooms : [];

  const filteredRooms = roomsArray.filter(room =>
    (roomClass ? (typeof room.room_class === 'object' ? room.room_class.value === roomClass : room.room_class === roomClass) : true) &&
    (search ? room.number.includes(search) : true)
  );

  const handleSort = (field: string) => {
    setSortState(prev => {
      if (prev.field !== field) return { field, order: 'asc' };
      if (prev.order === 'asc') return { field, order: 'desc' };
      if (prev.order === 'desc') return { field: null, order: null };
      return { field, order: 'asc' };
    });
  };

  const sortedRooms = [...filteredRooms];
  if (sortState.field && sortState.order) {
    sortedRooms.sort((a, b) => {
      let aValue = a[sortState.field!];
      let bValue = b[sortState.field!];
      if (typeof aValue === 'object' && aValue !== null) aValue = aValue.label || aValue.name || '';
      if (typeof bValue === 'object' && bValue !== null) bValue = bValue.label || bValue.name || '';
      if (aValue === undefined) aValue = '';
      if (bValue === undefined) bValue = '';
      if (aValue < bValue) return sortState.order === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortState.order === 'asc' ? 1 : -1;
      return 0;
    });
  }

  // Пагинация для таблицы номеров (после sortedRooms)
  const [roomPage, setRoomPage] = useState(1);
  const roomsPerPage = 10;
  const totalRoomPages = Math.ceil(sortedRooms.length / roomsPerPage);
  const paginatedRooms = sortedRooms.slice((roomPage - 1) * roomsPerPage, roomPage * roomsPerPage);

  const handleEdit = (room: Room) => {
    setEditRoom(room);
    setEditNumber(room.number);
    setEditClass(room.room_class);
    setEditDescription(room.description);
    setEditBuilding(room.building ? String(room.building) : '');
    setEditCapacity(room.capacity ? String(room.capacity) : '');
    setEditStatus(room.status || 'free');
    setEditType(room.room_type || '');
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
        building: editBuilding,
        capacity: editCapacity,
        status: editStatus,
        room_type: editType,
      }),
    });
    if (res.ok) {
      setEditRoom(null);
      const roomsRes = await fetch(`${API_URL}/api/rooms/`, { headers: { Authorization: `Bearer ${token}` } });
      setRooms(await roomsRes.json());
    }
  };

  const handleDelete = async (roomId: number) => {
    setSelectedDeleteId(roomId);
    setShowConfirmDelete(true);
  };

  const confirmDelete = async () => {
    if (!selectedDeleteId) return;
    const token = localStorage.getItem('access');
    await fetch(`${API_URL}/api/rooms/${selectedDeleteId}/`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setShowConfirmDelete(false);
    setSelectedDeleteId(null);
    window.location.reload();
  };

  const exportToCSV = () => {
    const header = 'Номер,Класс,Описание,Статус';
    const rows = filteredRooms.map(room => {
      const status = getStatusColor(bookings, room.id).includes('red') ? 'Занят' : 'Свободен';
      return `${room.number},${typeof room.room_class === 'object' ? room.room_class.label : ROOM_CLASS_LABELS[room.room_class] || room.room_class || '-'},${room.description},${status}`;
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
      // Преобразуем addForm: заменяем building -> building_id
      const roomsPayload = addForm.map(({ building, ...rest }) => ({ ...rest, building_id: building }));
      const res = await fetch(`${API_URL}/api/rooms/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rooms: roomsPayload,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setAddError(data.detail || JSON.stringify(data) || 'Ошибка при добавлении гостя. Проверьте корректность данных.');
      } else {
        setAddSuccess(true);
        setShowAddModal(false);
        setAddForm([{ number: '', room_class: 'standard', description: '', building: '', capacity: '', status: 'free', room_type: '' }]);
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

  const getRoomStatus = (room: any, bookings: any[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isRepair = room.status === 'repair';
    if (isRepair) return { label: 'На ремонте', color: 'bg-yellow-200 text-yellow-800' };
    const hasActive = bookings.some((b: any) => {
      if (b.room.id !== room.id) return false;
      const from = new Date(b.date_from || b.check_in);
      const to = new Date(b.date_to || b.check_out);
      from.setHours(0, 0, 0, 0);
      to.setHours(0, 0, 0, 0);
      return from <= today && to >= today;
    });
    if (hasActive) return { label: 'Занят', color: 'bg-red-200 text-red-800' };
    return { label: 'Свободен', color: 'bg-green-200 text-green-800' };
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
            <FaFileCsv /> {t('Экспорт в CSV')}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow transition-all duration-200 ml-2"
          >
            <FaPlus /> {t('Добавить номер')}
          </button>
          <button
            onClick={() => setShowAddBuildingModal(true)}
            className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded shadow transition-all duration-200 ml-2"
          >
            <FaPlus /> Добавить корпус
          </button>
        </div>
      </div>
      {/* Модальное окно добавления номера */}
      {showAddModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#1a1a1a]/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-0 w-full max-w-2xl relative animate-modal-in border border-gray-100 max-h-[80vh] flex flex-col">
            <div className="flex flex-col items-center pt-8 pb-2 px-8 w-full overflow-y-auto" style={{maxHeight: '70vh'}}>
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
                      <label className="font-semibold">Корпус</label>
                      <select name="building" value={form.building} onChange={e => handleAddChange(index, e)} className="input" required>
                        <option value="">Выберите корпус</option>
                        {buildings.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col">
                      <label className="font-semibold">Номер комнаты</label>
                      <input name="number" value={form.number} onChange={e => handleAddChange(index, e)} required className="input" placeholder="101" />
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
                      <label className="font-semibold">Тип</label>
                      <input name="room_type" value={form.room_type} onChange={e => handleAddChange(index, e)} className="input" placeholder="Одноместный, Двухместный..." />
                    </div>
                    <div className="flex flex-col">
                      <label className="font-semibold">Вместимость</label>
                      <input name="capacity" type="number" min={1} value={form.capacity} onChange={e => handleAddChange(index, e)} required className="input" placeholder="2" />
                    </div>
                    <div className="flex flex-col">
                      <label className="font-semibold">Статус</label>
                      <select name="status" value={form.status} onChange={e => handleAddChange(index, e)} className="input">
                        <option value="free">Свободен</option>
                        <option value="repair">На ремонте</option>
                      </select>
                    </div>
                    <div className="flex flex-col md:col-span-3">
                      <label className="font-semibold">Описание</label>
                      <textarea name="description" value={form.description} onChange={e => handleAddChange(index, e)} className="input" rows={2} placeholder="Описание комнаты..." />
                    </div>
                    {addForm.length > 1 && (
                      <button type="button" onClick={() => setAddForm(f => f.filter((_, i) => i !== index))} className="absolute right-0 top-0 text-red-500 hover:text-red-700 text-lg">×</button>
                    )}
                  </div>
                ))}
                <div className="md:col-span-2 flex justify-end">
                  <button type="button" disabled={addForm.length >= 10} onClick={() => setAddForm(f => [...f, { number: '', room_class: 'standard', description: '', building: '', capacity: '', status: 'free', room_type: '' }])} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded mb-2 disabled:opacity-50">Добавить ещё номер</button>
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
      {/* Модальное окно редактирования номера */}
      {editRoom && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#1a1a1a]/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg relative">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><FaEdit className="text-yellow-500" />Редактировать номер</h2>
            <button
              onClick={() => setEditRoom(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none"
              aria-label="Закрыть"
            >×</button>
            <form onSubmit={e => { e.preventDefault(); handleEditSave(); }} className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-sm">Номер</label>
                <input value={editNumber} onChange={e => setEditNumber(e.target.value)} className="input" required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-sm">Класс</label>
                <select value={editClass} onChange={e => setEditClass(e.target.value)} className="input">
                  {ROOM_CLASSES.filter(opt => opt.value).map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-sm">Корпус</label>
                <select value={editBuilding} onChange={e => setEditBuilding(e.target.value)} className="input">
                  <option value="">Выберите корпус</option>
                  {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-sm">Вместимость</label>
                <input type="number" min="1" value={editCapacity} onChange={e => setEditCapacity(e.target.value)} className="input" required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-sm">Тип</label>
                <input value={editType} onChange={e => setEditType(e.target.value)} className="input" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-sm">Статус</label>
                <select value={editStatus} onChange={e => setEditStatus(e.target.value)} className="input">
                  <option value="free">Свободен</option>
                  <option value="repair">На ремонте</option>
                </select>
              </div>
              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="font-semibold text-sm">Описание</label>
                <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} className="input" rows={2} />
              </div>
              <div className="md:col-span-2 flex justify-end mt-4">
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded shadow">Сохранить</button>
                <button type="button" onClick={() => setEditRoom(null)} className="ml-2 bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded shadow">Отмена</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showAddBuildingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a1a1a]/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative animate-modal-in border border-gray-100">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><FaPlus className="text-green-700" />Добавить корпус</h2>
            <button
              onClick={() => setShowAddBuildingModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none"
              aria-label="Закрыть"
            >×</button>
            <form onSubmit={async e => {
              e.preventDefault();
              setAddBuildingError('');
              setAddBuildingSuccess(false);
              if (!newBuildingName || !newBuildingAddress) {
                setAddBuildingError('Заполните все поля');
                return;
              }
              try {
                const token = localStorage.getItem('access');
                const res = await fetch(`${API_URL}/api/buildings/`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({ name: newBuildingName, address: newBuildingAddress }),
                });
                if (!res.ok) {
                  setAddBuildingError('Ошибка при добавлении корпуса');
                } else {
                  setAddBuildingSuccess(true);
                  setShowAddBuildingModal(false);
                  setNewBuildingName('');
                  setNewBuildingAddress('');
                  // Обновить список корпусов
                  const buildingsRes = await fetch(`${API_URL}/api/buildings/`, { headers: { Authorization: `Bearer ${token}` } });
                  setBuildings(await buildingsRes.json());
                }
              } catch {
                setAddBuildingError('Ошибка сети');
              }
            }}>
              <div className="mb-4">
                <label className="font-semibold">Название корпуса</label>
                <input value={newBuildingName} onChange={e => setNewBuildingName(e.target.value)} className="input w-full" required />
              </div>
              <div className="mb-4">
                <label className="font-semibold">Адрес</label>
                <input value={newBuildingAddress} onChange={e => setNewBuildingAddress(e.target.value)} className="input w-full" required />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddBuildingModal(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded">Отмена</button>
                <button type="submit" className="bg-green-700 hover:bg-green-800 text-white px-6 py-2 rounded shadow">Сохранить</button>
              </div>
              {addBuildingError && <div className="text-red-500 mt-2">{addBuildingError}</div>}
              {addBuildingSuccess && <div className="text-green-600 mt-2">Корпус успешно добавлен!</div>}
            </form>
          </div>
        </div>
      )}
      {/* Табличный список номеров */}
      {loading ? (
        <div className="text-center text-gray-500">Загрузка...</div>
      ) : error ? (
        <div className="text-red-500 mb-4">{error}</div>
      ) : (
        <div className="overflow-x-auto rounded-lg shadow max-w-full">
          <table className="min-w-[900px] w-full bg-white rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-24 cursor-pointer" onClick={() => handleSort('number')}>
                  Номер комнаты {sortState.field === 'number' && (sortState.order === 'asc' ? '▲' : sortState.order === 'desc' ? '▼' : '')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-40 cursor-pointer" onClick={() => handleSort('building')}>
                  Корпус {sortState.field === 'building' && (sortState.order === 'asc' ? '▲' : sortState.order === 'desc' ? '▼' : '')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-32 cursor-pointer" onClick={() => handleSort('room_class')}>
                  Класс {sortState.field === 'room_class' && (sortState.order === 'asc' ? '▲' : sortState.order === 'desc' ? '▼' : '')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-32 cursor-pointer" onClick={() => handleSort('room_type')}>
                  Тип {sortState.field === 'room_type' && (sortState.order === 'asc' ? '▲' : sortState.order === 'desc' ? '▼' : '')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-32 cursor-pointer" onClick={() => handleSort('capacity')}>
                  Вместимость {sortState.field === 'capacity' && (sortState.order === 'asc' ? '▲' : sortState.order === 'desc' ? '▼' : '')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-32 cursor-pointer" onClick={() => handleSort('status')}>
                  Статус {sortState.field === 'status' && (sortState.order === 'asc' ? '▲' : sortState.order === 'desc' ? '▼' : '')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-56 cursor-pointer" onClick={() => handleSort('description')}>
                  Описание {sortState.field === 'description' && (sortState.order === 'asc' ? '▲' : sortState.order === 'desc' ? '▼' : '')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-40">Действия</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedRooms.map(room => {
                const status = getRoomStatus(room, bookings);
                return (
                  <tr key={room.id}>
                    <td className="px-4 py-4 whitespace-nowrap font-bold">{room.number}</td>
                    <td className="px-4 py-4 whitespace-nowrap">{room.building?.name || '-'}</td>
                    <td className="px-4 py-4 whitespace-nowrap">{typeof room.room_class === 'object' ? room.room_class.label : ROOM_CLASS_LABELS[room.room_class] || room.room_class || '-'}</td>
                    <td className="px-4 py-4 whitespace-nowrap">{room.room_type || '-'}</td>
                    <td className="px-4 py-4 whitespace-nowrap">{room.capacity || '-'}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${status.color}`}>{status.label}</span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-500 max-w-[220px] truncate" title={room.description || ''}>{room.description || '-'}</td>
                    <td className="px-4 py-4 whitespace-nowrap flex gap-2">
                      <button onClick={() => handleEdit(room)} className="text-yellow-600 hover:text-yellow-800" title="Редактировать"><FaEdit /></button>
                      <button onClick={() => handleDelete(room.id)} className="text-red-600 hover:text-red-800" title="Удалить"><FaTrash /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {/* Пагинация */}
          {totalRoomPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-4">
              <button
                className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50"
                onClick={() => setRoomPage(p => Math.max(1, p - 1))}
                disabled={roomPage === 1}
              >
                Назад
              </button>
              <span className="text-sm text-gray-500">Страница {roomPage} из {totalRoomPages}</span>
              <button
                className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50"
                onClick={() => setRoomPage(p => Math.min(totalRoomPages, p + 1))}
                disabled={roomPage === totalRoomPages}
              >
                Вперёд
              </button>
            </div>
          )}
        </div>
      )}
      <ConfirmModal
        open={showConfirmDelete}
        title="Удалить номер?"
        description="Вы действительно хотите удалить этот номер? Это действие необратимо."
        confirmText="Удалить"
        cancelText="Отмена"
        onConfirm={confirmDelete}
        onCancel={() => { setShowConfirmDelete(false); setSelectedDeleteId(null); }}
      />
    </div>
  );
}