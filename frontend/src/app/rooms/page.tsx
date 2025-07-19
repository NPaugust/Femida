'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaBed, FaCrown, FaStar, FaEdit, FaTrash, FaFileCsv, FaPlus, FaFilter, FaSearch, FaBuilding, FaUsers, FaMoneyBillWave, FaCalendarAlt, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { API_URL } from '../../shared/api';
import { useSearchParams } from 'next/navigation';
import ConfirmModal from '../../components/ConfirmModal';
import Pagination from '../../components/Pagination';

interface Room {
  id: number;
  number: string;
  room_class: string | { value: string; label: string };
  description: string;
  building: { id: number; name: string };
  capacity: number;
  status: string;
  room_type: string;
  is_active: boolean;
  price_per_night: number;
  rooms_count: number;
  amenities: string;
  room_class_display?: { value: string; label: string };
}

interface Building {
  id: number;
  name: string;
  address: string;
}

// Тип для опций класса номера
interface RoomClassOption {
  value: string;
  label: string;
  color?: string;
}

const ROOM_CLASSES: RoomClassOption[] = [
  { value: 'standard', label: 'Стандарт', color: 'bg-gray-100 text-gray-800' },
  { value: 'semi_lux', label: 'Полу-люкс', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'lux', label: 'Люкс', color: 'bg-purple-100 text-purple-800' },
  // Дополнительные варианты для совместимости с бэком
  { value: 'Lux', label: 'Люкс', color: 'bg-purple-100 text-purple-800' },
  { value: 'Люкс', label: 'Люкс', color: 'bg-purple-100 text-purple-800' },
  { value: 'Semi-lux', label: 'Полу-люкс', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'Полу-люкс', label: 'Полу-люкс', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'Standard', label: 'Стандарт', color: 'bg-gray-100 text-gray-800' },
  { value: 'Стандарт', label: 'Стандарт', color: 'bg-gray-100 text-gray-800' },
];

// Только уникальные классы по label для select
const uniqueRoomClasses: RoomClassOption[] = [];
const seenLabels = new Set<string>();
for (const cls of ROOM_CLASSES) {
  if (!seenLabels.has(cls.label)) {
    uniqueRoomClasses.push(cls);
    seenLabels.add(cls.label);
  }
}

const ROOM_STATUSES = [
  { value: 'free', label: 'Свободен', color: 'bg-green-100 text-green-800' },
  { value: 'busy', label: 'Забронирован', color: 'bg-red-100 text-red-800' },
  { value: 'repair', label: 'Недоступен', color: 'bg-orange-100 text-orange-800' },
];

interface RoomModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (room: any) => void;
  initial?: Room | null;
  buildings: Building[];
}

function RoomModal({ open, onClose, onSave, initial, buildings }: RoomModalProps) {
  const [form, setForm] = useState({
    number: initial?.number || '',
    room_class: initial?.room_class || 'standard',
    building: initial?.building?.id || '',
    capacity: initial?.capacity || 1,
    status: initial?.status || 'free',
    room_type: initial?.room_type || '',
    is_active: initial?.is_active ?? true,
    price_per_night: initial?.price_per_night || 0,
    rooms_count: initial?.rooms_count || 1,
    amenities: initial?.amenities || '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  useEffect(() => {
    if (initial) {
      setForm({
        number: initial.number,
        // Приводим room_class к value через ROOM_CLASSES
        room_class: (() => {
          if (!initial?.room_class) return 'standard';
          if (typeof initial.room_class === 'object') {
            return initial.room_class.value;
          }
          const found = ROOM_CLASSES.find(
            cls => cls.value === initial.room_class || cls.label === initial.room_class
          );
          return found ? found.value : 'standard';
        })(),
        building: initial.building?.id || '',
        capacity: initial.capacity,
        status: initial.status,
        room_type: initial.room_type,
        is_active: initial.is_active,
        price_per_night: initial.price_per_night,
        rooms_count: initial.rooms_count,
        amenities: initial.amenities,
      });
    } else {
      setForm({
        number: '',
        room_class: 'standard',
        building: '',
        capacity: 1,
        status: 'free',
        room_type: '',
        is_active: true,
        price_per_night: 0,
        rooms_count: 1,
        amenities: '',
      });
    }
    setErrors({});
  }, [initial, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let newValue;
    if (type === 'checkbox') {
      newValue = (e.target as HTMLInputElement).checked;
    } else if (type === 'number') {
      newValue = Number(value);
    } else if (name === 'room_class') {
      newValue = value; // всегда строка
    } else {
      newValue = value;
    }
    setForm(prev => ({ ...prev, [name]: newValue }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    if (!form.number.trim()) {
      newErrors.number = 'Номер комнаты обязателен';
    }
    if (!form.building) {
      newErrors.building = 'Выберите здание';
    }
    if (form.capacity < 1) {
      newErrors.capacity = 'Вместимость должна быть больше 0';
    }
    if (form.price_per_night < 0) {
      newErrors.price_per_night = 'Цена не может быть отрицательной';
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
      const url = initial ? `${API_URL}/api/rooms/${initial.id}/` : `${API_URL}/api/rooms/`;
      const method = initial ? 'PUT' : 'POST';
      const payload: any = {
        number: form.number,
        building_id: Number(form.building),
        capacity: Number(form.capacity),
        room_class: typeof form.room_class === 'object' ? form.room_class.value : form.room_class,
        status: form.status,
        is_active: !!form.is_active,
        price_per_night: Number(form.price_per_night),
        rooms_count: Number(form.rooms_count),
        amenities: form.amenities,
        room_type: form.room_type || 'standard',
        description: '',
      };
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        const savedRoom = await response.json();
        onSave(savedRoom);
        onClose();
      } else {
        const errorData = await response.json();
        setErrors({ submit: errorData.detail || 'Ошибка при сохранении номера' });
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
        <h2 className="text-xl font-bold mb-6">{initial ? 'Редактировать номер' : 'Добавить номер'}</h2>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none">×</button>
        <form className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4" onSubmit={handleSubmit}>
          <label className="font-semibold md:text-right md:pr-2 flex items-center">Номер *</label>
          <input type="text" name="number" className="input w-full" value={form.number} onChange={handleChange} />

          <label className="font-semibold md:text-right md:pr-2 flex items-center">Корпус *</label>
          <select name="building" className="input w-full" value={form.building} onChange={handleChange} required>
            <option value="">Выберите корпус</option>
            {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>

          <label className="font-semibold md:text-right md:pr-2 flex items-center">Класс номера</label>
          <select name="room_class" className="input w-full" value={String(form.room_class)} onChange={handleChange}>
            {uniqueRoomClasses.map(cls => <option key={cls.value} value={cls.value}>{cls.label}</option>)}
          </select>

          <label className="font-semibold md:text-right md:pr-2 flex items-center">Вместимость *</label>
          <input type="number" name="capacity" min={1} className="input w-full" value={form.capacity} onChange={handleChange} />

          <label className="font-semibold md:text-right md:pr-2 flex items-center">Цена *</label>
          <input type="number" name="price_per_night" min={0} className="input w-full" value={form.price_per_night} onChange={handleChange} />

          <label className="font-semibold md:text-right md:pr-2 flex items-center">Статус</label>
          <select name="status" className="input w-full" value={form.status} onChange={handleChange}>
            {ROOM_STATUSES.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}
          </select>

          <label className="font-semibold md:text-right md:pr-2 flex items-center">Количество комнат</label>
          <input type="number" name="rooms_count" min={1} className="input w-full" value={form.rooms_count} onChange={handleChange} />

          <label className="font-semibold md:text-right md:pr-2 flex items-center">Активен</label>
          <label className="flex items-center">
            <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            <span className="ml-2 text-sm text-gray-700">Номер доступен для бронирования</span>
          </label>

          <label className="font-semibold md:text-right md:pr-2 flex items-center">Удобства</label>
          <textarea name="amenities" className="input w-full md:col-span-1" rows={2} value={form.amenities} onChange={handleChange} />

          {/* Ошибки */}
          {errors.submit && <div className="md:col-span-2 text-red-500 text-sm mt-2">{errors.submit}</div>}

          {/* Кнопки */}
          <div className="md:col-span-2 flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-5 py-2 rounded font-semibold">Отмена</button>
            <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-semibold shadow disabled:opacity-60 disabled:cursor-not-allowed">{loading ? 'Сохранение...' : (initial ? 'Сохранить' : 'Добавить')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RoomsPage() {
  const { t } = useTranslation();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    roomClass: '',
    status: '',
    building: '',
    priceFrom: '',
    priceTo: '',
    capacityFrom: '',
    capacityTo: '',
  });
  const [selectedRoomIds, setSelectedRoomIds] = useState<number[]>([]);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | number[] | null>(null);
  
  // Пагинация
  const [currentPage, setCurrentPage] = useState(1);
  const roomsPerPage = 8; // 8 номеров на страницу

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('access');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      const [roomsResponse, buildingsResponse] = await Promise.all([
        fetch(`${API_URL}/api/rooms/`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/buildings/`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ]);

      if (roomsResponse.ok && buildingsResponse.ok) {
        const [roomsData, buildingsData] = await Promise.all([
          roomsResponse.json(),
          buildingsResponse.json(),
        ]);
        setRooms(roomsData);
        setBuildings(buildingsData);
      } else {
        setError('Ошибка загрузки данных');
      }
    } catch (error) {
      setError('Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = (room: Room) => {
    if (editingRoom) {
      setRooms(prev => prev.map(r => r.id === room.id ? room : r));
    } else {
      setRooms(prev => [...prev, room]);
    }
    setEditingRoom(null);
  };

  const handleEdit = (room: Room) => {
    setEditingRoom(room);
    setShowModal(true);
  };

  const handleDelete = (roomId: number) => {
    setDeleteTarget(roomId);
    setShowConfirmDelete(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      const token = localStorage.getItem('access');
      const ids = Array.isArray(deleteTarget) ? deleteTarget : [deleteTarget];
      
      await Promise.all(ids.map(id => 
        fetch(`${API_URL}/api/rooms/${id}/`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
      ));

      setRooms(prev => prev.filter(r => !ids.includes(r.id)));
      setSelectedRoomIds([]);
    } catch (error) {
      setError('Ошибка при удалении');
    } finally {
      setDeleteTarget(null);
      setShowConfirmDelete(false);
    }
  };

  const handleSelectRoom = (id: number) => {
    setSelectedRoomIds(prev => 
      prev.includes(id) 
        ? prev.filter(rId => rId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedRoomIds.length === filteredRooms.length) {
      setSelectedRoomIds([]);
    } else {
      setSelectedRoomIds(filteredRooms.map(r => r.id));
    }
  };

  const handleMassDelete = () => {
    setDeleteTarget(selectedRoomIds);
    setShowConfirmDelete(true);
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Номер', 'Здание', 'Класс', 'Вместимость', 'Статус', 'Цена', 'Активен'];
    const csvContent = [
      headers.join(','),
      ...filteredRooms.map(room => [
        room.id,
        `"${room.number}"`,
        `"${room.building?.name || ''}"`,
        typeof room.room_class === 'object' ? room.room_class.label : room.room_class,
        room.capacity,
        ROOM_STATUSES.find(s => s.value === room.status)?.label || room.status,
        room.price_per_night,
        room.is_active ? 'Да' : 'Нет'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `rooms_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = !filters.search || 
      room.number.toLowerCase().includes(filters.search.toLowerCase()) ||
      room.description.toLowerCase().includes(filters.search.toLowerCase());
    
    const matchesClass = !filters.roomClass || 
      (typeof room.room_class === 'object' ? room.room_class.value === filters.roomClass : room.room_class === filters.roomClass);
    
    const matchesStatus = !filters.status || room.status === filters.status;
    
    const matchesBuilding = !filters.building || room.building?.id === parseInt(filters.building);
    
    const matchesPrice = (!filters.priceFrom || room.price_per_night >= parseInt(filters.priceFrom)) &&
                        (!filters.priceTo || room.price_per_night <= parseInt(filters.priceTo));
    
    const matchesCapacity = (!filters.capacityFrom || room.capacity >= parseInt(filters.capacityFrom)) &&
                           (!filters.capacityTo || room.capacity <= parseInt(filters.capacityTo));

    return matchesSearch && matchesClass && matchesStatus && matchesBuilding && matchesPrice && matchesCapacity;
  });

  // Пагинация
  const totalPages = Math.ceil(filteredRooms.length / roomsPerPage);
  const paginatedRooms = filteredRooms.slice(
    (currentPage - 1) * roomsPerPage,
    currentPage * roomsPerPage
  );

  const getRoomStatistics = () => {
    const total = rooms.length;
    const active = rooms.filter(r => r.is_active).length;
    const totalCapacity = rooms.reduce((sum, r) => sum + r.capacity, 0);
    const totalRevenue = rooms.reduce((sum, r) => sum + r.price_per_night, 0);
    
    return { total, active, totalCapacity, totalRevenue };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка номеров...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-600 mb-4">{error}</p>
        <button 
          onClick={fetchData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  const stats = getRoomStatistics();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Верхняя панель */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Номера</h1>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <FaBed className="text-blue-600" />
              <span>{stats.total} номеров</span>
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
                <FaBed className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Всего номеров</p>
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
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <FaUsers className="text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Общая вместимость</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalCapacity}</p>
              </div>
            </div>
          </div>
          {/* Новый блок: Свободных номеров */}
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <FaCheckCircle className="text-green-500" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Свободных номеров</p>
                <p className="text-2xl font-bold text-gray-900">
                  {rooms.filter(r => r.status === 'free').length} из {stats.total}
                </p>
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
                  placeholder="Номер, описание..."
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Класс</label>
              <select
                value={filters.roomClass}
                onChange={(e) => setFilters(prev => ({ ...prev, roomClass: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Все классы</option>
                {ROOM_CLASSES.map(cls => (
                  <option key={cls.value} value={cls.value}>{cls.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Статус</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Все статусы</option>
                {ROOM_STATUSES.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Здание</label>
              <select
                value={filters.building}
                onChange={(e) => setFilters(prev => ({ ...prev, building: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Все здания</option>
                {buildings.map(building => (
                  <option key={building.id} value={building.id}>{building.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Цена</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={filters.priceFrom}
                  onChange={(e) => setFilters(prev => ({ ...prev, priceFrom: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="От"
                />
                <input
                  type="number"
                  value={filters.priceTo}
                  onChange={(e) => setFilters(prev => ({ ...prev, priceTo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="До"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Вместимость</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={filters.capacityFrom}
                  onChange={(e) => setFilters(prev => ({ ...prev, capacityFrom: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="От"
                />
                <input
                  type="number"
                  value={filters.capacityTo}
                  onChange={(e) => setFilters(prev => ({ ...prev, capacityTo: e.target.value }))}
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
        {paginatedRooms.length === 0 ? (
          <div className="text-center py-12">
            <FaBed className="text-gray-400 text-6xl mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Нет номеров</h3>
            <p className="text-gray-500 mb-4">
              {filters.search || filters.roomClass || filters.status || filters.building || filters.priceFrom || filters.capacityFrom
                ? 'Попробуйте изменить фильтры'
                : 'Добавьте первый номер'
              }
            </p>
            {!filters.search && !filters.roomClass && !filters.status && !filters.building && !filters.priceFrom && !filters.capacityFrom && (
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors mx-auto"
              >
                <FaPlus />
                Добавить номер
              </button>
            )}
          </div>
        ) : (
          <div className='rounded-lg shadow bg-white w-full'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='bg-gray-50 text-gray-700'>
                  <th className='p-3 text-left'>
                    <input
                      type='checkbox'
                      checked={selectedRoomIds.length === paginatedRooms.length && paginatedRooms.length > 0}
                      onChange={handleSelectAll}
                      className='rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                    />
                  </th>
                  <th className='p-3 text-center'>Номер</th>
                  <th className='p-3 text-center'>Здание</th>
                  <th className='p-3 text-center'>Класс</th>
                  <th className='p-3 text-center'>Вместимость</th>
                  <th className='p-3 text-center'>Статус</th>
                  <th className='p-3 text-center'>Цена</th>
                  <th className='p-3 text-center'>Действия</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRooms.map((room, idx) => (
                  <tr key={room.id} className={`transition-all border-b last:border-b-0 ${idx % 2 === 1 ? 'bg-gray-50' : 'bg-white'} hover:bg-blue-50`}>
                    <td className='p-3 text-left'>
                      <input
                        type='checkbox'
                        checked={selectedRoomIds.includes(room.id)}
                        onChange={() => handleSelectRoom(room.id)}
                        className='rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                      />
                    </td>
                    <td className='p-3 text-center'>
                      <span className='font-medium text-gray-900'>{room.number}</span>
                      <div className='text-xs text-gray-500'>ID: {room.id}</div>
                    </td>
                    <td className='p-3 text-center'>
                      <span className='text-sm'>{room.building?.name || '—'}</span>
                    </td>
                    <td className='p-3 text-center'>
                      {(() => {
                        if (room.room_class_display && room.room_class_display.label) {
                          return (
                            <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800'>
                              {room.room_class_display.label}
                            </span>
                          );
                        }
                        let label = '';
                        if (typeof room.room_class === 'object' && room.room_class !== null) {
                          label = room.room_class.label;
                        } else if (typeof room.room_class === 'string') {
                          const found = ROOM_CLASSES.find(c => c.value === room.room_class);
                          label = found ? found.label : room.room_class;
                        }
                        return (
                          <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800'>
                            {label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className='p-3 text-center'>
                      <span className='flex items-center gap-2 text-sm justify-center'>
                        <FaUsers className='text-gray-400' />
                        {room.capacity} чел.
                      </span>
                    </td>
                    <td className='p-3 text-center'>
                      <select
                        className={`min-w-0 px-2 py-1 text-xs font-medium rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${ROOM_STATUSES.find(s => s.value === room.status)?.color || 'bg-gray-100 text-gray-800'}`}
                        style={{ height: 28, maxWidth: 120 }}
                        value={room.status}
                        onChange={async (e) => {
                          const newStatus = e.target.value;
                          try {
                            const token = localStorage.getItem('access');
                            const res = await fetch(`${API_URL}/api/rooms/${room.id}/`, {
                              method: 'PATCH',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`,
                              },
                              body: JSON.stringify({ status: newStatus }),
                            });
                            if (res.ok) {
                              setRooms(prev => prev.map(r => r.id === room.id ? { ...r, status: newStatus } : r));
                            }
                          } catch {}
                        }}
                      >
                        {ROOM_STATUSES.map(status => (
                          <option key={status.value} value={status.value}>{status.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className='p-3 text-center'>
                      <span className='font-medium text-green-600'>
                        {Math.round(room.price_per_night).toLocaleString()} сом
                      </span>
                    </td>
                    <td className='p-3 text-center'>
                      <div className='flex items-center gap-2 justify-center'>
                        <button
                          onClick={() => handleEdit(room)}
                          className='bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded font-semibold flex items-center gap-1 text-xs'
                          title='Редактировать'
                        >
                          <FaEdit /> Ред.
                        </button>
                        <button
                          onClick={() => handleDelete(room.id)}
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
                Показано {((currentPage - 1) * roomsPerPage) + 1} - {Math.min(currentPage * roomsPerPage, filteredRooms.length)} из {filteredRooms.length}
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          </div>
        )}
      </div>

      {/* Массовые действия */}
      {selectedRoomIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex gap-4 bg-white shadow-xl rounded-full px-6 py-3 border items-center animate-fade-in">
          <span className="font-semibold text-blue-700">Выбрано: {selectedRoomIds.length}</span>
          <button
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded shadow flex items-center gap-2"
            onClick={handleMassDelete}
          >
            <FaTrash /> Удалить
          </button>
          <button
            className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded shadow flex items-center gap-2"
            onClick={() => { setSelectedRoomIds([]); }}
          >
            Отмена
          </button>
        </div>
      )}

      {/* Модалка */}
      <RoomModal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingRoom(null);
        }}
        onSave={handleSave}
        initial={editingRoom}
        buildings={buildings}
      />

      {/* Модалка подтверждения удаления */}
      <ConfirmModal
        open={showConfirmDelete}
        title="Удалить номер?"
        description={
          Array.isArray(deleteTarget) 
            ? `Вы действительно хотите удалить ${deleteTarget.length} номеров? Это действие необратимо.`
            : "Вы действительно хотите удалить этот номер? Это действие необратимо."
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