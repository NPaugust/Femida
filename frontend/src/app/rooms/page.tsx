'use client';

import { useEffect, useState } from 'react';
// @ts-ignore
import { saveAs } from 'file-saver';
import { useTranslation } from 'react-i18next';
import { FaBed, FaCrown, FaStar, FaEdit, FaTrash, FaFileCsv, FaCheckCircle, FaTimesCircle, FaPlus, FaUserFriends, FaUserTie, FaHome, FaCalendarAlt } from 'react-icons/fa';
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
  is_active: boolean;
  price_per_night: number;
  rooms_count: number;
  amenities: string;
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
  semi_lux: 'Полу-люкс',
  lux: 'Люкс',

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
  const [addForm, setAddForm] = useState([
    {
      number: '',
      room_class: 'standard',
      description: '',
      building: '',
      capacity: '',
      status: 'free',
      room_type: '',
      is_active: true,
      price_per_night: '',
      rooms_count: '',
      amenities: '',
    }
  ]);
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
  const [showConfirmDeleteBuilding, setShowConfirmDeleteBuilding] = useState(false);
  const [selectedDeleteBuildingId, setSelectedDeleteBuildingId] = useState<number | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [filterActive, setFilterActive] = useState('');
  const [filterPriceFrom, setFilterPriceFrom] = useState('');
  const [filterPriceTo, setFilterPriceTo] = useState('');
  const [filterCapacityFrom, setFilterCapacityFrom] = useState('');
  const [filterCapacityTo, setFilterCapacityTo] = useState('');
  const [filterRoomsFrom, setFilterRoomsFrom] = useState('');
  const [filterRoomsTo, setFilterRoomsTo] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editPricePerNight, setEditPricePerNight] = useState('');
  const [editRoomsCount, setEditRoomsCount] = useState('');
  const [editAmenities, setEditAmenities] = useState('');
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [selectedRoomForCalendar, setSelectedRoomForCalendar] = useState<Room | null>(null);
  const [roomBookings, setRoomBookings] = useState<Booking[]>([]);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipRoom, setTooltipRoom] = useState<Room | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setToken(localStorage.getItem('access'));
    }
  }, []);

  useEffect(() => {
    if (!token) return;
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
  }, [searchParams, token]);

  const roomsArray = Array.isArray(rooms) ? rooms : [];

  const filteredRooms = roomsArray.filter(room =>
    (roomClass ? (typeof room.room_class === 'object' ? room.room_class.value === roomClass : room.room_class === roomClass) : true) &&
    (search ? room.number.includes(search) : true) &&
    (filterActive === '' ? true : (filterActive === 'active' ? room.is_active : !room.is_active)) &&
    (filterPriceFrom ? Number(room.price_per_night) >= Number(filterPriceFrom) : true) &&
    (filterPriceTo ? Number(room.price_per_night) <= Number(filterPriceTo) : true) &&
    (filterCapacityFrom ? Number(room.capacity) >= Number(filterCapacityFrom) : true) &&
    (filterCapacityTo ? Number(room.capacity) <= Number(filterCapacityTo) : true) &&
    (filterRoomsFrom ? Number(room.rooms_count) >= Number(filterRoomsFrom) : true) &&
    (filterRoomsTo ? Number(room.rooms_count) <= Number(filterRoomsTo) : true)
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
    setEditIsActive(room.is_active ?? true);
    setEditPricePerNight(room.price_per_night ? String(room.price_per_night) : '');
    setEditRoomsCount(room.rooms_count ? String(room.rooms_count) : '');
    setEditAmenities(room.amenities || '');
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
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
        is_active: editIsActive,
        price_per_night: editPricePerNight,
        rooms_count: editRoomsCount,
        amenities: editAmenities,
      }),
    });
    if (res.ok) {
      setEditRoom(null);
      const roomsRes = await fetch(`${API_URL}/api/rooms/`, { headers: { Authorization: `Bearer ${token}` } });
      setRooms(await roomsRes.json());
      showToast('success', 'Номер успешно обновлён');
    } else {
      showToast('error', 'Ошибка при обновлении номера');
    }
  };

  const handleDelete = async (roomId: number) => {
    setSelectedDeleteId(roomId);
    setShowConfirmDelete(true);
  };

  const confirmDelete = async () => {
    if (!selectedDeleteId) return;
    const token = localStorage.getItem('access');
    const res = await fetch(`${API_URL}/api/rooms/${selectedDeleteId}/`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      showToast('success', 'Номер успешно удалён');
      setShowConfirmDelete(false);
      setSelectedDeleteId(null);
      window.location.reload();
    } else {
      showToast('error', 'Ошибка при удалении номера');
    }
  };

  const exportToCSV = () => {
    const header = 'Номер,Класс,Описание,Статус,Активен,Вместимость,Кол-во комнат,Стоимость (сом/сутки),Удобства,Тип';
    const rows = filteredRooms.map(room => {
      const status = getStatusColor(bookings, room.id).includes('red') ? 'Занят' : 'Свободен';
      return `${room.number},${typeof room.room_class === 'object' ? room.room_class.label : ROOM_CLASS_LABELS[room.room_class] || room.room_class || '-'},${room.description || ''},${status},${room.is_active ? 'Да' : 'Нет'},${room.capacity},${room.rooms_count || ''},${room.price_per_night || ''},"${room.amenities || ''}",${room.room_type || ''}`;
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
        const errorMessage = data.detail || JSON.stringify(data) || 'Ошибка при добавлении номера. Проверьте корректность данных.';
        setAddError(errorMessage);
        showToast('error', errorMessage);
      } else {
        setAddSuccess(true);
        showToast('success', 'Номера успешно добавлены!');
        setShowAddModal(false);
        setAddForm([
          {
            number: '',
            room_class: 'standard',
            description: '',
            building: '',
            capacity: '',
            status: 'free',
            room_type: '',
            is_active: true,
            price_per_night: '',
            rooms_count: '',
            amenities: '',
          }
        ]);
        // Обновить список номеров
        const roomsRes = await fetch(`${API_URL}/api/rooms/`, { headers: { Authorization: `Bearer ${token}` } });
        setRooms(await roomsRes.json());
      }
    } catch {
      const errorMessage = 'Ошибка сети';
      setAddError(errorMessage);
      showToast('error', errorMessage);
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

  const handleRoomClick = (room: Room) => {
    setSelectedRoomForCalendar(room);
    // Получаем бронирования для этого номера
    const roomBookings = bookings.filter(booking => booking.room.id === room.id);
    setRoomBookings(roomBookings);
    setShowCalendarModal(true);
  };

  const getCalendarDays = () => {
    const today = new Date();
    const days = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const isDateBooked = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return roomBookings.some(booking => {
      const from = new Date(booking.date_from);
      const to = new Date(booking.date_to);
      const checkDate = new Date(dateStr);
      return checkDate >= from && checkDate <= to;
    });
  };

  const getBookingForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return roomBookings.find(booking => {
      const from = new Date(booking.date_from);
      const to = new Date(booking.date_to);
      const checkDate = new Date(dateStr);
      return checkDate >= from && checkDate <= to;
    });
  };

  const handleRoomMouseEnter = (room: Room, event: React.MouseEvent) => {
    // Не показывать тултип, если наведен на кнопку действия
    const target = event.target as HTMLElement;
    if (target.closest('button[data-action="edit"],button[data-action="delete"]')) return;
    setTooltipRoom(room);
    setTooltipPosition({ x: event.clientX, y: event.clientY });
    setShowTooltip(true);
  };

  const handleRoomMouseLeave = () => {
    setShowTooltip(false);
    setTooltipRoom(null);
  };

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">{t('Номера комнат')}</h1>
        <div className="flex gap-2 flex-wrap items-center bg-white rounded-lg shadow px-4 py-2">
          <select
            value={roomClass}
            onChange={e => setRoomClass(e.target.value)}
            className="input w-40"
          >
            {ROOM_CLASSES.map(opt => (
              <option key={opt.value} value={opt.value}>{t(opt.label)}</option>
            ))}
          </select>
          <select value={filterActive} onChange={e => setFilterActive(e.target.value)} className="input w-32">
            <option value="">Все статусы</option>
            <option value="active">Активен</option>
            <option value="inactive">Не активен</option>
          </select>
          <input type="number" placeholder="Стоимость от" value={filterPriceFrom} onChange={e => setFilterPriceFrom(e.target.value)} className="input w-24" />
          <input type="number" placeholder="до" value={filterPriceTo} onChange={e => setFilterPriceTo(e.target.value)} className="input w-24" />
          <input type="number" placeholder="Вместимость от" value={filterCapacityFrom} onChange={e => setFilterCapacityFrom(e.target.value)} className="input w-24" />
          <input type="number" placeholder="до" value={filterCapacityTo} onChange={e => setFilterCapacityTo(e.target.value)} className="input w-24" />
          <input type="number" placeholder="Комнат от" value={filterRoomsFrom} onChange={e => setFilterRoomsFrom(e.target.value)} className="input w-24" />
          <input type="number" placeholder="до" value={filterRoomsTo} onChange={e => setFilterRoomsTo(e.target.value)} className="input w-24" />
          <input
            type="text"
            placeholder={t('Поиск по номеру')}
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
                    <div className="flex flex-col">
                      <label className="font-semibold">Активен</label>
                      <input type="checkbox" name="is_active" checked={form.is_active ?? true} onChange={e => handleAddChange(index, { target: { name: 'is_active', value: e.target.checked } } as any)} />
                    </div>
                    <div className="flex flex-col">
                      <label className="font-semibold">Стоимость (сом/сутки)</label>
                      <input type="number" name="price_per_night" value={form.price_per_night || ''} onChange={e => handleAddChange(index, e)} className="input" min="0" />
                    </div>
                    <div className="flex flex-col">
                      <label className="font-semibold">Кол-во комнат</label>
                      <input type="number" name="rooms_count" value={form.rooms_count || ''} onChange={e => handleAddChange(index, e)} className="input" min="1" />
                    </div>
                    <div className="flex flex-col md:col-span-3">
                      <label className="font-semibold">Удобства (через запятую)</label>
                      <input name="amenities" value={form.amenities || ''} onChange={e => handleAddChange(index, e)} className="input" placeholder="Wi-Fi, Кондиционер, Телевизор" />
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
                  <button type="button" disabled={addForm.length >= 10} onClick={() => setAddForm(f => [...f, { number: '', room_class: 'standard', description: '', building: '', capacity: '', status: 'free', room_type: '', is_active: true, price_per_night: '', rooms_count: '', amenities: '' }])} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded mb-2 disabled:opacity-50">Добавить ещё номер</button>
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
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-sm">Активен</label>
                <input type="checkbox" checked={editIsActive} onChange={e => setEditIsActive(e.target.checked)} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-sm">Стоимость (сом/сутки)</label>
                <input type="number" min="0" value={editPricePerNight} onChange={e => setEditPricePerNight(e.target.value)} className="input" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-sm">Кол-во комнат</label>
                <input type="number" min="1" value={editRoomsCount} onChange={e => setEditRoomsCount(e.target.value)} className="input" />
              </div>
              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="font-semibold text-sm">Удобства (через запятую)</label>
                <input value={editAmenities} onChange={e => setEditAmenities(e.target.value)} className="input" placeholder="Wi-Fi, Кондиционер, Телевизор" />
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
      {/* Модальное окно добавления корпуса */}
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
              <div className="mb-4">
                <label className="font-semibold">Список корпусов</label>
                <ul className="divide-y divide-gray-200">
                  {buildings.map(b => (
                    <li key={b.id} className="flex items-center justify-between py-1">
                      <span>{b.name}</span>
                      <button type="button" onClick={() => { setSelectedDeleteBuildingId(b.id); setShowConfirmDeleteBuilding(true); }} className="text-red-600 hover:text-red-800 ml-2" title="Удалить корпус"><FaTrash /></button>
                    </li>
                  ))}
                </ul>
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
          <table className="w-full bg-white rounded-lg">
            <thead className="bg-gray-50">
              <tr className="bg-gray-50 text-gray-700">
                <th className="p-2 text-left">Номер</th>
                <th className="p-2 text-left">Класс</th>
                <th className="p-2 text-left">Статус</th>
                <th className="p-2 text-left">Активен</th>
                <th className="p-2 text-left">Вместимость</th>
                <th className="p-2 text-left">Кол-во комнат</th>
                <th className="p-2 text-left">Стоимость</th>
                <th className="p-2 text-left">Удобства</th>
                <th className="p-2 text-left">Описание</th>
                <th className="p-2 text-left">Действия</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedRooms.map(room => {
                const status = getRoomStatus(room, bookings);
                return (
                <tr 
                  key={room.id} 
                  className="hover:bg-blue-50 transition-all cursor-pointer" 
                  onClick={() => handleRoomClick(room)}
                  onMouseEnter={(e) => handleRoomMouseEnter(room, e)}
                  onMouseLeave={handleRoomMouseLeave}
                >
                  <td className="p-2 font-semibold">{room.number}</td>
                  <td className="p-2">{ROOM_CLASS_LABELS[typeof room.room_class === 'object' ? room.room_class.label : room.room_class]}</td>
                  <td className="p-2">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${status.color}`}>{status.label}</span>
                  </td>
                  <td className="p-2">
                    {room.is_active ? <FaCheckCircle className="text-green-500" title="Активен" /> : <FaTimesCircle className="text-red-500" title="Не активен" />}
                  </td>
                  <td className="p-2">{room.capacity}</td>
                  <td className="p-2">{room.rooms_count}</td>
                  <td className="p-2">{room.price_per_night} сом</td>
                  <td className="p-2 truncate max-w-[120px]" title={room.amenities}>{room.amenities}</td>
                  <td className="p-2 truncate max-w-[120px]" title={room.description}>{room.description}</td>
                  <td className="p-2 flex gap-2">
                    <button data-action="edit" onClick={e => { e.stopPropagation(); handleEdit(room); }} className="text-yellow-600 hover:text-yellow-800" title="Редактировать"><FaEdit /></button>
                    <button data-action="delete" onClick={e => { e.stopPropagation(); handleDelete(room.id); }} className="text-red-600 hover:text-red-800" title="Удалить"><FaTrash /></button>
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
      <ConfirmModal
        open={showConfirmDeleteBuilding}
        title="Удалить корпус?"
        description="Вы действительно хотите удалить этот корпус? Это действие необратимо."
        confirmText="Удалить"
        cancelText="Отмена"
        onConfirm={async () => {
          if (!selectedDeleteBuildingId) return;
          const token = localStorage.getItem('access');
          await fetch(`${API_URL}/api/buildings/${selectedDeleteBuildingId}/`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
          setShowConfirmDeleteBuilding(false);
          setSelectedDeleteBuildingId(null);
          // Обновить список корпусов
          const buildingsRes = await fetch(`${API_URL}/api/buildings/`, { headers: { Authorization: `Bearer ${token}` } });
          setBuildings(await buildingsRes.json());
        }}
        onCancel={() => { setShowConfirmDeleteBuilding(false); setSelectedDeleteBuildingId(null); }}
      />
      {/* Календарь занятости номера */}
      {showCalendarModal && selectedRoomForCalendar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a1a1a]/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-4xl relative animate-modal-in border border-gray-100 max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <FaCalendarAlt className="text-blue-600" />
              Календарь занятости: Номер {selectedRoomForCalendar.number}
            </h2>
            <button
              onClick={() => setShowCalendarModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none"
              aria-label="Закрыть"
            >×</button>
            
            <div className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Информация о номере</h3>
                  <p><strong>Класс:</strong> {ROOM_CLASS_LABELS[typeof selectedRoomForCalendar.room_class === 'object' ? (selectedRoomForCalendar.room_class as any)?.value || selectedRoomForCalendar.room_class : selectedRoomForCalendar.room_class]}</p>
                  <p><strong>Вместимость:</strong> {selectedRoomForCalendar.capacity} чел.</p>
                  <p><strong>Стоимость:</strong> {selectedRoomForCalendar.price_per_night} сом/сутки</p>
                  <p><strong>Статус:</strong> {selectedRoomForCalendar.is_active ? 'Активен' : 'Не активен'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Статистика бронирований</h3>
                  <p><strong>Всего бронирований:</strong> {roomBookings.length}</p>
                  <p><strong>Занято дней:</strong> {roomBookings.reduce((total, booking) => {
                    const from = new Date(booking.date_from);
                    const to = new Date(booking.date_to);
                    return total + Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                  }, 0)}</p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold mb-4">Календарь на ближайшие 30 дней</h3>
              <div className="grid grid-cols-7 gap-1 bg-gray-100 p-2 rounded-lg">
                {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
                  <div key={day} className="text-center font-semibold text-gray-600 p-2">{day}</div>
                ))}
                {getCalendarDays().map((date, index) => {
                  const isBooked = isDateBooked(date);
                  const booking = isBooked ? getBookingForDate(date) : null;
                  const isToday = date.toDateString() === new Date().toDateString();
                  
                  return (
                    <div
                      key={index}
                      className={`
                        p-2 text-center border rounded cursor-pointer transition-all
                        ${isToday ? 'bg-blue-100 border-blue-300 font-bold' : 'bg-white border-gray-200'}
                        ${isBooked ? 'bg-red-100 border-red-300 text-red-800' : 'hover:bg-gray-50'}
                      `}
                      title={isBooked ? `Занято: ${booking?.date_from} - ${booking?.date_to}` : 'Свободно'}
                    >
                      <div className="text-sm">{date.getDate()}</div>
                      {isBooked && <div className="text-xs text-red-600">●</div>}
                    </div>
                  );
                })}
              </div>
            </div>

            {roomBookings.length > 0 && (
              <div>
                <h3 className="font-semibold mb-4">Список бронирований</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  {roomBookings.map((booking, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                      <div>
                        <span className="font-semibold">{booking.date_from}</span>
                        <span className="mx-2">—</span>
                        <span className="font-semibold">{booking.date_to}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {Math.ceil((new Date(booking.date_to).getTime() - new Date(booking.date_from).getTime()) / (1000 * 60 * 60 * 24)) + 1} дней
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowCalendarModal(false)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded shadow"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Быстрый просмотр номера (tooltip) */}
      {showTooltip && tooltipRoom && (
        <div 
          className="fixed z-60 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm animate-fade-in"
          style={{ 
            left: tooltipPosition.x + 10, 
            top: tooltipPosition.y - 10,
            pointerEvents: 'none'
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <FaBed className="text-blue-600" />
            <span className="font-bold text-lg">Номер {tooltipRoom.number}</span>
          </div>
          
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Класс:</span>
              <span className="font-medium">{ROOM_CLASS_LABELS[typeof tooltipRoom.room_class === 'object' ? (tooltipRoom.room_class as any)?.value || tooltipRoom.room_class : tooltipRoom.room_class]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Вместимость:</span>
              <span className="font-medium">{tooltipRoom.capacity} чел.</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Стоимость:</span>
              <span className="font-medium">{tooltipRoom.price_per_night} сом/сутки</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Комнат:</span>
              <span className="font-medium">{tooltipRoom.rooms_count}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Статус:</span>
              <span className={`font-medium ${tooltipRoom.is_active ? 'text-green-600' : 'text-red-600'}`}>
                {tooltipRoom.is_active ? 'Активен' : 'Не активен'}
              </span>
            </div>
            {tooltipRoom.amenities && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <span className="text-gray-600 text-xs">Удобства:</span>
                <div className="text-xs text-gray-700 mt-1">{tooltipRoom.amenities}</div>
              </div>
            )}
            {tooltipRoom.description && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <span className="text-gray-600 text-xs">Описание:</span>
                <div className="text-xs text-gray-700 mt-1">{tooltipRoom.description}</div>
              </div>
            )}
          </div>
          
          <div className="mt-3 pt-2 border-t border-gray-100 text-xs text-gray-500">
            Кликните для просмотра календаря занятости
          </div>
        </div>
      )}
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