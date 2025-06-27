"use client";

import React, { useEffect, useState, useRef } from "react";
import { FaBed, FaUserFriends, FaCalendarCheck, FaUsers, FaHistory, FaUserEdit, FaTrash, FaPlus, FaEnvelope, FaSms } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { API_URL } from '../shared/api';
import RoomsPage from './rooms/page';
import GuestsPage from './guests/page';
import BookingsPage from './bookings/page';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

const ROOM_CLASS_LABELS: Record<string, string> = {
  standard: "Стандарт",
  semi_lux: "Полу-люкс",
  lux: "Люкс",
};
const ROOM_CLASS_COLORS: Record<string, string> = {
  standard: "text-gray-500",
  semi_lux: "text-yellow-500",
  lux: "text-purple-600",
};

function AddRoomModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#1a1a1a]/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl p-0 w-full max-w-xl relative animate-modal-in border border-gray-100">
        <div className="flex flex-col items-center pt-8 pb-2 px-8">
          <h2 className="text-2xl font-bold mb-6">Добавить номер</h2>
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none" aria-label="Закрыть">×</button>
          <div>Заглушка формы добавления номера</div>
        </div>
      </div>
    </div>
  );
}

function AddGuestModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#1a1a1a]/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl p-0 w-full max-w-xl relative animate-modal-in border border-gray-100">
        <div className="flex flex-col items-center pt-8 pb-2 px-8">
          <h2 className="text-2xl font-bold mb-6">Добавить гостя</h2>
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none" aria-label="Закрыть">×</button>
          <div>Заглушка формы добавления гостя</div>
        </div>
      </div>
    </div>
  );
}

function AddBookingModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#1a1a1a]/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl p-0 w-full max-w-xl relative animate-modal-in border border-gray-100">
        <div className="flex flex-col items-center pt-8 pb-2 px-8">
          <h2 className="text-2xl font-bold mb-6">Добавить бронирование</h2>
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none" aria-label="Закрыть">×</button>
          <div>Заглушка формы добавления бронирования</div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [guests, setGuests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [showBookings, setShowBookings] = useState(false);
  const cardsScrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [showAddGuestModal, setShowAddGuestModal] = useState(false);
  const [showAddBookingModal, setShowAddBookingModal] = useState(false);
  const [showArrivals, setShowArrivals] = useState(false);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [openAccordion, setOpenAccordion] = useState<'arrivals' | 'bookings' | 'log' | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token) {
      window.location.href = "/login";
      return;
    }
    setLoading(true);
    Promise.all([
      fetch(`${API_URL}/api/rooms/`, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json()),
      fetch(`${API_URL}/api/bookings/`, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json()),
      fetch(`${API_URL}/api/guests/`, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json()),
    ])
      .then(([roomsData, bookingsData, guestsData]) => {
        setRooms(roomsData);
        setBookings(bookingsData);
        setGuests(guestsData);
        setLoading(false);
        setApiError('');
      })
      .catch(() => {
        setApiError('Ошибка загрузки данных с сервера. Проверьте соединение или попробуйте позже.');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token) return;
    fetch(`${API_URL}/api/auditlog/?limit=10`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setAuditLog(Array.isArray(data) ? data : data.results || []));
  }, []);

  // Гарантируем, что rooms, bookings, guests — массивы
  const roomsArray = Array.isArray(rooms) ? rooms : ((rooms as any)?.results || []);
  const bookingsArray = Array.isArray(bookings) ? bookings : ((bookings as any)?.results || []);
  const guestsArray = Array.isArray(guests) ? guests : ((guests as any)?.results || []);

  // Корректное определение сегодняшней даты без времени
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);

  // Корректный фильтр активных бронирований (учитываем оба варианта полей)
  const activeBookings = bookingsArray.filter((b: any) => {
    const from = new Date(b.date_from || b.check_in);
    const to = new Date(b.date_to || b.check_out);
    from.setHours(0, 0, 0, 0);
    to.setHours(0, 0, 0, 0);
    return from <= today && to >= today;
  });
  const busyRooms = Array.from(new Set(activeBookings.map((b: any) => b.room.id)));
  const freeRooms = roomsArray.length - busyRooms.length;

  // Группировка по корпусам
  const roomsByBuilding = roomsArray.reduce((acc: any, room: any) => {
    let building = '-';
    if (room.building) {
      if (typeof room.building === 'object' && room.building.name) building = room.building.name;
      else if (typeof room.building === 'string') building = room.building;
      else if (typeof room.building === 'number') building = room.building?.toString() || '-';
    }
    if (!acc[building]) acc[building] = 0;
    acc[building]++;
    return acc;
  }, {});

  // Последние бронирования
  const lastBookings = bookingsArray.slice(-5).reverse();

  // Пагинация для последних бронирований
  const [bookingsPage, setBookingsPage] = useState(1);
  const bookingsPerPage = 7;
  const totalBookingsPages = Math.ceil(lastBookings.length / bookingsPerPage);
  const paginatedLastBookings = lastBookings.slice((bookingsPage - 1) * bookingsPerPage, bookingsPage * bookingsPerPage);

  // Корректное определение статуса для карточки номера
  const getRoomStatus = (room: any, bookings: any[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isRepair = room.status === 'repair';
    if (isRepair) return { label: 'Ремонт', color: 'bg-yellow-400', text: 'text-yellow-600' };
    const hasActive = bookings.some((b: any) => {
      if (b.room.id !== room.id) return false;
      const from = new Date(b.date_from || b.check_in);
      const to = new Date(b.date_to || b.check_out);
      from.setHours(0, 0, 0, 0);
      to.setHours(0, 0, 0, 0);
      return from <= today && to >= today;
    });
    if (hasActive) return { label: 'Занят', color: 'bg-red-500', text: 'text-red-600' };
    return { label: 'Свободен', color: 'bg-green-500', text: 'text-green-600' };
  };

  // Визуализация номеров: карточки
  const renderRoomCards = () => (
    <div className="bg-white rounded-lg shadow p-4 mb-4 w-full max-w-[100%]">
      <div className="flex items-center mb-2 gap-2">
        <h3 className="text-lg font-semibold">Список номеров</h3>
        <button
          onClick={() => setShowAddRoomModal(true)}
          className="ml-2 flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded shadow text-sm"
          title="Добавить номер"
        >
          <FaPlus />
        </button>
        <span className="ml-2 text-xs text-gray-400 flex items-center gap-1">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="#a3a3a3" strokeWidth="2"/><text x="12" y="16" textAnchor="middle" fontSize="12" fill="#a3a3a3">i</text></svg>
          Используйте колесико мыши для горизонтального скролла
        </span>
      </div>
      <div
        ref={cardsScrollRef}
        className="flex gap-3 overflow-x-auto pb-3 px-1 items-end scrollbar-hide select-none"
        style={{ WebkitOverflowScrolling: 'touch' }}
        onWheel={e => {
          if (cardsScrollRef.current && e.currentTarget.matches(':hover')) {
            if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
              cardsScrollRef.current.scrollLeft += e.deltaY;
              e.preventDefault();
            }
          }
        }}
      >
        {roomsArray.map((room: any) => {
          const status = getRoomStatus(room, bookingsArray);
          return (
            <div
              key={room.id}
              className="flex flex-col items-center w-40 h-32 bg-white rounded-xl shadow border border-gray-100 hover:shadow-lg hover:scale-105 transition-all duration-200 cursor-pointer p-3"
              style={{ minWidth: 160, maxWidth: 180 }}
              onClick={() => router.push(`/rooms?number=${room.number}`)}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`inline-block w-3 h-3 rounded-full ${status.color}`}></span>
                <span className={`text-xs font-semibold ${status.text}`}>{status.label}</span>
              </div>
              <div className="text-lg font-extrabold mb-0.5 text-gray-900 tracking-wide">{room.number}</div>
              <div className="text-xs text-gray-400 mb-0.5 truncate w-full text-center">{room.building?.name || '-'}</div>
              <div className="text-xs text-gray-500 mb-0.5 truncate w-full text-center">{room.room_class?.label || '-'}</div>
              <div className="text-xs text-gray-400 w-full text-center">Вместимость: {room.capacity || '-'}</div>
            </div>
          );
        })}
      </div>
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );

  // Визуализация последних бронирований (аккордеон с анимацией и подсказкой)
  const renderBookingsAccordion = () => (
    <div className="bg-white rounded-lg shadow p-4 mb-4 w-full max-w-[100%]">
      <div
        className="flex items-center justify-between cursor-pointer select-none mb-2"
        onClick={() => setOpenAccordion(openAccordion === 'bookings' ? null : 'bookings')}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Последние бронирования</h3>
          <span className="ml-2 text-xs text-gray-400 flex items-center gap-1">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="#a3a3a3" strokeWidth="2"/><text x="12" y="16" textAnchor="middle" fontSize="12" fill="#a3a3a3">i</text></svg>
            Последние бронирования по времени
          </span>
        </div>
        <span className={`text-xl transition-transform duration-300 ${openAccordion === 'bookings' ? 'rotate-90' : ''}`}>&#9654;</span>
      </div>
      <div
        className={`transition-all duration-300 overflow-hidden ${openAccordion === 'bookings' ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}
        style={{ willChange: 'max-height, opacity' }}
      >
        {lastBookings.length === 0 ? (
          <div className="text-gray-400 p-3">Нет данных</div>
        ) : (
          <>
            <div className="overflow-x-auto max-w-full">
              <table className="min-w-full bg-white rounded-lg">
                <thead>
                  <tr className="bg-gray-50 text-gray-700">
                    <th className="p-3 text-left">Комната</th>
                    <th className="p-3 text-left">Гость</th>
                    <th className="p-3 text-left">Дата заезда</th>
                    <th className="p-3 text-left">Дата выезда</th>
                    <th className="p-3 text-left">Корпус</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLastBookings.map((b: any) => (
                    <tr key={b.id} className="hover:bg-blue-50 transition-all">
                      <td className="p-3">{b.room?.number || '-'}</td>
                      <td className="p-3">{b.guest?.full_name || '-'}</td>
                      <td className="p-3">{b.date_from || b.check_in || '-'}</td>
                      <td className="p-3">{b.date_to || b.check_out || '-'}</td>
                      <td className="p-3">{b.room?.building?.name || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Пагинация */}
            {totalBookingsPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-4">
                <button
                  className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50"
                  onClick={() => setBookingsPage(p => Math.max(1, p - 1))}
                  disabled={bookingsPage === 1}
                >
                  Назад
                </button>
                <span className="text-sm text-gray-500">Страница {bookingsPage} из {totalBookingsPages}</span>
                <button
                  className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50"
                  onClick={() => setBookingsPage(p => Math.min(totalBookingsPages, p + 1))}
                  disabled={bookingsPage === totalBookingsPages}
                >
                  Вперёд
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  // Динамический расчёт мест по классам номеров:
  const placesByClass = roomsArray.reduce((acc: any, room: any) => {
    const capacity = room.capacity || 1;
    if (!acc[room.room_class]) {
      acc[room.room_class] = 0;
    }
    acc[room.room_class] += capacity;
    return acc;
  }, {});

  // Карточки отчётов (кликабельные)
  const stats = [
    {
      label: <span className="flex items-center gap-1">Всего номеров <span title="Общее количество всех номеров пансионата" className="text-gray-400 cursor-help">?</span></span>,
      value: roomsArray.length,
      icon: <FaBed className="text-blue-600 text-xl mb-1" />,
      onClick: () => router.push('/rooms'),
    },
    {
      label: <span className="flex items-center gap-1">Активных бронирований <span title="Бронирования, действующие на текущую дату" className="text-gray-400 cursor-help">?</span></span>,
      value: activeBookings.length,
      icon: <FaCalendarCheck className="text-green-600 text-xl mb-1" />,
      onClick: () => router.push('/bookings'),
    },
    {
      label: <span className="flex items-center gap-1">Гостей <span title="Общее количество гостей в базе" className="text-gray-400 cursor-help">?</span></span>,
      value: guestsArray.length,
      icon: <FaUsers className="text-purple-600 text-xl mb-1" />,
      onClick: () => router.push('/guests'),
    },
    {
      label: <span className="flex items-center gap-1">Занятых номеров <span title="Количество номеров, занятых хотя бы одним активным бронированием сегодня" className="text-gray-400 cursor-help">?</span></span>,
      value: busyRooms.length,
      icon: <FaBed className="text-red-600 text-xl mb-1" />,
      onClick: () => router.push('/rooms'),
      extra: <span className="text-green-600 text-xs font-semibold mt-1">Свободно: {roomsArray.length - busyRooms.length}</span>,
    },
    {
      label: <span className="flex items-center gap-1">Обновлено <span title="Время последнего обновления данных" className="text-gray-400 cursor-help">?</span></span>,
      value: <span className="text-xs text-gray-500">{new Date().toLocaleString()}</span>,
      icon: <span className="text-xs text-gray-400">⏱</span>,
      onClick: undefined,
    },
  ];

  // Вместо блока 'Номера по корпусам':
  // 1. Считаем статистику за сегодня
  const todayArrivals = bookingsArray.filter((b: any) => (b.check_in || b.date_from)?.slice(0, 10) === todayStr);
  const todayDepartures = bookingsArray.filter((b: any) => (b.check_out || b.date_to)?.slice(0, 10) === todayStr);
  const todayGuests = todayArrivals.reduce((acc: number, b: any) => acc + (b.people_count || 1), 0);
  // 2. Список ближайших заездов/выездов (сегодня и завтра)
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);
  const upcoming = bookingsArray.filter((b: any) => {
    const inDate = (b.check_in || b.date_from)?.slice(0, 10);
    const outDate = (b.check_out || b.date_to)?.slice(0, 10);
    return [todayStr, tomorrowStr].includes(inDate) || [todayStr, tomorrowStr].includes(outDate);
  }).sort((a: any, b: any) => {
    const aDate = new Date(a.check_in || a.date_from);
    const bDate = new Date(b.check_in || b.date_from);
    return aDate.getTime() - bDate.getTime();
  });

  // Формат даты и времени: ЧЧ:ММ ДД.MM.YYYY
  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm} ${d.toLocaleDateString('ru-RU')}`;
  };

  // График загрузки и круговая диаграмма
  const getOccupancyChartData = (bookings: any[], rooms: any[]) => {
    const occupancyData = {
      occupied: 0,
      free: 0,
    };
    rooms.forEach((room: any) => {
      const status = getRoomStatus(room, bookings);
      if (status.label === 'Занят') {
        occupancyData.occupied++;
      } else if (status.label === 'Свободен') {
        occupancyData.free++;
      }
    });
    return [
      { date: 'Сегодня', occupied: occupancyData.occupied, free: occupancyData.free },
      { date: 'Завтра', occupied: 0, free: 0 },
    ];
  };

  const getRoomStatusPieData = (rooms: any[], bookings: any[]) => {
    const statusData = {
      free: 0,
      occupied: 0,
      repair: 0,
    };
    rooms.forEach((room: any) => {
      const status = getRoomStatus(room, bookings);
      if (status.label === 'Свободен') {
        statusData.free++;
      } else if (status.label === 'Занят') {
        statusData.occupied++;
      } else if (status.label === 'Ремонт') {
        statusData.repair++;
      }
    });
    return [
      { name: 'Свободен', value: statusData.free },
      { name: 'Занят', value: statusData.occupied },
      { name: 'Ремонт', value: statusData.repair },
    ];
  };

  return (
    <div className="max-w-[1400px] mx-auto">
      {loading ? (
        <div className="text-center text-gray-500">Загрузка...</div>
      ) : apiError ? (
        <div className="text-center text-red-500 font-semibold p-4">{apiError}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            {stats.map((stat, i) => (
              <div
                key={i}
                className={`bg-white rounded-lg shadow p-3 flex flex-col items-center gap-1 min-w-[90px] cursor-pointer hover:bg-blue-50 transition ${stat.onClick ? 'hover:shadow-lg active:scale-95' : ''}`}
                onClick={stat.onClick}
              >
                {stat.icon}
                <div className="text-lg font-bold leading-none">{stat.value}</div>
                <div className="text-xs text-gray-500">{stat.label}</div>
                {stat.extra}
              </div>
            ))}
          </div>
          {/* Новый блок статистики и ближайших заездов/выездов (аккордеон) */}
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
              <h3 className="text-lg font-semibold">Ближайшие заезды и выезды / Статистика</h3>
            </div>
            <div className="flex gap-4">
              <div
                className="flex-1 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 rounded-lg p-3 transition-all"
                onClick={() => router.push(`/bookings?date_from=${todayStr}`)}
                title="Показать все заезды на сегодня"
              >
                <span className="text-xs text-gray-500">Заездов сегодня</span>
                <span className="text-2xl font-bold text-blue-600">{todayArrivals.length}</span>
              </div>
              <div
                className="flex-1 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 rounded-lg p-3 transition-all"
                onClick={() => router.push(`/guests?arrivals=${todayStr}`)}
                title="Показать гостей, заезжающих сегодня"
              >
                <span className="text-xs text-gray-500">Гости</span>
                <span className="text-2xl font-bold text-purple-600">{todayGuests}</span>
              </div>
            </div>
          </div>
          {/* Новый блок статистики и ближайших заездов/выездов (аккордеон) */}
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <div className="flex items-center justify-between cursor-pointer select-none mb-2" onClick={() => setOpenAccordion(openAccordion === 'arrivals' ? null : 'arrivals')}>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">Ближайшие заезды и выезды / Статистика</h3>
              </div>
              <span className={`text-xl transition-transform duration-300 ${openAccordion === 'arrivals' ? 'rotate-90' : ''}`}>&#9654;</span>
            </div>
            <div className="flex flex-wrap gap-6 mb-4">
              <div className="flex flex-col items-center">
                <span className="text-xs text-gray-500">Заездов сегодня</span>
                <span className="text-xl font-bold text-blue-600">{todayArrivals.length}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs text-gray-500">Выездов сегодня</span>
                <span className="text-xl font-bold text-green-600">{todayDepartures.length}</span>
                  </div>
              <div className="flex flex-col items-center">
                <span className="text-xs text-gray-500">Гости</span>
                <span className="text-xl font-bold text-purple-600">{todayGuests}</span>
              </div>
          </div>
            <div className={`transition-all duration-300 overflow-hidden ${openAccordion === 'arrivals' ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`} style={{ willChange: 'max-height, opacity' }}>
              <h4 className="font-semibold mb-2 text-sm text-gray-700">Ближайшие заезды/выезды (сегодня и завтра)</h4>
              {upcoming.length === 0 ? (
                <div className="text-gray-400 p-3">Нет заездов или выездов на ближайшие дни</div>
            ) : (
              <div className="overflow-x-auto max-w-full">
                <table className="min-w-full bg-white rounded-lg">
                  <thead>
                      <tr className="bg-gray-50 text-gray-700 text-xs">
                        <th className="p-2 text-left">Гость</th>
                        <th className="p-2 text-left">Номер</th>
                        <th className="p-2 text-left">Корпус</th>
                        <th className="p-2 text-left">Дата</th>
                        <th className="p-2 text-left">Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                      {upcoming.map((b: any) => {
                        const inDate = (b.check_in || b.date_from);
                        const outDate = (b.check_out || b.date_to);
                        const inDateShort = inDate?.slice(0, 10);
                        const outDateShort = outDate?.slice(0, 10);
                        const isArrival = inDateShort === todayStr || inDateShort === tomorrowStr;
                        const isDeparture = outDateShort === todayStr || outDateShort === tomorrowStr;
                        return (
                      <tr key={b.id} className="hover:bg-blue-50 transition-all">
                            <td className="p-2">{b.guest?.full_name || '-'}</td>
                            <td className="p-2">{b.room?.number || '-'}</td>
                            <td className="p-2">{b.room?.building?.name || '-'}</td>
                            <td className="p-2">{isArrival ? formatDateTime(inDate) : formatDateTime(outDate)}</td>
                            <td className="p-2">
                              {isArrival && <span className="inline-block px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs font-semibold mr-1">Заезд</span>}
                              {isDeparture && <span className="inline-block px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-semibold">Выезд</span>}
                            </td>
                      </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          </div>
          {/* Последние бронирования (аккордеон) */}
          {renderBookingsAccordion()}
          {showAddRoomModal && <AddRoomModal onClose={() => setShowAddRoomModal(false)} />}
          {showAddGuestModal && <AddGuestModal onClose={() => setShowAddGuestModal(false)} />}
          {showAddBookingModal && <AddBookingModal onClose={() => setShowAddBookingModal(false)} />}
          {/* Лог последних действий (accordion) */}
          <div className="bg-white rounded-xl shadow-lg p-4 mb-8">
            <div className="flex items-center justify-between cursor-pointer select-none mb-2" onClick={() => setOpenAccordion(openAccordion === 'log' ? null : 'log')}>
              <h3 className="text-lg font-semibold">Лог последних действий</h3>
              <span className={`text-xl transition-transform duration-300 ${openAccordion === 'log' ? 'rotate-90' : ''}`}>&#9654;</span>
            </div>
            <div className={`transition-all duration-300 overflow-hidden ${openAccordion === 'log' ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`} style={{ willChange: 'max-height, opacity' }}>
              {auditLog.length === 0 ? (
                <div className="text-gray-400">Нет данных</div>
              ) : (
                <div className="overflow-x-auto max-w-full">
                  <ul className="divide-y divide-gray-100">
                    {auditLog.slice(0, 10).map((log, idx) => (
                      <li key={log.id || idx} className="py-2 flex items-center gap-3">
                        <span className="text-gray-400 text-xs w-24">{new Date(log.timestamp).toLocaleString()}</span>
                        <span className="text-blue-600 text-lg">
                          {log.action === 'Создание' && <FaPlus />}
                          {log.action === 'Изменение' && <FaUserEdit />}
                          {log.action === 'Удаление' && <FaTrash />}
                          {log.action === 'Отправка сообщения' && (log.details?.includes('SMS') ? <FaSms /> : <FaEnvelope />)}
                          {log.object_type === 'Booking' && <FaCalendarCheck />}
                          {log.object_type === 'Room' && <FaBed />}
                        </span>
                        <span className="font-semibold text-gray-700">{log.action}</span>
                        <span className="text-gray-500 text-xs">{log.object_type} #{log.object_id}</span>
                        <span className="text-gray-400 text-xs truncate max-w-xs">{log.details}</span>
                        <span className="text-xs text-gray-500 ml-auto">{log.user || '-'}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
