'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaBed, FaCrown, FaStar, FaEdit, FaTrash, FaFileCsv, FaPlus, FaFilter, FaSearch, FaBuilding, FaUsers, FaMoneyBillWave, FaCalendarAlt, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import StatusBadge from '../../components/StatusBadge';
import Button from '../../components/Button';
import LoadingSpinner from '../../components/LoadingSpinner';
import ExportConfirmModal from '../../components/ExportConfirmModal';
import HighlightedText from '../../components/HighlightedText';
import { API_URL, fetchWithAuth } from '../../shared/api';
import { useSearchParams } from 'next/navigation';
import ConfirmModal from '../../components/ConfirmModal';
import Pagination from '../../components/Pagination';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch, setRooms, addRoom, updateRoom, removeRoom, setRoomsLoading, setRoomsError } from '../store';
import Breadcrumbs from '../../components/Breadcrumbs';

interface Room {
  id: number;
  number: string;
  room_class: string | { value: string; label: string };
  description: string; // всегда string
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
  const access = useSelector((state: RootState) => state.auth.access);

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
      const response = await fetchWithAuth(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${access}`,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-xl relative animate-scale-in border border-gray-100 focus:outline-none">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <FaBed className="text-blue-600 text-xl" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">{initial ? 'Редактировать номер' : 'Добавить номер'}</h2>
        </div>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none transition-colors">×</button>
        <form className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4" onSubmit={handleSubmit}>
          <label className="font-semibold md:text-right md:pr-2 flex items-center text-gray-700">Номер *</label>
          <input type="text" name="number" className="input w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" value={form.number} onChange={handleChange} placeholder="Введите номер комнаты" />

          <label className="font-semibold md:text-right md:pr-2 flex items-center text-gray-700">Корпус *</label>
          <select name="building" className="input w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" value={form.building} onChange={handleChange} required>
            <option value="">Выберите корпус</option>
            {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>

          <label className="font-semibold md:text-right md:pr-2 flex items-center text-gray-700">Класс номера</label>
          <select name="room_class" className="input w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" value={String(form.room_class)} onChange={handleChange}>
            {uniqueRoomClasses.map(cls => <option key={cls.value} value={cls.value}>{cls.label}</option>)}
          </select>

          <label className="font-semibold md:text-right md:pr-2 flex items-center">Вместимость *</label>
          <input type="number" name="capacity" min={1} className="input w-full" value={form.capacity} onChange={handleChange} />

          <label className="font-semibold md:text-right md:pr-2 flex items-center">Цена *</label>
          <input type="number" name="price_per_night" min={0} className="input w-full" value={form.price_per_night} onChange={handleChange} />

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
            <Button
              variant="ghost"
              onClick={onClose}
              className="hover:bg-gray-100"
            >
              Отмена
            </Button>
            <Button
              variant="primary"
              type="submit"
              loading={loading}
              disabled={loading}
              icon={loading ? undefined : <FaBed />}
            >
              {loading ? 'Сохранение...' : (initial ? 'Сохранить' : 'Добавить')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RoomsPage() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const dispatch = useDispatch<AppDispatch>();
  const rooms = useSelector((state: RootState) => state.rooms.rooms);
  const loading = useSelector((state: RootState) => state.rooms.loading);
  const error = useSelector((state: RootState) => state.rooms.error);
  const access = useSelector((state: RootState) => state.auth.access);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    roomClass: '',
    building: '',
    priceFrom: '',
    priceTo: '',
    capacityFrom: '',
    capacityTo: '',
  });
  const [selectedRoomIds, setSelectedRoomIds] = useState<number[]>([]);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | number[] | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  
  // Пагинация
  const [currentPage, setCurrentPage] = useState(1);
  const roomsPerPage = 8; // 8 номеров на страницу

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!access) {
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  }, [access]);

  // Фильтры: закрытие по клику вне
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (showFilters && !target.closest('.filter-panel') && !target.closest('[data-filter-button]')) {
        setShowFilters(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilters]);

  const fetchData = async () => {
    dispatch(setRoomsLoading(true));
    try {
      if (!access) {
        window.location.href = '/login';
        return;
      }

      const [roomsResponse, buildingsResponse] = await Promise.all([
        fetchWithAuth(`${API_URL}/api/rooms/`, {
          headers: { 'Authorization': `Bearer ${access}` },
        }),
        fetchWithAuth(`${API_URL}/api/buildings/`, {
          headers: { 'Authorization': `Bearer ${access}` },
        }),
      ]);

      if (roomsResponse.ok && buildingsResponse.ok) {
        const [roomsData, buildingsData] = await Promise.all([
          roomsResponse.json(),
          buildingsResponse.json(),
        ]);
        dispatch(setRooms(roomsData));
        setBuildings(buildingsData);
      } else {
        dispatch(setRoomsError('Ошибка загрузки данных'));
      }
    } catch (error) {
      dispatch(setRoomsError('Ошибка сети'));
    } finally {
      dispatch(setRoomsLoading(false));
    }
  };

  const handleSave = (room: Room) => {
    // Приводим room.description к string
    const safeRoom = { ...room, description: room.description ?? '' };
    if (editingRoom) {
      dispatch(updateRoom(safeRoom));
    } else {
      dispatch(addRoom(safeRoom));
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

    dispatch(setRoomsLoading(true));
    try {
      const ids = Array.isArray(deleteTarget) ? deleteTarget : [deleteTarget];
      
      await Promise.all(ids.map(id => 
        fetchWithAuth(`${API_URL}/api/rooms/${id}/`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${access}`,
          },
        })
      ));

      ids.forEach(id => dispatch(removeRoom(id)));
      setSelectedRoomIds([]);
    } catch (error) {
      dispatch(setRoomsError('Ошибка при удалении'));
    } finally {
      setDeleteTarget(null);
      setShowConfirmDelete(false);
      dispatch(setRoomsLoading(false));
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
    setShowExportModal(true);
  };

  const handleExportConfirm = () => {
    setExportLoading(true);
    setTimeout(() => {
      const headers = ['ID', 'Номер', 'Здание', 'Класс', 'Вместимость', 'Комнат', 'Удобства', 'Цена', 'Активен'];
      const csvContent = [
        headers.join(','),
        ...filteredRooms.map(room => [
          room.id,
          `"${room.number}"`,
          `"${room.building?.name || ''}"`,
          typeof room.room_class === 'object' ? room.room_class.label : room.room_class,
          room.capacity,
          room.rooms_count || 1,
          `"${room.amenities || ''}"`,
          room.price_per_night,
          room.is_active ? 'Да' : 'Нет'
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `номера_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      setExportLoading(false);
      setShowExportModal(false);
    }, 1000);
  };

  // rooms из Redux могут содержать description: string | undefined, поэтому приводим к string
  const safeRooms: Room[] = rooms.map((r: any) => ({
    ...r,
    description: r.description ?? '',
    room_type: r.room_type ?? '',
  }));

  const filteredRooms: Room[] = safeRooms.filter((room: Room) => {
    const matchesSearch = !filters.search || 
      room.number.toLowerCase().includes(filters.search.toLowerCase()) ||
      (room.description || '').toLowerCase().includes(filters.search.toLowerCase());
    
    const matchesClass = !filters.roomClass || 
      (typeof room.room_class === 'object' ? room.room_class.value === filters.roomClass : room.room_class === filters.roomClass);
    
    const matchesBuilding = !filters.building || room.building?.id === parseInt(filters.building);
    
    const matchesPrice = (!filters.priceFrom || room.price_per_night >= parseInt(filters.priceFrom)) &&
                        (!filters.priceTo || room.price_per_night <= parseInt(filters.priceTo));
    
    const matchesCapacity = (!filters.capacityFrom || room.capacity >= parseInt(filters.capacityFrom)) &&
                           (!filters.capacityTo || room.capacity <= parseInt(filters.capacityTo));

    // Фильтр по номеру комнаты из URL
    const urlParams = new URLSearchParams(window.location.search);
    const roomNumber = urlParams.get('room');
    const matchesRoomNumber = !roomNumber || room.number === roomNumber;

    return matchesSearch && matchesClass && matchesBuilding && matchesPrice && matchesCapacity && matchesRoomNumber;
  });

  // Пагинация
  const totalPages = Math.ceil(filteredRooms.length / roomsPerPage);
  const paginatedRooms: Room[] = filteredRooms.slice(
    (currentPage - 1) * roomsPerPage,
    currentPage * roomsPerPage
  );

  function getRoomStatistics(roomsArr: Room[] = safeRooms) {
    const total = roomsArr.length;
    const active = roomsArr.filter(r => r.is_active).length;
    const totalCapacity = roomsArr.reduce((sum, r) => sum + r.capacity, 0);
    
    // Рассчитываем общую стоимость всех номеров
    const totalValue = roomsArr.reduce((sum, r) => {
      let price = r.price_per_night;
      
      // Если это строка, убираем пробелы и конвертируем
      if (typeof price === 'string') {
        price = parseFloat((price as string).replace(/\s/g, '').replace(',', '.'));
      }
      
      const numPrice = typeof price === 'number' ? price : 0;
      return sum + (numPrice && !isNaN(numPrice) ? numPrice : 0);
    }, 0);
    
    return { total, active, totalCapacity, totalValue };
  }

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

  const stats = getRoomStatistics(safeRooms);

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumbs />
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
              data-filter-button
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
              <span className="font-bold">Добавить</span>
            </button>
          </div>
        </div>
      </div>

      {/* Статистика */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-lg p-6 border border-blue-200 hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <FaBed className="text-white text-xl" />
              </div>
              <div>
                <p className="text-sm text-blue-700 font-bold">Всего номеров</p>
                <p className="text-3xl font-bold text-blue-900">{stats.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl shadow-lg p-6 border border-green-200 hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <FaCheckCircle className="text-white text-xl" />
              </div>
              <div>
                <p className="text-sm text-green-700 font-bold">Активных</p>
                <p className="text-3xl font-bold text-green-900">{stats.active}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl shadow-lg p-6 border border-purple-200 hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <FaBuilding className="text-white text-xl" />
              </div>
              <div>
                <p className="text-sm text-purple-700 font-bold">Всего зданий</p>
                <p className="text-3xl font-bold text-purple-900">{buildings.length}</p>
                <p className="text-xs text-purple-700 mt-1">{buildings.map(b => b.name).join(', ')}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl shadow-lg p-6 border border-orange-200 hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <FaMoneyBillWave className="text-white text-xl" />
              </div>
              <div>
                <p className="text-sm text-orange-700 font-bold">Общая стоимость номеров</p>
                <p className="text-3xl font-bold text-orange-900">
                  {Math.round(stats.totalValue).toLocaleString()} сом
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Выдвижная панель фильтров */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-xs bg-white shadow-2xl z-50 transition-transform duration-300 filter-panel ${showFilters ? 'translate-x-0' : 'translate-x-full'}`} style={{minWidth: 320}}>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold">Фильтры</h2>
          <button onClick={() => setShowFilters(false)} className="text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none">×</button>
        </div>
        <div className="p-4 flex flex-col gap-4">
          <label className="font-semibold">Поиск</label>
          <div className="relative">
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Номер, описание..."
            />
            <FaSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
          </div>

          <label className="font-semibold">Класс</label>
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

          <label className="font-semibold">Здание</label>
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

          <label className="font-semibold">Цена от</label>
          <input
            type="number"
            value={filters.priceFrom}
            onChange={(e) => setFilters(prev => ({ ...prev, priceFrom: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="От"
          />

          <label className="font-semibold">Цена до</label>
          <input
            type="number"
            value={filters.priceTo}
            onChange={(e) => setFilters(prev => ({ ...prev, priceTo: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="До"
          />

          <label className="font-semibold">Вместимость от</label>
          <input
            type="number"
            value={filters.capacityFrom}
            onChange={(e) => setFilters(prev => ({ ...prev, capacityFrom: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="От"
          />

          <label className="font-semibold">Вместимость до</label>
          <input
            type="number"
            value={filters.capacityTo}
            onChange={(e) => setFilters(prev => ({ ...prev, capacityTo: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="До"
          />

          <div className="flex gap-2 mt-4">
            <button type="button" onClick={() => setFilters({ search: '', roomClass: '', building: '', priceFrom: '', priceTo: '', capacityFrom: '', capacityTo: '' })} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-5 py-2 rounded font-semibold flex-1">Сбросить</button>
            <button type="button" onClick={() => setShowFilters(false)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-semibold shadow flex-1">Применить</button>
          </div>
        </div>
      </div>

      {/* Контент */}
      <div className="px-6 py-6">
        {paginatedRooms.length === 0 ? (
          <div className="text-center py-12">
            <FaBed className="text-gray-400 text-6xl mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Нет номеров</h3>
            <p className="text-gray-500 mb-4">
              {filters.search || filters.roomClass || filters.building || filters.priceFrom || filters.capacityFrom
                ? 'Попробуйте изменить фильтры'
                : 'Добавьте первый номер'
              }
            </p>
            {!filters.search && !filters.roomClass && !filters.building && !filters.priceFrom && !filters.capacityFrom && (
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
                              <th className='p-3 text-center font-bold'>Номер</th>
            <th className='p-3 text-center font-bold'>Здание</th>
            <th className='p-3 text-center font-bold'>Класс</th>
            <th className='p-3 text-center font-bold'>Вместимость</th>
            <th className='p-3 text-center font-bold'>Комнат</th>
            <th className='p-3 text-center font-bold'>Удобства</th>
            <th className='p-3 text-center font-bold'>Цена</th>
            <th className='p-3 text-center font-bold'>Действия</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRooms.map((room, idx) => {
                  const urlParams = new URLSearchParams(window.location.search);
                  const roomNumber = urlParams.get('room');
                  const isHighlighted = roomNumber && room.number === roomNumber;
                  
                  return (
                    <tr key={room.id} className={`transition-all border-b last:border-b-0 ${idx % 2 === 1 ? 'bg-gray-50' : 'bg-white'} hover:bg-blue-50 ${isHighlighted ? 'bg-yellow-100 animate-pulse' : ''}`}>
                    <td className='p-3 text-left'>
                      <input
                        type='checkbox'
                        checked={selectedRoomIds.includes(room.id)}
                        onChange={() => handleSelectRoom(room.id)}
                        className='rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                      />
                    </td>
                    <td className='p-3 text-center'>
                      <HighlightedText 
                        text={room.number} 
                        searchQuery={filters.search} 
                        className='font-medium text-gray-900' 
                      />
                                              <div className='text-xs text-gray-500'>#{room.id}</div>
                    </td>
                    <td className='p-3 text-center'>
                      <span className='text-sm'>{room.building?.name || '—'}</span>
                    </td>
                    <td className='p-3 text-center'>
                      {(() => {
                        if ('room_class_display' in room && room.room_class_display && typeof room.room_class_display === 'object' && 'label' in room.room_class_display) {
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
                      <span className='text-sm font-medium text-gray-700'>
                        {room.rooms_count || 1}
                      </span>
                    </td>
                    <td className='p-3 text-center'>
                      <span className='text-xs text-gray-600 max-w-[150px] truncate block' title={room.amenities || 'Нет удобств'}>
                        {room.amenities ? (room.amenities.length > 20 ? `${room.amenities.substring(0, 20)}...` : room.amenities) : '—'}
                      </span>
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
                );
              })}
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

      {/* Модальное окно подтверждения экспорта */}
      <ExportConfirmModal
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        onConfirm={handleExportConfirm}
        title="Экспорт номеров"
        description={`Экспорт ${filteredRooms.length} номеров в CSV файл`}
        fileName={`номера_${new Date().toISOString().split('T')[0]}.csv`}
        loading={exportLoading}
      />
    </div>
  );
} 