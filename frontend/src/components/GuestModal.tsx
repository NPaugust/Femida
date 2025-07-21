'use client';

import { useEffect, useState } from 'react';
import { FaUser, FaTimesCircle } from 'react-icons/fa';
import Button from './Button';
import dynamic from 'next/dynamic';
import 'react-phone-input-2/lib/style.css';
import { API_URL } from '../shared/api';
import { useSelector } from 'react-redux';
import { RootState } from '../app/store';

const PhoneInput: any = dynamic(() => import('react-phone-input-2').then(mod => mod.default), { ssr: false });

const GUEST_STATUSES = [
  { value: 'active', label: 'Активный', color: 'bg-green-100 text-green-800' },
  { value: 'inactive', label: 'Неактивный', color: 'bg-gray-100 text-gray-800' },
  { value: 'vip', label: 'ВИП', color: 'bg-purple-100 text-purple-800' },
  { value: 'blacklist', label: 'Чёрный список', color: 'bg-red-100 text-red-800' },
];

export interface Guest {
  id: number;
  full_name: string;
  inn: string;
  phone: string;
  notes: string;
  registration_date: string;
  total_spent: number;
  visits_count: number;
  status: string;
}

export interface GuestModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (guest: Guest) => void;
  initial?: Guest | null;
}

const GuestModal = ({ open, onClose, onSave, initial }: GuestModalProps) => {
  const [form, setForm] = useState({
    full_name: initial?.full_name || '',
    inn: initial?.inn || '',
    phone: initial?.phone || '',
    country: 'kg',
    notes: initial?.notes || '',
    status: initial?.status || 'active',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const access = useSelector((state: RootState) => state.auth.access);

  useEffect(() => {
    if (initial) {
      setForm({
        full_name: initial.full_name,
        inn: initial.inn,
        phone: initial.phone,
        country: 'kg',
        notes: initial.notes,
        status: initial.status,
      });
    } else {
      setForm({
        full_name: '',
        inn: '',
        phone: '',
        country: 'kg',
        notes: '',
        status: 'active',
      });
    }
    setErrors({});
  }, [initial, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
  };

  const handlePhoneChange = (value: string, data: any) => {
    setForm(f => ({ ...f, phone: '+' + value, country: data.countryCode }));
    if (errors.phone) {
      setErrors({ ...errors, phone: '' });
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!form.full_name || form.full_name.length < 3) {
      newErrors.full_name = 'ФИО должно содержать минимум 3 символа';
    }
    if (!form.inn || !/^[0-9]{14}$/.test(form.inn)) {
      newErrors.inn = 'ИНН должен содержать ровно 14 цифр';
    }
    if (!form.phone || !/^\+\d{7,16}$/.test(form.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Введите корректный номер телефона';
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
      const url = initial ? `${API_URL}/api/guests/${initial.id}/` : `${API_URL}/api/guests/`;
      const method = initial ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${access}`,
        },
        body: JSON.stringify(form),
      });
      if (response.ok) {
        const savedGuest = await response.json();
        onSave(savedGuest);
        onClose();
      } else {
        setErrors({ submit: 'Ошибка при сохранении гостя' });
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
            <FaUser className="text-blue-600 text-xl" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">{initial ? 'Редактировать гостя' : 'Добавить гостя'}</h2>
        </div>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none transition-colors">×</button>
        <form className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4" onSubmit={handleSubmit}>
          <label className="font-semibold md:text-right md:pr-2 flex items-center text-gray-700">ФИО *</label>
          <input type="text" name="full_name" className="input w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" value={form.full_name} onChange={handleChange} placeholder="Введите полное имя" autoFocus />
          {errors.full_name && <div className="md:col-span-2 text-red-500 text-sm flex items-center gap-1 mt-1"><FaTimesCircle className="text-xs" />{errors.full_name}</div>}

          <label className="font-semibold md:text-right md:pr-2 flex items-center text-gray-700">ИНН *</label>
          <input type="text" name="inn" className="input w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" value={form.inn} onChange={handleChange} maxLength={14} placeholder="14 цифр" />
          {errors.inn && <div className="md:col-span-2 text-red-500 text-sm flex items-center gap-1 mt-1"><FaTimesCircle className="text-xs" />{errors.inn}</div>}

          <label className="font-semibold md:text-right md:pr-2 flex items-center text-gray-700">Телефон *</label>
          <PhoneInput
            country={'kg'}
            value={form.phone.replace('+', '')}
            onChange={handlePhoneChange}
            inputStyle={{ width: '100%' }}
            buttonClass="!bg-gray-100"
            containerClass="!w-full"
            placeholder="Введите номер телефона"
            enableSearch
          />
          {errors.phone && <div className="md:col-span-2 text-red-500 text-sm flex items-center gap-1 mt-1"><FaTimesCircle className="text-xs" />{errors.phone}</div>}

          <label className="font-semibold md:text-right md:pr-2 flex items-center text-gray-700">Статус</label>
          <select name="status" className="input w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" value={form.status} onChange={handleChange}>
            {GUEST_STATUSES.map(status => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>

          <label className="font-semibold md:text-right md:pr-2 flex items-center text-gray-700">Примечания</label>
          <textarea name="notes" className="input w-full md:col-span-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" rows={3} value={form.notes} onChange={handleChange} placeholder="Дополнительная информация о госте" />

          {errors.submit && <div className="md:col-span-2 text-red-500 text-sm mt-2 flex items-center gap-1"><FaTimesCircle className="text-xs" />{errors.submit}</div>}

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
              icon={loading ? undefined : <FaUser />}
            >
              {loading ? 'Сохранение...' : (initial ? 'Сохранить' : 'Добавить')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GuestModal; 