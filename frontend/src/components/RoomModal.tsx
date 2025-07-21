'use client';

import { useEffect, useState } from 'react';
import { FaBed } from 'react-icons/fa';
import Button from './Button';
import { API_URL } from '../shared/api';

export interface Building {
  id: number;
  name: string;
  address?: string;
}

export interface Room {
  id: number;
  number: string;
  room_class: string | { value: string; label: string };
  description?: string;
  building: Building;
  capacity: number;
  status: string;
  room_type?: string;
  is_active: boolean;
  price_per_night: number;
  rooms_count?: number;
  amenities?: string;
}

export interface RoomModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (room: Room) => void;
  initial?: Room | null;
  buildings: Building[];
}

const ROOM_CLASSES = [
  { value: 'standard', label: 'Стандарт' },
  { value: 'semi_lux', label: 'Полу-люкс' },
  { value: 'lux', label: 'Люкс' },
];

const ROOM_STATUSES = [
  { value: 'free', label: 'Свободен' },
  { value: 'busy', label: 'Забронирован' },
  { value: 'repair', label: 'Недоступен' },
];

const RoomModal = ({ open, onClose, onSave, initial, buildings }: RoomModalProps) => {
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
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (initial) {
      setForm({
        number: initial.number || '',
        room_class: typeof initial.room_class === 'object' ? initial.room_class.value : (initial.room_class || 'standard'),
        building: initial.building?.id || '',
        capacity: initial.capacity ?? 1,
        status: initial.status || 'free',
        room_type: initial.room_type || '',
        is_active: initial.is_active ?? true,
        price_per_night: initial.price_per_night ?? 0,
        rooms_count: initial.rooms_count ?? 1,
        amenities: initial.amenities || '',
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
      newValue = value;
    } else {
      newValue = value;
    }
    setForm(prev => ({ ...prev, [name]: newValue }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
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
          <input type="text" name="number" className="input w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" value={form.number} onChange={handleChange} placeholder="Введите номер комнаты" autoFocus />

          <label className="font-semibold md:text-right md:pr-2 flex items-center text-gray-700">Корпус *</label>
          <select name="building" className="input w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" value={form.building} onChange={handleChange} required>
            <option value="">Выберите корпус</option>
            {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>

          <label className="font-semibold md:text-right md:pr-2 flex items-center text-gray-700">Класс номера</label>
          <select name="room_class" className="input w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" value={String(form.room_class)} onChange={handleChange}>
            {ROOM_CLASSES.map(cls => <option key={cls.value} value={cls.value}>{cls.label}</option>)}
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
};

export default RoomModal; 