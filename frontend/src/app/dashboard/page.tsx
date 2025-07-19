"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { FaBed, FaUser, FaCalendarCheck, FaChartBar, FaBuilding, FaMoneyBillWave, FaUsers, FaPlus, FaFileCsv, FaUsersCog, FaRegSmile, FaTrash } from "react-icons/fa";
import { API_URL } from "../../shared/api";
import { useRef } from "react";
import { Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface DashboardStats {
  freeRooms: number;
  totalBookings: number;
  todayCheckouts: number;
  pendingPayments: number;
  totalGuests: number;
  revenueToday: number;
}

interface Booking {
  id: number;
  guest: { full_name: string };
  room: { number: string; room_class: string };
  check_in: string;
  check_out: string;
  status: string;
  people_count: number;
  price_per_night?: number;
  payment_status?: string;
  payment_type?: string;
  total_amount?: number;
}

interface Guest {
  id: number;
  full_name: string;
  phone?: string;
  inn?: string;
  status: string;
  total_spent?: string;
}

interface Room {
  id: number;
  number: string;
  room_class: string;
  price_per_night: number;
  status: string;
  building: { name: string };
  capacity?: number;
}

export default function DashboardPage() {
  const [openRooms, setOpenRooms] = useState(false);
  const [openBookings, setOpenBookings] = useState(false);
  const [openGuests, setOpenGuests] = useState(false);
  const [openStats, setOpenStats] = useState(false);
  const [openData, setOpenData] = useState(false);

  const [stats, setStats] = useState<DashboardStats>({
    freeRooms: 0,
    totalBookings: 0,
    todayCheckouts: 0,
    pendingPayments: 0,
    totalGuests: 0,
    revenueToday: 0,
  });
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [recentGuests, setRecentGuests] = useState<Guest[]>([]);
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [allRoomsCount, setAllRoomsCount] = useState(0);
  const [paidToday, setPaidToday] = useState(0);
  const [roomStats, setRoomStats] = useState({ free: 0, busy: 0, repair: 0 });

  const [userName, setUserName] = useState('Пользователь');
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const parsed = JSON.parse(user);
        setUserName(parsed.first_name || parsed.username || 'Пользователь');
      } catch {}
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('access');
      if (!token) {
        window.location.href = '/login';
        return;
      }
      setLoading(true);
      const [roomsResponse, guestsResponse, bookingsResponse] = await Promise.all([
        fetch(`${API_URL}/api/rooms/`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/guests/`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/bookings/`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (roomsResponse.ok && guestsResponse.ok && bookingsResponse.ok) {
        const [roomsData, guestsData, bookingsData] = await Promise.all([
          roomsResponse.json(),
          guestsResponse.json(),
          bookingsResponse.json(),
        ]);
        const freeRooms = roomsData.filter((r: any) => r.status === 'free').length;
        const busyRooms = roomsData.filter((r: any) => r.status === 'busy').length;
        const repairRooms = roomsData.filter((r: any) => r.status === 'repair').length;
        const totalBookings = bookingsData.length;
        const today = new Date().toISOString().slice(0, 10);
        const todayCheckouts = bookingsData.filter((b: any) => (b.check_out || b.date_to)?.slice(0, 10) === today).length;
        const pendingPayments = bookingsData.filter((b: any) => b.payment_status !== 'paid').length;
        const totalGuests = guestsData.length;
        const revenueToday = bookingsData.filter((b: any) => (b.check_in || b.date_from)?.slice(0, 10) === today).reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0);
        const paidTodaySum = bookingsData.filter((b: any) => b.payment_status === 'paid' && (b.check_in || b.date_from)?.slice(0, 10) === today)
          .reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0);
        setStats({ freeRooms, totalBookings, todayCheckouts, pendingPayments, totalGuests, revenueToday });
        setAllRoomsCount(roomsData.length);
        setPaidToday(paidTodaySum);
        // Сохраняем статистику номеров для использования в компоненте
        setRoomStats({ free: freeRooms, busy: busyRooms, repair: repairRooms });
        setRecentBookings(bookingsData.sort((a: any, b: any) => new Date(b.check_in || b.date_from).getTime() - new Date(a.check_in || a.date_from).getTime()).slice(0, 5));
        setRecentGuests(guestsData.sort((a: any, b: any) => new Date(b.created_at || b.registration_date || 0).getTime() - new Date(a.created_at || a.registration_date || 0).getTime()).slice(0, 5));
        setAvailableRooms(roomsData.slice(0, 10)); // Показываем все номера, не только свободные
      } else {
        setError('Ошибка загрузки данных');
      }
    } catch (error) {
      setError('Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('ru-RU');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'free': return 'bg-green-100 text-green-800';
      case 'busy': return 'bg-red-100 text-red-800';
      case 'repair': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Активный';
      case 'completed': return 'Завершён';
      case 'cancelled': return 'Отменён';
      case 'free': return 'Свободен';
      case 'busy': return 'Забронирован';
      case 'repair': return 'Недоступен';
      default: return status;
    }
  };

  const getRoomClassLabel = (roomClass: string) => {
    switch (roomClass) {
      case 'lux': return 'Люкс';
      case 'standard': return 'Стандарт';
      case 'econom': return 'Эконом';
      default: return roomClass;
    }
  };

  function safeString(val: any) {
    if (val == null) return '—';
    if (typeof val === 'object') {
      if ('label' in val) return val.label;
      if ('value' in val) return val.value;
      return JSON.stringify(val);
    }
    return String(val);
  }

  const totalRooms = allRoomsCount;
  const busyRooms = totalRooms - stats.freeRooms;
  const totalGuests = stats.totalGuests;
  const totalBookings = stats.totalBookings;
  const paidBookings = recentBookings.filter(b => b.payment_status === 'paid').length;

  const roomStatusCounts = {
    free: roomStats.free,
    busy: roomStats.busy,
    repair: roomStats.repair,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка дашборда...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={fetchDashboardData} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Попробовать снова</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="w-full px-2 md:px-6 xl:px-16 py-0 flex flex-col gap-1">
        <div className="flex items-center gap-4 bg-white/80 rounded-2xl shadow p-4 mb-2 mt-6">
          <div className="flex flex-col">
            <span className="text-lg font-bold text-gray-900">Добро пожаловать в админ панель</span>
            <span className="text-sm text-gray-500">{new Date().toLocaleDateString('ru-RU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-2">
          <div className="bg-gradient-to-br from-blue-100 to-blue-300 rounded-2xl shadow-xl flex flex-col items-center justify-center p-5 transition-transform hover:-translate-y-1 hover:shadow-2xl group animate-fade-in">
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-white/80 shadow group-hover:scale-110 transition-transform mb-2">
              <FaBed className="text-blue-600 text-2xl" />
            </div>
            <div className="text-3xl font-extrabold text-blue-900 tracking-tight drop-shadow-sm">{allRoomsCount}</div>
            <div className="text-base text-blue-700 mt-1 font-medium">Все номера</div>
          </div>
          <div className="bg-gradient-to-br from-green-100 to-green-300 rounded-2xl shadow-xl flex flex-col items-center justify-center p-5 transition-transform hover:-translate-y-1 hover:shadow-2xl group animate-fade-in">
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-white/80 shadow group-hover:scale-110 transition-transform mb-2">
              <FaCalendarCheck className="text-green-600 text-2xl" />
            </div>
            <div className="text-3xl font-extrabold text-green-900 tracking-tight drop-shadow-sm">{stats.totalBookings}</div>
            <div className="text-base text-green-700 mt-1 font-medium">Бронирований</div>
          </div>
          
          <div className="bg-gradient-to-br from-yellow-100 to-yellow-300 rounded-2xl shadow-xl flex flex-col items-center justify-center p-5 transition-transform hover:-translate-y-1 hover:shadow-2xl group animate-fade-in">
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-white/80 shadow group-hover:scale-110 transition-transform mb-2">
              <FaMoneyBillWave className="text-yellow-600 text-2xl" />
            </div>
            <div className="text-3xl font-extrabold text-yellow-900 tracking-tight drop-shadow-sm">{paidBookings}</div>
            <div className="text-base text-yellow-700 mt-1 font-medium">Оплачено</div>
          </div>
          <div className="bg-gradient-to-br from-red-100 to-red-300 rounded-2xl shadow-xl flex flex-col items-center justify-center p-5 transition-transform hover:-translate-y-1 hover:shadow-2xl group animate-fade-in">
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-white/80 shadow group-hover:scale-110 transition-transform mb-2">
              <FaMoneyBillWave className="text-red-600 text-2xl" />
            </div>
            <div className="text-3xl font-extrabold text-red-900 tracking-tight drop-shadow-sm">{stats.pendingPayments}</div>
            <div className="text-base text-red-700 mt-1 font-medium">Не оплачено</div>
          </div>
          <div className="bg-gradient-to-br from-purple-100 to-purple-300 rounded-2xl shadow-xl flex flex-col items-center justify-center p-5 transition-transform hover:-translate-y-1 hover:shadow-2xl group animate-fade-in">
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-white/80 shadow group-hover:scale-110 transition-transform mb-2">
              <FaUsers className="text-purple-600 text-2xl" />
            </div>
            <div className="text-3xl font-extrabold text-purple-900 tracking-tight drop-shadow-sm">{stats.totalGuests}</div>
            <div className="text-base text-purple-700 mt-1 font-medium">Гостей</div>
          </div>
          <div className="bg-gradient-to-br from-orange-100 to-orange-300 rounded-2xl shadow-xl flex flex-col items-center justify-center p-5 transition-transform hover:-translate-y-1 hover:shadow-2xl group animate-fade-in">
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-white/80 shadow group-hover:scale-110 transition-transform mb-2">
              <FaChartBar className="text-orange-600 text-2xl" />
            </div>
            <div className="text-3xl font-extrabold text-orange-900 tracking-tight drop-shadow-sm">{Math.round(recentBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0)).toLocaleString()} сом</div>
            <div className="text-base text-orange-700 mt-1 font-medium">Общая выручка</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mb-2 justify-center animate-fade-in">
          <Link href="/bookings?add=1" className="px-7 py-3 bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white rounded-2xl font-bold text-base flex items-center gap-3 shadow-lg transition-all duration-200"><FaPlus />Бронирование</Link>
          <Link href="/guests" className="px-7 py-3 bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 text-white rounded-2xl font-bold text-base flex items-center gap-3 shadow-lg transition-all duration-200"><FaUser />Гости</Link>
          <Link href="/rooms" className="px-7 py-3 bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800 text-white rounded-2xl font-bold text-base flex items-center gap-3 shadow-lg transition-all duration-200"><FaBed />Номера</Link>
          <Link href="/reports" className="px-7 py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-white rounded-2xl font-bold text-base flex items-center gap-3 shadow-lg transition-all duration-200"><FaFileCsv />Отчёты</Link>
          <Link href="/buildings" className="px-7 py-3 bg-gradient-to-r from-blue-400 to-purple-500 hover:from-blue-500 hover:to-purple-600 text-white rounded-2xl font-bold text-base flex items-center gap-3 shadow-lg transition-all duration-200"><FaBuilding />Здания</Link>
          <Link href="/trash" className="px-7 py-3 bg-gradient-to-r from-red-400 to-red-600 hover:from-red-500 hover:to-red-700 text-white rounded-2xl font-bold text-base flex items-center gap-3 shadow-lg transition-all duration-200"><FaTrash />Корзина</Link>
        </div>

        <div className="mb-2">
          <button onClick={() => setOpenData(v => !v)} className="flex items-center gap-3 text-lg font-bold text-gray-900 tracking-tight focus:outline-none w-full py-2 px-2 rounded-lg bg-white/80 shadow-sm border-l-4 border-l-blue-400 hover:border-l-blue-600 hover:shadow-blue-100 transition group relative">
            <FaBed className="text-blue-500 text-xl" />
            <span>Данные</span>
            <span className={`ml-auto transition-transform ${openData ? 'rotate-90' : ''}`}>▶</span>
          </button>
          <div className={`overflow-hidden transition-all duration-500 ${openData ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}> 
            <div className="flex flex-col gap-2 p-4 bg-white/90 rounded-2xl shadow mb-2">
              {availableRooms.map(room => (
                <div key={room.id} className="flex items-center gap-3 text-base">
                  <span className={`inline-block w-3 h-3 rounded-full ${room.status === 'free' ? 'bg-green-400' : room.status === 'busy' ? 'bg-red-500' : 'bg-orange-400'}`}></span>
                  <span className="font-semibold">Номер {room.number}</span>
                  <span className="text-gray-500">{getStatusLabel(room.status)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-2">
          <button onClick={() => setOpenStats(v => !v)} className="flex items-center gap-3 text-lg font-bold text-gray-900 tracking-tight focus:outline-none w-full py-2 px-2 rounded-lg bg-white/80 shadow-sm border-l-4 border-l-cyan-400 hover:border-l-cyan-600 hover:shadow-cyan-100 transition group relative">
            <FaChartBar className="text-cyan-500 text-xl" />
            <span>Статистика</span>
            <span className={`ml-auto transition-transform ${openStats ? 'rotate-90' : ''}`}>▶</span>
          </button>
          <div className={`overflow-hidden transition-all duration-500 ${openStats ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}> 
            <div className="flex flex-row items-center gap-6 p-4 bg-white/90 rounded-2xl shadow mb-2">
              <div className="flex-1 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-32">Свободные номера</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div className="bg-green-400 h-4 rounded-full" style={{ width: `${(roomStatusCounts.free/totalRooms)*100 || 0}%` }}></div>
                  </div>
                  <span className="ml-2 text-sm font-bold">{roomStatusCounts.free}/{totalRooms}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-32">Занятые номера</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div className="bg-red-400 h-4 rounded-full" style={{ width: `${(roomStatusCounts.busy/totalRooms)*100 || 0}%` }}></div>
                  </div>
                  <span className="ml-2 text-sm font-bold">{roomStatusCounts.busy}/{totalRooms}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-32">Недоступные</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div className="bg-orange-400 h-4 rounded-full" style={{ width: `${(roomStatusCounts.repair/totalRooms)*100 || 0}%` }}></div>
                  </div>
                  <span className="ml-2 text-sm font-bold">{roomStatusCounts.repair}/{totalRooms}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-32">Гости</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div className="bg-purple-400 h-4 rounded-full" style={{ width: `${(totalGuests/100)*100 || 0}%` }}></div>
                  </div>
                  <span className="ml-2 text-sm font-bold">{totalGuests}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-32">Бронирования</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div className="bg-green-400 h-4 rounded-full" style={{ width: `${(totalBookings/100)*100 || 0}%` }}></div>
                  </div>
                  <span className="ml-2 text-sm font-bold">{totalBookings}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-32">Оплачено</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div className="bg-yellow-400 h-4 rounded-full" style={{ width: `${(paidBookings/totalBookings)*100 || 0}%` }}></div>
                  </div>
                  <span className="ml-2 text-sm font-bold">{paidBookings}/{totalBookings}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mb-1">
          <button onClick={() => setOpenRooms(v => !v)}
            className="flex items-center gap-3 text-lg font-bold text-gray-900 tracking-tight focus:outline-none w-full py-2 px-2 rounded-lg bg-white/80 shadow-sm border-l-4 border-l-blue-400 hover:border-l-blue-600 hover:shadow-blue-100 transition group relative">
            <FaBed className="text-blue-500 text-xl" />
            <span>Номера</span>
            <span className={`ml-auto transition-transform ${openRooms ? 'rotate-90' : ''}`}>▶</span>
          </button>
          <div className={`overflow-hidden transition-all duration-500 ${openRooms ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}> 
            <div className="overflow-x-auto rounded-2xl shadow-xl bg-white/90 mb-4 animate-fade-in">
              <table className="w-full text-base">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-50 to-purple-50 text-gray-700">
                    <th className="p-3 text-left font-bold">Номер</th>
                    <th className="p-3 text-left font-bold">Класс</th>
                    <th className="p-3 text-left font-bold">Цена</th>
                    <th className="p-3 text-left font-bold">Вместимость</th>
                    <th className="p-3 text-left font-bold">Статус</th>
                    <th className="p-3 text-left font-bold">Здание</th>
                  </tr>
                </thead>
                <tbody>
                  {availableRooms.length === 0 ? (
                    <tr><td colSpan={6} className="text-center text-gray-400 py-4">Нет номеров</td></tr>
                  ) : (
                    availableRooms.map((room) => (
                      <tr key={room.id} className="border-b last:border-b-0 hover:bg-blue-50 transition">
                        <td className="p-3 font-semibold">№{room.number}</td>
                        <td className="p-3">{safeString(getRoomClassLabel(room.room_class))}</td>
                        <td className="p-3">{room.price_per_night ? Math.round(room.price_per_night).toLocaleString() + ' сом' : '—'}</td>
                        <td className="p-3">{room.capacity || '—'}</td>
                        <td className="p-3"><span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(room.status)}`}>{getStatusLabel(room.status)}</span></td>
                        <td className="p-3">{safeString(room.building?.name)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="mb-1">
          <button onClick={() => setOpenBookings(v => !v)}
            className="flex items-center gap-3 text-lg font-bold text-gray-900 tracking-tight focus:outline-none w-full py-2 px-2 rounded-lg bg-white/80 shadow-sm border-l-4 border-l-green-400 hover:border-l-green-600 hover:shadow-green-100 transition group relative">
            <FaCalendarCheck className="text-green-500 text-xl" />
            <span>Детали бронирований</span>
            <span className={`ml-auto transition-transform ${openBookings ? 'rotate-90' : ''}`}>▶</span>
          </button>
          <div className={`overflow-hidden transition-all duration-500 ${openBookings ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}> 
            <div className="overflow-x-auto rounded-2xl shadow-xl bg-white/90 mb-4 animate-fade-in">
              <table className="w-full text-base">
                <thead>
                  <tr className="bg-gradient-to-r from-green-50 to-blue-50 text-gray-700">
                    <th className="p-3 text-left font-bold">Гость</th>
                    <th className="p-3 text-left font-bold">Номер</th>
                    <th className="p-3 text-left font-bold">Класс</th>
                    <th className="p-3 text-left font-bold">Период</th>
                    <th className="p-3 text-left font-bold">Цена</th>
                    <th className="p-3 text-left font-bold">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.length === 0 ? (
                    <tr><td colSpan={6} className="text-center text-gray-400 py-4">Нет бронирований</td></tr>
                  ) : (
                    recentBookings.map((booking) => (
                      <tr key={booking.id} className="border-b last:border-b-0 hover:bg-green-50 transition">
                        <td className="p-3 font-semibold">{booking.guest.full_name}</td>
                        <td className="p-3">№{booking.room.number} • {booking.people_count} гостей</td>
                        <td className="p-3">{safeString(getRoomClassLabel(booking.room.room_class))}</td>
                        <td className="p-3">{formatDate(booking.check_in)} — {formatDate(booking.check_out)}</td>
                        <td className="p-3">{booking.total_amount ? Math.round(booking.total_amount).toLocaleString() + ' сом' : 'Не оплачено'}</td>
                        <td className="p-3"><span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>{getStatusLabel(booking.status)}</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="mb-1">
          <button onClick={() => setOpenGuests(v => !v)}
            className="flex items-center gap-3 text-lg font-bold text-gray-900 tracking-tight focus:outline-none w-full py-2 px-2 rounded-lg bg-white/80 shadow-sm border-l-4 border-l-purple-400 hover:border-l-purple-600 hover:shadow-purple-100 transition group relative">
            <FaUsers className="text-purple-500 text-xl" />
            <span>Гости</span>
            <span className={`ml-auto transition-transform ${openGuests ? 'rotate-90' : ''}`}>▶</span>
          </button>
          <div className={`overflow-hidden transition-all duration-500 ${openGuests ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}> 
            <div className="overflow-x-auto rounded-2xl shadow-xl bg-white/90 mb-4 animate-fade-in">
              <table className="w-full text-base">
                <thead>
                  <tr className="bg-gradient-to-r from-purple-50 to-pink-50 text-gray-700">
                    <th className="p-3 text-left font-bold">Гость</th>
                    <th className="p-3 text-left font-bold">Контакт</th>
                    <th className="p-3 text-left font-bold">Статус</th>
                    <th className="p-3 text-left font-bold">Оплачено</th>
                  </tr>
                </thead>
                <tbody>
                  {recentGuests.length === 0 ? (
                    <tr><td colSpan={4} className="text-center text-gray-400 py-4">Нет гостей</td></tr>
                  ) : (
                    recentGuests.map((guest) => (
                      <tr key={guest.id} className="border-b last:border-b-0 hover:bg-purple-50 transition">
                        <td className="p-3 font-semibold">{guest.full_name}</td>
                        <td className="p-3">{guest.phone || guest.inn || '—'}</td>
                        <td className="p-3"><span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(guest.status)}`}>{getStatusLabel(guest.status)}</span></td>
                        <td className="p-3 text-green-700">{guest.total_spent ? Math.round(Number(guest.total_spent)).toLocaleString() + ' сом' : '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}