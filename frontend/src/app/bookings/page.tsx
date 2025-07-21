'use client';

import React, { useEffect, useState, useRef } from 'react';
import { FaPlus, FaEdit, FaTrash, FaFilter, FaFileCsv, FaList, FaCalendarAlt, FaStream, FaSpinner } from 'react-icons/fa';
import StatusBadge from '../../components/StatusBadge';
import Button from '../../components/Button';
import LoadingSpinner from '../../components/LoadingSpinner';
import ExportConfirmModal from '../../components/ExportConfirmModal';
import HighlightedText from '../../components/HighlightedText';
import { API_URL } from '../../shared/api';
import { useApi } from '../../shared/hooks/useApi';
import { useSearchParams } from 'next/navigation';
import ReactSelect from 'react-select';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ru } from 'date-fns/locale';
import { toZonedTime, format as formatTz } from 'date-fns-tz';
const TIMEZONE = 'Asia/Bishkek';
import BookingTable from './BookingTable';
import BookingCalendar from './BookingCalendar';
// Импортируем GuestModal и RoomModal
import GuestModal from '../../components/GuestModal';
import RoomModal, { Building } from '../../components/RoomModal';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch, setBookings, addBooking, updateBooking, removeBooking, setBookingsLoading, setBookingsError, setGuests, setRooms } from '../store';

// Типы данных
interface Room {
  id: number;
  number: string;
  room_class: string | { value: string; label: string };
  capacity: number; // добавлено поле вместимости
  price_per_night?: number;
  building?: { id: number; name: string };
}
interface Booking {
  id: number;
  room: Room;
  check_in: string;
  check_out: string;
  status: string;
  payment_status?: string;
  total_amount?: number;
  related_order?: string;
  guest?: Guest;
  people_count?: number;
  comments?: string;
}

interface Guest {
  id: number;
  full_name: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800 border-green-300',
  completed: 'bg-red-100 text-red-800 border-red-300',
  cancelled: 'bg-yellow-100 text-yellow-800 border-yellow-300',
};
const STATUS_LABELS: Record<string, string> = {
  active: 'Активный',
  completed: 'Завершён',
  cancelled: 'Отменён',
};

const TABS = [
  { key: 'all', label: 'Все' },
  { key: 'upcoming', label: 'Предстоящие' },
  { key: 'past', label: 'Прошедшие' },
];

const BOOKING_STATUSES = [
  { value: 'active', label: 'Активно' },
  { value: 'completed', label: 'Завершено' },
  { value: 'cancelled', label: 'Отменено' },
];

const PAYMENT_STATUSES = [
  { value: 'pending', label: 'В ожидании' },
  { value: 'paid', label: 'Оплачено' },
  { value: 'unpaid', label: 'Не оплачено' },
];

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Наличные' },
  { value: 'card', label: 'Карта' },
  { value: 'transfer', label: 'Перевод' },
];

interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  guests: Guest[];
  rooms: Room[];
  initial?: any;
}

function BookingModal({ open, onClose, onSave, guests, rooms, initial }: BookingModalProps) {
  const [form, setForm] = useState({
    payment_status: initial?.payment_status || 'pending',
    guest_id: initial?.guest?.id || initial?.guest_id || '',
    room_id: initial?.room?.id || initial?.room_id || '',
    check_in: initial?.check_in ? initial.check_in.slice(0, 10) : '',
    check_out: initial?.check_out ? initial.check_out.slice(0, 10) : '',
    people_count: initial?.people_count || 1,
    comments: initial?.comments || '',
    payment_method: initial?.payment_method || 'cash',
    price_per_night: initial?.price_per_night || 0,
    prepayment: initial?.prepayment || 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);
  const access = useSelector((state: RootState) => state.auth.access);

  // Добавляем состояние для времени заезда и выезда
  const [checkInTime, setCheckInTime] = useState(initial ? (initial.check_in ? toZonedTime(new Date(initial.check_in), TIMEZONE).toTimeString().slice(0,5) : '00:00') : '00:00');
  const [checkOutTime, setCheckOutTime] = useState(initial ? (initial.check_out ? toZonedTime(new Date(initial.check_out), TIMEZONE).toTimeString().slice(0,5) : '00:00') : '00:00');

  // Кастомный time picker (dropdown)
  const [showCheckInDropdown, setShowCheckInDropdown] = useState(false);
  const [showCheckOutDropdown, setShowCheckOutDropdown] = useState(false);

  // refs для scrollIntoView выбранного времени
  const checkInTimeRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const checkOutTimeRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Скроллим к выбранному времени при открытии dropdown
  useEffect(() => {
    if (showCheckInDropdown && checkInTimeRefs.current[checkInTime]) {
      checkInTimeRefs.current[checkInTime]?.scrollIntoView({ block: 'center' });
    }
  }, [showCheckInDropdown, checkInTime]);
  useEffect(() => {
    if (showCheckOutDropdown && checkOutTimeRefs.current[checkOutTime]) {
      checkOutTimeRefs.current[checkOutTime]?.scrollIntoView({ block: 'center' });
    }
  }, [showCheckOutDropdown, checkOutTime]);

  // При открытии модалки для редактирования заполняем все поля из initial
  useEffect(() => {
    if (open && initial) {
      // check_in/check_out приходят в UTC, преобразуем к Asia/Bishkek
      const checkInDate = initial.check_in ? toZonedTime(new Date(initial.check_in), TIMEZONE) : null;
      const checkOutDate = initial.check_out ? toZonedTime(new Date(initial.check_out), TIMEZONE) : null;
      setForm({
        payment_status: initial.payment_status || 'pending',
        guest_id: initial.guest?.id || initial.guest_id || '',
        room_id: initial.room?.id || initial.room_id || '',
        check_in: checkInDate ? formatTz(checkInDate, 'yyyy-MM-dd', { timeZone: TIMEZONE }) : '',
        check_out: checkOutDate ? formatTz(checkOutDate, 'yyyy-MM-dd', { timeZone: TIMEZONE }) : '',
        people_count: initial.people_count || 1,
        comments: initial.comments || '',
        payment_method: initial.payment_method || 'cash',
        price_per_night: initial.price_per_night || 0,
        prepayment: initial.prepayment || 0,
      });
      setCheckInTime(checkInDate ? formatTz(checkInDate, 'HH:mm', { timeZone: TIMEZONE }) : '00:00');
      setCheckOutTime(checkOutDate ? formatTz(checkOutDate, 'HH:mm', { timeZone: TIMEZONE }) : '00:00');
    }
    if (open && !initial) {
      setForm({
        payment_status: 'pending',
        guest_id: '',
        room_id: '',
        check_in: '',
        check_out: '',
        people_count: 1,
        comments: '',
        payment_method: 'cash',
        price_per_night: 0,
        prepayment: 0,
      });
      setCheckInTime('00:00');
      setCheckOutTime('00:00');
    }
  }, [open, initial]);

  useEffect(() => {
    if (open && modalRef.current) {
      modalRef.current.focus();
    }
  }, [open]);

  const [showPastDateConfirm, setShowPastDateConfirm] = useState(false);
  const checkInInputRef = useRef<HTMLInputElement>(null);
  const checkOutInputRef = useRef<HTMLInputElement>(null);

  const isPastDate = (dateStr: string, time: string) => {
    if (!dateStr) return false;
    const date = new Date(`${dateStr}T${time}`);
    return date < new Date();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    // Проверка на прошлое время
    if (isPastDate(form.check_in, checkInTime)) {
      setShowPastDateConfirm(true);
      return;
    }
    await doSubmit();
  };

  const doSubmit = async () => {
    setSaving(true);
    setError('');
    try {
      // Собираем дату и время в формат ISO (YYYY-MM-DDTHH:mm)
      const check_in = form.check_in && checkInTime
        ? new Date(toZonedTime(`${form.check_in}T${checkInTime}`, TIMEZONE)).toISOString()
        : '';
      const check_out = form.check_out && checkOutTime
        ? new Date(toZonedTime(`${form.check_out}T${checkOutTime}`, TIMEZONE)).toISOString()
        : '';
      let res;
      if (initial && initial.id) {
        res = await fetch(`${API_URL}/api/bookings/${initial.id}/`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${access}`,
          },
          body: JSON.stringify({
            payment_status: form.payment_status,
            guest_id: form.guest_id,
            room_id: form.room_id,
            check_in,
            check_out,
            people_count: form.people_count,
            comments: form.comments,
            payment_method: form.payment_method,
            price_per_night: form.price_per_night,
            prepayment: form.prepayment,
          }),
        });
      } else {
        res = await fetch(`${API_URL}/api/bookings/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${access}`,
          },
          body: JSON.stringify({
            payment_status: form.payment_status,
            guest_id: form.guest_id,
            room_id: form.room_id,
            check_in,
            check_out,
            people_count: form.people_count,
            comments: form.comments,
            payment_method: form.payment_method,
            price_per_night: form.price_per_night,
            prepayment: form.prepayment,
          }),
        });
      }
      if (res.ok) {
        onSave(form); // Для обновления списка
        onClose();
      } else {
        const errorData = await res.json();
        if (errorData.detail) {
          setError(`Ошибка: ${errorData.detail}`);
        } else if (errorData.non_field_errors) {
          setError(`Ошибка: ${errorData.non_field_errors.join(', ')}`);
        } else if (errorData.room_id) {
          setError(`Ошибка номера: ${errorData.room_id.join(', ')}`);
        } else if (errorData.check_in) {
          setError(`Ошибка даты заезда: ${errorData.check_in.join(', ')}`);
        } else if (errorData.check_out) {
          setError(`Ошибка даты выезда: ${errorData.check_out.join(', ')}`);
      } else {
        setError('Ошибка при сохранении. Проверьте данные.');
        }
      }
    } catch {
      setError('Ошибка сети.');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;
  // Список времени для выбора (шаг 15 минут)
  const timeOptions = Array.from({ length: 24 * 4 }, (_, i) => {
    const h = Math.floor(i / 4).toString().padStart(2, '0');
    const m = ((i % 4) * 15).toString().padStart(2, '0');
    return `${h}:${m}`;
  });
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [localGuests, setLocalGuests] = useState(guests);
  const [localRooms, setLocalRooms] = useState(rooms);

  // Получаем список зданий для RoomModal
  const buildings: Building[] = Array.from(
    new Map(
      rooms
        .map(r => r.building)
        .filter((b): b is Building => Boolean(b))
        .map(b => [b.id, b])
    ).values()
  );

  // После успешного добавления гостя
  const handleGuestAdded = (guest: Guest) => {
    setLocalGuests(prev => [...prev, guest]);
    setForm(f => ({ ...f, guest_id: guest.id }));
    setShowGuestModal(false);
    if (typeof window !== 'undefined' && (window as any).showToast) {
      (window as any).showToast({ type: 'success', title: 'Гость добавлен' });
    }
    setTimeout(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      if (checkInInputRef.current) checkInInputRef.current.focus();
    }, 200);
  };
  // После успешного добавления номера
  const handleRoomAdded = (room: Room) => {
    setLocalRooms(prev => [...prev, room]);
    setForm(f => ({ ...f, room_id: room.id }));
    setShowRoomModal(false);
    if (typeof window !== 'undefined' && (window as any).showToast) {
      (window as any).showToast({ type: 'success', title: 'Номер добавлен' });
    }
    setTimeout(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      if (checkInInputRef.current) checkInInputRef.current.focus();
    }, 200);
  };
  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in">
        <div ref={modalRef} tabIndex={-1} className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-xl relative animate-modal-in border border-gray-100 focus:outline-none">
          <h2 className="text-xl font-bold mb-6">{initial ? 'Редактировать' : 'Добавить'} бронирование</h2>
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none">×</button>
          <form className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4" onSubmit={handleSubmit}>
            <label className="font-semibold md:text-right md:pr-2 flex items-center">Гость:</label>
            <div className="flex gap-2 items-center">
              <select className="input w-full" value={form.guest_id} onChange={e => setForm(f => ({ ...f, guest_id: e.target.value }))} required>
                <option value="">Выберите гостя</option>
                {localGuests.map(g => <option key={g.id} value={g.id}>{g.full_name}</option>)}
              </select>
              <button type="button" className="text-blue-600 hover:text-blue-800 text-xl" title="Добавить гостя" onClick={() => setShowGuestModal(true)} disabled={showGuestModal || showRoomModal}>+</button>
            </div>

            <label className="font-semibold md:text-right md:pr-2 flex items-center">Количество гостей:</label>
            <input type="number" min={1} max={10} className="input w-full" value={form.people_count} onChange={e => setForm(f => ({ ...f, people_count: +e.target.value, room_id: '' }))} />

            <label className="font-semibold md:text-right md:pr-2 flex items-center">Номер:</label>
            <div className="flex gap-2 items-center">
              <select className="input w-full" value={form.room_id} onChange={e => setForm(f => ({ ...f, room_id: e.target.value }))} required>
                <option value="">Выберите номер</option>
                {localRooms.filter(r => r.capacity >= form.people_count).map(r => (
                  <option key={r.id} value={r.id}>
                    {r.number} • {r.building?.name || 'Неизвестное здание'} • Вместимость: {r.capacity}
                  </option>
                ))}
              </select>
              <button type="button" className="text-blue-600 hover:text-blue-800 text-xl" title="Добавить номер" onClick={() => setShowRoomModal(true)} disabled={showGuestModal || showRoomModal}>+</button>
            </div>

            <label className="font-semibold md:text-right md:pr-2 flex items-center">Дата заезда:</label>
            <div className="flex gap-2 relative">
              <DatePicker
                selected={form.check_in && checkInTime ? toZonedTime(new Date(`${form.check_in}T${checkInTime}`), TIMEZONE) : null}
                onChange={date => {
                  if (date) {
                    setForm(f => ({ ...f, check_in: formatTz(toZonedTime(date, TIMEZONE), 'yyyy-MM-dd', { timeZone: TIMEZONE }) }));
                  } else {
                    setForm(f => ({ ...f, check_in: '' }));
                  }
                }}
                dateFormat="dd.MM.yyyy"
                className="input w-36"
                placeholderText="дд.мм.гг"
                calendarClassName="shadow-xl"
                locale={ru}
                autoComplete="off"
                onKeyDown={e => e.preventDefault()}
                customInput={<input className="input w-36" readOnly placeholder="дд.мм.гггг" ref={checkInInputRef} />}
              />
              <div className="relative w-28">
                <button
                  type="button"
                  className="input w-full text-left"
                  onClick={() => setShowCheckInDropdown(v => !v)}
                >
                  {checkInTime}
                </button>
                {showCheckInDropdown && (
                  <div className="absolute z-50 bg-white border rounded shadow max-h-48 overflow-y-auto mt-1 w-full">
                    {timeOptions.map(t => (
                      <div
                        key={t}
                        ref={el => { checkInTimeRefs.current[t] = el; }}
                        className={`px-3 py-2 hover:bg-blue-100 cursor-pointer ${checkInTime === t ? 'bg-blue-50 font-bold' : ''}`}
                        onClick={() => { setCheckInTime(t); setShowCheckInDropdown(false); }}
                      >
                        {t}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <label className="font-semibold md:text-right md:pr-2 flex items-center">Дата выезда:</label>
            <div className="flex gap-2 relative">
              <DatePicker
                selected={form.check_out && checkOutTime ? toZonedTime(new Date(`${form.check_out}T${checkOutTime}`), TIMEZONE) : null}
                onChange={date => {
                  if (date) {
                    setForm(f => ({ ...f, check_out: formatTz(toZonedTime(date, TIMEZONE), 'yyyy-MM-dd', { timeZone: TIMEZONE }) }));
                  } else {
                    setForm(f => ({ ...f, check_out: '' }));
                  }
                }}
                dateFormat="dd.MM.yyyy"
                className="input w-36"
                placeholderText="дд.мм.гг"
                calendarClassName="shadow-xl"
                locale={ru}
                autoComplete="off"
                onKeyDown={e => e.preventDefault()}
                customInput={<input className="input w-36" readOnly placeholder="дд.мм.гггг" ref={checkOutInputRef} />}
              />
              <div className="relative w-28">
                <button
                  type="button"
                  className="input w-full text-left"
                  onClick={() => setShowCheckOutDropdown(v => !v)}
                >
                  {checkOutTime}
                </button>
                {showCheckOutDropdown && (
                  <div className="absolute z-50 bg-white border rounded shadow max-h-48 overflow-y-auto mt-1 w-full">
                    {timeOptions.map(t => (
                      <div
                        key={t}
                        ref={el => { checkOutTimeRefs.current[t] = el; }}
                        className={`px-3 py-2 hover:bg-blue-100 cursor-pointer ${checkOutTime === t ? 'bg-blue-50 font-bold' : ''}`}
                        onClick={() => { setCheckOutTime(t); setShowCheckOutDropdown(false); }}
                      >
                        {t}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Статус оплаты переносим сюда */}
            <label className="font-semibold md:text-right md:pr-2 flex items-center">Статус оплаты:</label>
            <select className="input w-full" value={form.payment_status} onChange={e => setForm(f => ({ ...f, payment_status: e.target.value }))}>
              {PAYMENT_STATUSES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>

            {/* Способ оплаты */}
            <label className="font-semibold md:text-right md:pr-2 flex items-center">Способ оплаты:</label>
            <select className="input w-full" value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}>
              {PAYMENT_METHODS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>

            {/* Расчет стоимости за период */}
            {form.check_in && form.check_out && form.room_id && (
              <>
                <label className="font-semibold md:text-right md:pr-2 flex items-center">Количество дней:</label>
                <div className="text-sm text-gray-600 flex items-center">
                  {Math.ceil((new Date(form.check_out).getTime() - new Date(form.check_in).getTime()) / (1000 * 60 * 60 * 24))} дней
                </div>

                <label className="font-semibold md:text-right md:pr-2 flex items-center">Стоимость за период:</label>
                <div className="text-sm font-semibold text-green-600 flex items-center">
                  {(() => {
                    const selectedRoom = localRooms.find(r => r.id === parseInt(form.room_id));
                    if (selectedRoom && form.check_in && form.check_out) {
                      const days = Math.ceil((new Date(form.check_out).getTime() - new Date(form.check_in).getTime()) / (1000 * 60 * 60 * 24));
                      const pricePerNight = selectedRoom.price_per_night || 0;
                      return Math.round(pricePerNight * days).toLocaleString() + ' сом';
                    }
                    return '—';
                  })()}
                </div>
              </>
            )}

            {/* Кнопки */}
            <div className="md:col-span-2 flex justify-end gap-3 mt-6">
              <button type="button" onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-5 py-2 rounded font-semibold">Отмена</button>
              <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-semibold shadow disabled:opacity-60 disabled:cursor-not-allowed">{saving ? 'Сохранение...' : 'Сохранить'}</button>
            </div>
            {error && <div className="md:col-span-2 text-red-500 text-sm mt-2 cursor-pointer" onClick={() => checkInInputRef.current?.focus()}>{error}</div>}
          </form>
        </div>
      </div>
      {/* Модалка подтверждения прошлой даты */}
      {showPastDateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-sm w-full">
            <div className="text-lg font-bold mb-4 text-yellow-700">Дата заезда в прошлом</div>
            <div className="mb-6 text-gray-700">Вы выбрали дату заезда в прошлом. Всё равно сохранить?</div>
            <div className="flex justify-end gap-3">
              <button className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300" onClick={() => setShowPastDateConfirm(false)}>Отмена</button>
              <button className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700" onClick={() => { setShowPastDateConfirm(false); doSubmit(); }}>Да, сохранить</button>
            </div>
          </div>
        </div>
      )}
      {/* Модалки добавления гостя и номера */}
      {showGuestModal && (
        <GuestModal
          open={showGuestModal}
          onClose={() => setShowGuestModal(false)}
          onSave={handleGuestAdded}
        />
      )}
      {showRoomModal && (
        <RoomModal
          open={showRoomModal}
          onClose={() => setShowRoomModal(false)}
          onSave={handleRoomAdded}
          buildings={buildings}
        />
      )}
    </>
  );
}

// Добавить функцию форматирования даты и времени
function formatDateTime(dt: string) {
  if (!dt) return '';
  const d = toZonedTime(new Date(dt), TIMEZONE);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${day}.${month}.${year}, ${hours}:${minutes}`;
}

// Функция для автоматического определения статуса бронирования
function getBookingStatus(booking: Booking): string {
  const now = new Date();
  const checkIn = new Date(booking.check_in);
  const checkOut = new Date(booking.check_out);
  
  if (now < checkIn) {
    return 'pending'; // Ожидает заезда
  } else if (now >= checkIn && now <= checkOut) {
    return 'active'; // Активно (гость в номере)
  } else {
    return 'completed'; // Завершено (гость выехал)
  }
}

// Toast-уведомления
function Toast({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) {
  return (
    <div className={`fixed top-6 right-6 z-[9999] px-6 py-4 rounded-lg shadow-lg text-white font-semibold animate-fade-in ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>{message}
      <button className="ml-4 text-white/80 hover:text-white text-lg font-bold" onClick={onClose}>×</button>
    </div>
  );
}

function TooltipOnClick({ content, children }: { content: string, children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);
  return (
    <div className="relative inline-block" ref={ref}>
      <span onClick={e => { e.stopPropagation(); setOpen(o => !o); }} className="cursor-pointer">
        {children}
      </span>
      {open && (
        <div className="absolute z-50 left-1/2 -translate-x-1/2 mt-2 px-4 py-2 bg-white border rounded shadow text-xs whitespace-pre-line min-w-[120px] max-w-xs">
          {content}
        </div>
      )}
    </div>
  );
}

export default function BookingsPage() {
  const { handleApiRequestWithAuth } = useApi();
  const searchParams = useSearchParams();
  const dispatch = useDispatch<AppDispatch>();
  const bookings = useSelector((state: RootState) => state.bookings.bookings);
  const guests = useSelector((state: RootState) => state.guests.guests);
  const rooms = useSelector((state: RootState) => state.rooms.rooms);
  const loading = useSelector((state: RootState) => state.bookings.loading);
  const access = useSelector((state: RootState) => state.auth.access);
  const [activeTab, setActiveTab] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editBooking, setEditBooking] = useState<Booking | null>(null);
  const [deleteBooking, setDeleteBooking] = useState<Booking | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    status: '',
    room_id: '',
    guest_id: '',
    people_count: '',
  });
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const toastTimeout = useRef<NodeJS.Timeout | null>(null);
  const [activeRow, setActiveRow] = useState<number | null>(null);
  const [view, setView] = useState<'list' | 'table' | 'calendar'>('list');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Загрузка данных через Redux
  const fetchAll = async () => {
    dispatch(setBookingsLoading(true));
    const [bookingsData, guestsData, roomsData] = await Promise.all([
      handleApiRequestWithAuth(`${API_URL}/api/bookings/`),
      handleApiRequestWithAuth(`${API_URL}/api/guests/`),
      handleApiRequestWithAuth(`${API_URL}/api/rooms/`),
    ]);
    dispatch(setBookings(Array.isArray(bookingsData) ? bookingsData : []));
    dispatch(setGuests(Array.isArray(guestsData) ? guestsData : []));
    dispatch(setRooms(Array.isArray(roomsData) ? roomsData : []));
    dispatch(setBookingsLoading(false));
  };

  // Пагинация
  const [currentPage, setCurrentPage] = useState(1);
  const bookingsPerPage = 9;
  const totalPages = Math.ceil(bookings.length / bookingsPerPage);
  const paginatedBookings = bookings.slice(
    (currentPage - 1) * bookingsPerPage,
    currentPage * bookingsPerPage
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      dispatch(setBookingsLoading(true));
      const token = access;
      if (!token) {
        window.location.href = '/login';
        return;
      }
      fetchAll();
    }
  }, [dispatch, access]);

  // Фильтрация по вкладкам и фильтрам
  const now = new Date();
  const filtered = bookings.filter(b => {
    // Вкладки
    if (activeTab === 'upcoming' && new Date(b.check_in) <= now) return false;
    if (activeTab === 'past' && new Date(b.check_out) >= now) return false;
    
    // Фильтр по статусу оплаты из URL
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment_status');
    const filterType = urlParams.get('filter');
    const bookingId = urlParams.get('bookingId');
    const roomNumber = urlParams.get('room');
    
    if (paymentStatus === 'pending' && filterType === 'unpaid' && b.payment_status === 'paid') return false;
    if (paymentStatus === 'paid' && b.payment_status !== 'paid') return false;
    
    // Фильтр по конкретному бронированию
    if (bookingId && b.id !== parseInt(bookingId)) return false;
    
    // Фильтр по номеру комнаты
    if (roomNumber && (typeof b.room === 'object' ? b.room.number : b.room) !== roomNumber) return false;
    
    // Фильтры
    if (filters.status && b.status !== filters.status) return false;
    if (filters.room_id && b.room && String(b.room.id) !== filters.room_id) return false;
    if (filters.guest_id && b.guest && String(b.guest.id) !== filters.guest_id) return false;
    if (filters.people_count && String(b.people_count) !== filters.people_count) return false;
    return true;
  });

  // Экспорт для текущего вида
  function exportToCSV() {
    setShowExportModal(true);
  }

  const handleExportConfirm = () => {
    setExportLoading(true);
    setTimeout(() => {
      if (view === 'calendar') {
        // Календарь: экспортируем список бронирований за месяц
        const csvRows = [
          ['ID', 'Тип номера', 'Номер', 'Заезд', 'Выезд', 'Гость', 'Статус', 'Оплачено'],
          ...filtered.map(b => [
            b.id,
            typeof b.room.room_class === 'object' ? b.room.room_class.label : b.room.room_class,
            b.room.number,
            formatDateTime(b.check_in),
            formatDateTime(b.check_out),
            b.guest?.full_name || '',
            STATUS_LABELS[b.status] || b.status,
            b.payment_status === 'paid' ? 'Да' : 'Нет'
          ])
        ];
        const csv = csvRows.map(row => row.map(String).map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `бронирования_календарь_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Классическая таблица: экспортируем список бронирований
        const csvRows = [
          ['ID', 'Тип номера', 'Номер', 'Заезд', 'Выезд', 'Гость', 'Статус', 'Оплачено', 'Сумма'],
          ...filtered.map(b => [
            b.id,
            typeof b.room.room_class === 'object' ? b.room.room_class.label : b.room.room_class,
            b.room.number,
            formatDateTime(b.check_in),
            formatDateTime(b.check_out),
            b.guest?.full_name || '',
            STATUS_LABELS[b.status] || b.status,
            b.payment_status === 'paid' ? 'Да' : 'Нет',
            b.total_amount ? Math.round(b.total_amount).toLocaleString() + ' сом' : '—'
          ])
        ];
        const csv = csvRows.map(row => row.map(String).map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `бронирования_список_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      setToast({ message: 'Экспорт завершён', type: 'success' });
      setExportLoading(false);
      setShowExportModal(false);
    }, 1000);
  };

  // Клик по гостю
  function handleGuestClick(guest: any) {
    if (guest && guest.id) {
      window.location.href = `/guests?guestId=${guest.id}`;
    }
  }
  function handleRoomClick(room: any) {
    alert(`Профиль номера: №${room.number}`);
  }

  // Валидация формы бронирования (минимальная)
  function validateBookingForm(form: any) {
    if (!form.guest_id) return 'Гость обязателен';
    if (!form.room_id) return 'Номер обязателен';
    if (!form.check_in) return 'Дата заезда обязательна';
    if (!form.check_out) return 'Дата выезда обязательна';
    if (!form.people_count || form.people_count < 1) return 'Количество гостей обязательно';
    return null;
  }

  // Фильтры: закрытие по клику вне
  const filterPanelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (showFilters && filterPanelRef.current && !filterPanelRef.current.contains(e.target as Node)) {
        setShowFilters(false);
      }
    }
    if (showFilters) {
      document.addEventListener('mousedown', handleClickOutside);
      } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilters]);

  return (
    <div className="bg-[#f7f8fa] p-0 flex flex-col w-full">
      {/* Верхняя панель */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 px-8 pt-8">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Бронирования</h1>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
          <button className="bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-semibold shadow flex items-center gap-2"
            onClick={() => setShowFilters(true)}>
            <FaFilter /> Фильтры
              </button>
          <button className="bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-semibold shadow flex items-center gap-2"
            onClick={exportToCSV}>
                <FaFileCsv /> Экспорт
              </button>
          <button className={`px-4 py-2 rounded-lg font-semibold shadow flex items-center gap-2 transition-all duration-200 ${view === 'list' ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg scale-105' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'}`}
            onClick={() => setView('list')}>
            <FaList /> Лист
              </button>
          <button className={`px-4 py-2 rounded-lg font-semibold shadow flex items-center gap-2 transition-all duration-200 ${view === 'table' ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg scale-105' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'}`}
            onClick={() => setView('table')}>
            <FaStream /> Таблица
              </button>
          <button className={`px-4 py-2 rounded-lg font-semibold shadow flex items-center gap-2 transition-all duration-200 ${view === 'calendar' ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg scale-105' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'}`}
            onClick={() => setView('calendar')}>
            <FaCalendarAlt /> Календарь
              </button>
            </div>
          </div>
      {/* Вкладки и кнопка Добавить */}
      <div className="flex gap-2 mb-4 px-8 items-center justify-between">
        <div className="flex gap-2 items-center">
          {TABS.map(tab => (
                  <button
              key={tab.key}
              className={`px-4 py-2 rounded-lg font-semibold border shadow-sm transition-all duration-200 ${activeTab === tab.key ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg scale-105' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300'}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
                    </div>
                      <Button
          onClick={() => setShowAddModal(true)}
                        icon={<FaPlus />}
                        className="shadow-lg hover:shadow-xl"
                      >
                        <span className="font-bold">Добавить</span>
                      </Button>
                    </div>
      {/* Основной контент: таймлайн или календарь */}
      <div className="w-full px-4 mb-8">
        {view === 'list' ? (
          // Компактная таблица (лист) прямо здесь
          <div className="rounded-xl shadow-lg bg-white w-full border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e0 #f7fafc' }}>
              <table className="w-full text-sm min-w-[1000px]">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-blue-50 text-gray-700 border-b border-gray-200">
                              <th className="p-3 text-left font-bold">ID</th>
            <th className="p-3 text-left font-bold">Тип номера</th>
            <th className="p-3 text-left font-bold">Номер</th>
            <th className="p-3 text-left font-bold">Заезд</th>
            <th className="p-3 text-left font-bold">Выезд</th>
            <th className="p-3 text-left font-bold">Гость</th>
            <th className="p-3 text-left font-bold">Статус</th>
            <th className="p-3 text-left font-bold">Оплачено</th>
            <th className="p-3 text-left font-bold">Цена</th>
            <th className="p-3 text-left font-bold">Действия</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <LoadingSpinner size="md" text="Загрузка бронирований..." />
                    </div>
                  </td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                        <FaCalendarAlt className="text-gray-400 text-2xl" />
                      </div>
                      <p className="text-gray-500 font-medium">Нет бронирований</p>
                      <p className="text-gray-400 text-sm">Попробуйте изменить фильтры или добавить новое бронирование</p>
                    </div>
                  </td></tr>
                ) : (
                  filtered.map((b, idx) => {
                    const urlParams = new URLSearchParams(window.location.search);
                    const bookingId = urlParams.get('bookingId');
                    const isHighlighted = bookingId && b.id === parseInt(bookingId);
                    
                    return (
                      <tr key={b.id} className={`transition-all duration-200 border-b border-gray-100 last:border-b-0 ${idx % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'} hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 group cursor-pointer ${isHighlighted ? 'bg-yellow-100 animate-pulse' : ''}`} onClick={() => setActiveRow(b.id)}>
                      <td className="p-3 font-mono text-xs text-gray-500 min-w-0 truncate">{idx + 1}</td>
                      <td className="p-3 min-w-0 truncate">
                        {typeof b.room.room_class === 'object' && b.room.room_class !== null
                          ? b.room.room_class.label
                          : b.room.room_class === 'standard'
                            ? 'Стандарт'
                            : b.room.room_class === 'semi_lux'
                              ? 'Полу-люкс'
                              : b.room.room_class === 'lux'
                                ? 'Люкс'
                                : b.room.room_class}
                      </td>
                      <td className="p-3 min-w-0 truncate">{b.room.number}</td>
                      <td className="p-3 min-w-0 truncate">{formatDateTime(b.check_in)}</td>
                      <td className="p-3 min-w-0 truncate">{formatDateTime(b.check_out)}</td>
                      <td className="p-3 min-w-0 truncate">
                      <HighlightedText 
                        text={b.guest?.full_name || '—'} 
                        searchQuery={filters.search} 
                        className="" 
                      />
                    </td>
                      <td className="p-3 min-w-0 truncate"><StatusBadge status={getBookingStatus(b)} size="sm" /></td>
                      <td className="p-3 min-w-0 truncate">
                        <StatusBadge status={b.payment_status || 'pending'} size="sm" />
                      </td>
                      <td className="p-3 min-w-0 truncate font-mono">
                        {b.total_amount ? `${Math.round(b.total_amount).toLocaleString()} сом` : '—'}
                      </td>
                      <td className="p-3 min-w-0 truncate">
                        <div className="flex gap-2">
                          <button onClick={e => { e.stopPropagation(); setEditBooking(b); }} className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded-lg font-semibold flex items-center gap-1 text-xs transition-all duration-200 hover:scale-105 shadow-sm">Ред.</button>
                          <button onClick={e => { e.stopPropagation(); setDeleteBooking(b); }} className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded-lg font-semibold flex items-center gap-1 text-xs transition-all duration-200 hover:scale-105 shadow-sm">Удалить</button>
                        </div>
                      </td>
                    </tr>
                  );
                })
                )}
              </tbody>
            </table>
            </div>
          </div>
        ) : view === 'table' ? (
          <BookingTable bookings={filtered} rooms={rooms} startDate={new Date(now.getFullYear(), now.getMonth(), 1)} endDate={new Date(now.getFullYear(), now.getMonth() + 1, 0)} />
        ) : (
          <BookingCalendar bookings={filtered} year={now.getFullYear()} month={now.getMonth()} />
        )}
                            </div>
      {/* Модалка добавления */}
      {showAddModal && (
        <BookingModal
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSave={async () => { await fetchAll(); }}
          guests={guests}
          rooms={rooms}
        />
      )}
      {/* Модалка редактирования */}
      {editBooking && (
        <BookingModal
          open={!!editBooking}
          onClose={() => setEditBooking(null)}
          onSave={async () => { setEditBooking(null); await fetchAll(); }}
          guests={guests}
          rooms={rooms}
          initial={editBooking}
        />
      )}
      {/* Модалка подтверждения удаления */}
      {deleteBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative border border-gray-100 animate-scale-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <FaTrash className="text-red-600 text-xl" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Удалить бронирование?</h2>
            </div>
            <p className="mb-6 text-gray-600">Вы уверены, что хотите удалить бронирование <b>№{deleteBooking.id}</b>? Это действие нельзя отменить.</p>
            <div className="flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setDeleteBooking(null)}
                className="hover:bg-gray-100"
              >
                Отмена
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  setDeleting(true);
                  await fetch(`${API_URL}/api/bookings/${deleteBooking.id}/`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${access}` },
                  });
                  setDeleting(false);
                  setDeleteBooking(null);
                  await fetchAll();
                }}
                loading={deleting}
                disabled={deleting}
              >
                {deleting ? 'Удаление...' : 'Удалить'}
              </Button>
            </div>
          </div>
            </div>
          )}
      {/* Выдвижная панель фильтров */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-xs bg-white shadow-2xl z-50 transition-transform duration-300 ${showFilters ? 'translate-x-0' : 'translate-x-full'}`} style={{minWidth: 320}} ref={filterPanelRef}>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold">Фильтры</h2>
          <button onClick={() => setShowFilters(false)} className="text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none">×</button>
                    </div>
        <div className="p-4 flex flex-col gap-4">
          <label className="font-semibold">Статус</label>
          <select className="input w-full" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
            <option value="">Все</option>
            {BOOKING_STATUSES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>

          <label className="font-semibold">Номер</label>
          <ReactSelect
            options={rooms.map(r => ({ value: String(r.id), label: r.number }))}
            value={rooms.find(r => String(r.id) === filters.room_id) ? { value: filters.room_id, label: rooms.find(r => String(r.id) === filters.room_id)!.number } : null}
            onChange={opt => setFilters(f => ({ ...f, room_id: opt ? opt.value : '' }))}
            isClearable
            placeholder="Все"
          />

          <label className="font-semibold">Гость</label>
          <ReactSelect
            options={guests.map(g => ({ value: String(g.id), label: g.full_name }))}
            value={guests.find(g => String(g.id) === filters.guest_id) ? { value: filters.guest_id, label: guests.find(g => String(g.id) === filters.guest_id)!.full_name } : null}
            onChange={opt => setFilters(f => ({ ...f, guest_id: opt ? opt.value : '' }))}
            isClearable
            placeholder="Все"
          />

          <label className="font-semibold">Количество гостей</label>
          <input type="number" min={1} max={10} className="input w-full" value={filters.people_count} onChange={e => setFilters(f => ({ ...f, people_count: e.target.value }))} placeholder="Любое" />

          <div className="flex gap-2 mt-4">
            <button type="button" onClick={() => setFilters({ search: '', status: '', room_id: '', guest_id: '', people_count: '' })} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-5 py-2 rounded font-semibold flex-1">Сбросить</button>
            <button type="button" onClick={() => setShowFilters(false)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-semibold shadow flex-1">Применить</button>
                </div>
              </div>
            </div>
      {/* Стили для скрытия курсора в readonly input */}
      <style jsx global>{`
        input[readonly] {
          caret-color: transparent;
        }
      `}</style>
      
      {/* Модальное окно подтверждения экспорта */}
      <ExportConfirmModal
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        onConfirm={handleExportConfirm}
        title="Экспорт бронирований"
        description={`Экспорт ${filtered.length} бронирований в CSV файл`}
        fileName={`бронирования_${view === 'calendar' ? 'календарь' : 'список'}_${new Date().toISOString().split('T')[0]}.csv`}
        loading={exportLoading}
      />
      
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
