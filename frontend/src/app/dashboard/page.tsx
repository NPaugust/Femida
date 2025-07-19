"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { FaBed, FaUser, FaCalendarCheck, FaChartBar, FaBuilding, FaMoneyBillWave, FaUsers, FaPlus, FaFileCsv, FaUsersCog, FaRegSmile, FaTrash } from "react-icons/fa";
import StatusBadge from "../../components/StatusBadge";
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
  const [showAllSections, setShowAllSections] = useState(false);
  const [userRole, setUserRole] = useState<string>('admin');

  const [stats, setStats] = useState<DashboardStats>({
    freeRooms: 0,
    totalBookings: 0,
    todayCheckouts: 0,
    pendingPayments: 0,
    totalGuests: 0,
    revenueToday: 0,
  });
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
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
    const role = localStorage.getItem('role');
    
    if (user) {
      try {
        const parsed = JSON.parse(user);
        setUserName(parsed.first_name || parsed.username || 'Пользователь');
        setUserRole(parsed.role || role || 'admin');
      } catch {
        setUserRole(role || 'admin');
      }
    } else if (role) {
      setUserRole(role);
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
        setAllBookings(bookingsData);
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

  // Обработчик клика по карточке номера
  const handleRoomCardClick = (room: Room) => {
    if (room.status === 'busy') {
      // Если номер забронирован (красный), переходим на страницу бронирований
      // и ищем активное бронирование для этого номера
      const activeBooking = allBookings.find(b => 
        (typeof b.room === 'object' ? b.room.number : b.room) === room.number && 
        b.status === 'active'
      );
      if (activeBooking) {
        window.location.href = `/bookings?bookingId=${activeBooking.id}`;
      } else {
        window.location.href = `/bookings?room=${room.number}`;
      }
    } else {
      // Если номер свободен (зеленый), переходим на страницу номеров
      window.location.href = `/rooms?room=${room.number}`;
    }
  };

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
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">Загрузка дашборда...</p>
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
        <div className="flex items-center gap-4 bg-gradient-to-r from-white/90 to-blue-50/90 rounded-2xl shadow-lg p-6 mb-2 mt-6 border border-blue-100/50">
          <div className="flex flex-col">
            <span className="text-xl font-bold text-gray-900 mb-1">Добро пожаловать в админ-панель!</span>
            <span className="text-sm text-gray-600">{new Date().toLocaleDateString('ru-RU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-6 mb-2">          <Link href="/rooms" className="bg-gradient-to-br from-blue-100 to-blue-300 rounded-2xl shadow-xl flex flex-col items-center justify-center p-5 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl group animate-fade-in hover:scale-105 cursor-pointer">
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-white/80 shadow-lg group-hover:scale-110 transition-transform mb-2 group-hover:shadow-xl">
              <FaBed className="text-blue-600 text-2xl group-hover:text-blue-700 transition-colors" />
            </div>
            <div className="text-3xl font-extrabold text-blue-900 tracking-tight drop-shadow-sm group-hover:text-blue-800 transition-colors">{allRoomsCount}</div>
            <div className="text-base text-blue-700 mt-1 font-bold group-hover:text-blue-800 transition-colors">Все номера</div>
          </Link>
          <Link href="/bookings" className="bg-gradient-to-br from-green-100 to-green-300 rounded-2xl shadow-xl flex flex-col items-center justify-center p-5 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl group animate-fade-in hover:scale-105 cursor-pointer">
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-white/80 shadow-lg group-hover:scale-110 transition-transform mb-2 group-hover:shadow-xl">
              <FaCalendarCheck className="text-green-600 text-2xl group-hover:text-green-700 transition-colors" />
            </div>
            <div className="text-3xl font-extrabold text-green-900 tracking-tight drop-shadow-sm group-hover:text-green-800 transition-colors">{stats.totalBookings}</div>
            <div className="text-base text-green-700 mt-1 font-bold group-hover:text-green-800 transition-colors">Бронирований</div>
          </Link>
          
          <Link href="/bookings?payment_status=paid" className="bg-gradient-to-br from-yellow-100 to-yellow-300 rounded-2xl shadow-xl flex flex-col items-center justify-center p-5 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl group animate-fade-in hover:scale-105 cursor-pointer">
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-white/80 shadow-lg group-hover:scale-110 transition-transform mb-2 group-hover:shadow-xl">
              <FaMoneyBillWave className="text-yellow-600 text-2xl group-hover:text-yellow-700 transition-colors" />
            </div>
            <div className="text-3xl font-extrabold text-yellow-900 tracking-tight drop-shadow-sm group-hover:text-yellow-800 transition-colors">{paidBookings}</div>
            <div className="text-base text-yellow-700 mt-1 font-bold group-hover:text-yellow-800 transition-colors">Оплачено</div>
          </Link>
          <Link href="/bookings?payment_status=pending&filter=unpaid" className="bg-gradient-to-br from-red-100 to-red-300 rounded-2xl shadow-xl flex flex-col items-center justify-center p-5 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl group animate-fade-in hover:scale-105 cursor-pointer">
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-white/80 shadow-lg group-hover:scale-110 transition-transform mb-2 group-hover:shadow-xl">
              <FaMoneyBillWave className="text-red-600 text-2xl group-hover:text-red-700 transition-colors" />
          </div>
            <div className="text-3xl font-extrabold text-red-900 tracking-tight drop-shadow-sm group-hover:text-red-800 transition-colors">{stats.pendingPayments}</div>
            <div className="text-base text-red-700 mt-1 font-bold group-hover:text-red-800 transition-colors">Не оплачено</div>
          </Link>
          <Link href="/guests" className="bg-gradient-to-br from-purple-100 to-purple-300 rounded-2xl shadow-xl flex flex-col items-center justify-center p-5 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl group animate-fade-in hover:scale-105 cursor-pointer">
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-white/80 shadow-lg group-hover:scale-110 transition-transform mb-2 group-hover:shadow-xl">
              <FaUsers className="text-purple-600 text-2xl group-hover:text-purple-700 transition-colors" />
            </div>
            <div className="text-3xl font-extrabold text-purple-900 tracking-tight drop-shadow-sm group-hover:text-purple-800 transition-colors">{stats.totalGuests}</div>
            <div className="text-base text-purple-700 mt-1 font-bold group-hover:text-purple-800 transition-colors">Гостей</div>
          </Link>
          <Link href="/reports" className="bg-gradient-to-br from-orange-100 to-orange-300 rounded-2xl shadow-xl flex flex-col items-center justify-center p-5 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl group animate-fade-in hover:scale-105 cursor-pointer">
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-white/80 shadow-lg group-hover:scale-110 transition-transform mb-2 group-hover:shadow-xl">
              <FaChartBar className="text-orange-600 text-2xl group-hover:text-orange-700 transition-colors" />
            </div>
            <div className="text-3xl font-extrabold text-orange-900 tracking-tight drop-shadow-sm group-hover:text-orange-800 transition-colors">
              {(() => {
                // Используем все бронирования, а не только последние 5
                const total = allBookings.reduce((sum, b) => {
                  // Проверяем разные возможные поля для суммы
                  let amount = b.total_amount || (b as any).price || b.price_per_night || 0;
                  
                  // Если это строка, убираем пробелы и конвертируем
                  if (typeof amount === 'string') {
                    amount = amount.replace(/\s/g, '').replace(',', '.');
                  }
                  
                  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
                  const validAmount = typeof numAmount === 'number' && !isNaN(numAmount) ? numAmount : 0;
                  
                  return sum + validAmount;
                }, 0);
                return total > 0 ? Math.round(total).toLocaleString() + ' сом' : '0 сом';
              })()}
            </div>
            <div className="text-base text-orange-700 mt-1 font-bold group-hover:text-orange-800 transition-colors">Общая выручка</div>
          </Link>
        </div>

        <div className="flex flex-wrap gap-2 sm:gap-3 md:gap-4 mb-2 justify-center animate-fade-in">
          <Link href="/bookings" className="group relative px-7 py-3 bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white rounded-2xl font-bold text-base flex items-center gap-3 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <FaPlus className="group-hover:scale-110 transition-transform" />
            Бронирование
          </Link>
          <Link href="/guests" className="group relative px-7 py-3 bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 text-white rounded-2xl font-bold text-base flex items-center gap-3 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <FaUser className="group-hover:scale-110 transition-transform" />
            Гости
          </Link>
          <Link href="/rooms" className="group relative px-7 py-3 bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800 text-white rounded-2xl font-bold text-base flex items-center gap-3 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <FaBed className="group-hover:scale-110 transition-transform" />
            Номера
          </Link>
          <Link href="/reports" className="group relative px-7 py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-white rounded-2xl font-bold text-base flex items-center gap-3 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <FaFileCsv className="group-hover:scale-110 transition-transform" />
            Отчёты
          </Link>
          <Link href="/buildings" className="group relative px-7 py-3 bg-gradient-to-r from-blue-400 to-purple-500 hover:from-blue-500 hover:to-purple-600 text-white rounded-2xl font-bold text-base flex items-center gap-3 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <FaBuilding className="group-hover:scale-110 transition-transform" />
            Здания
          </Link>
          <Link href="/trash" className="group relative px-7 py-3 bg-gradient-to-r from-red-400 to-red-600 hover:from-red-500 hover:to-red-700 text-white rounded-2xl font-bold text-base flex items-center gap-3 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <FaTrash className="group-hover:scale-110 transition-transform" />
            Корзина
          </Link>
          {userRole === 'superadmin' && (
            <Link href="/users" className="group relative px-7 py-3 bg-gradient-to-r from-indigo-400 to-indigo-600 hover:from-indigo-500 hover:to-indigo-700 text-white rounded-2xl font-bold text-base flex items-center gap-3 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <FaUsersCog className="group-hover:scale-110 transition-transform" />
              Сотрудники
            </Link>
          )}
        </div>

        {/* Центральная кнопка для показа всех секций */}
        {!showAllSections && (
          <div className="flex items-center justify-center min-h-[150px] mt-4 animate-fade-in">
            <button 
              onClick={() => setShowAllSections(true)}
              className="group relative px-10 py-6 bg-gradient-to-br from-gray-50 to-blue-50 hover:from-blue-50 hover:to-indigo-50 text-gray-800 hover:text-blue-700 rounded-2xl font-bold text-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 cursor-pointer border border-gray-200 hover:border-blue-300"
            >
              {/* Анимированный фон */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-100/30 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              
              {/* Иконка и текст */}
              <div className="relative flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-md">
                  <FaChartBar className="text-white text-xl" />
                </div>
                <div className="text-left">
                  <div className="text-2xl font-extrabold mb-1">Показать статистику</div>
                  <div className="text-sm text-gray-600 group-hover:text-blue-600 font-medium">Статистика, данные и детали</div>
                </div>
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-md">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Все секции - показываются только после нажатия кнопки */}
        <div className={`transition-all duration-700 ${showAllSections ? 'opacity-100 max-h-[2000px]' : 'opacity-0 max-h-0 overflow-hidden'}`}>
          <div className="mb-2">
            <button onClick={() => setOpenData(v => !v)} className="flex items-center gap-3 text-lg font-bold text-gray-900 tracking-tight focus:outline-none w-full py-3 px-4 rounded-xl bg-gradient-to-r from-white/90 to-blue-50/90 shadow-lg border-l-4 border-l-blue-400 hover:border-l-blue-600 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group relative">
              <FaBed className="text-blue-500 text-xl group-hover:scale-110 transition-transform" />
              <span className="font-bold">Данные</span>
              <span className={`ml-auto transition-transform duration-300 ${openData ? 'rotate-90' : ''}`}>▶</span>
            </button>
          <div className={`overflow-hidden transition-all duration-500 ${openData ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}> 
            <div className="p-6 bg-white/90 rounded-2xl shadow-lg mb-2 border border-gray-100">
              {/* Здания и номера в стиле кинотеатра */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {(() => {
                  // Группируем номера по зданиям
                  const buildingsMap = new Map();
                  availableRooms.forEach(room => {
                    const buildingName = room.building?.name || 'Неизвестное здание';
                    if (!buildingsMap.has(buildingName)) {
                      buildingsMap.set(buildingName, []);
                    }
                    buildingsMap.get(buildingName).push(room);
                  });
                  
                                     return Array.from(buildingsMap.entries()).map(([buildingName, rooms]: [string, Room[]]) => (
                    <div key={buildingName} className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                      <h3 className="font-bold text-blue-900 mb-3 text-lg flex items-center gap-2">
                        <FaBuilding className="text-blue-600" />
                        {buildingName}
                      </h3>
                      <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        {rooms.map(room => {
                          const roomBookings = allBookings.filter(b => 
                            (typeof b.room === 'object' ? b.room.number : b.room) === room.number
                          );
                          const activeBookings = roomBookings.filter(b => b.status === 'active');
                          const totalGuests = roomBookings.reduce((sum, b) => sum + (b.people_count || 0), 0);
                          
                          return (
                            <div 
                              key={room.id} 
                              onClick={() => handleRoomCardClick(room)}
                              className={`relative p-4 rounded-lg transition-all duration-200 cursor-pointer group ${
                                room.status === 'free' 
                                  ? 'bg-green-100 hover:bg-green-200 border border-green-300' 
                                  : room.status === 'busy' 
                                    ? 'bg-red-100 hover:bg-red-200 border border-red-300' 
                                    : 'bg-orange-100 hover:bg-orange-200 border border-orange-300'
                              }`}
                              title={`Номер ${room.number} - ${room.status === 'free' ? 'Свободен' : room.status === 'busy' ? 'Занят' : 'Недоступен'}`}
                            >
                              <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${
                                room.status === 'free' ? 'bg-green-500' : room.status === 'busy' ? 'bg-red-500' : 'bg-orange-500'
                              }`}></div>
                              
                              <div className="font-bold text-sm text-gray-900 mb-3">№{room.number}</div>
                              
                              <div className="flex justify-between">
                                {/* Левая колонка - основная информация */}
                                <div className="text-left">
                                  <div className="text-sm text-gray-600 font-medium">
                                    {room.price_per_night ? Math.round(room.price_per_night).toLocaleString() + ' сом' : '—'}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {room.capacity} мест
                                  </div>
                                  <div className="text-xs text-blue-600 font-medium mt-1">
                                    {room.room_class === 'standard' ? 'Стандарт' : 
                                     room.room_class === 'semi_lux' ? 'Полу-люкс' : 
                                     room.room_class === 'lux' ? 'Люкс' : room.room_class}
                                  </div>
                                </div>
                                
                                {/* Правая колонка - бронирования */}
                                <div className="text-right">
                                  <div className="text-sm text-green-600 font-medium">
                                    {activeBookings.length} бронирований
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {totalGuests} гостей
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-2">
          <button onClick={() => setOpenStats(v => !v)} className="flex items-center gap-3 text-lg font-bold text-gray-900 tracking-tight focus:outline-none w-full py-3 px-4 rounded-xl bg-gradient-to-r from-white/90 to-cyan-50/90 shadow-lg border-l-4 border-l-cyan-400 hover:border-l-cyan-600 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group relative">
            <FaChartBar className="text-cyan-500 text-xl group-hover:scale-110 transition-transform" />
                          <span className="font-bold">Статистика</span>
            <span className={`ml-auto transition-transform duration-300 ${openStats ? 'rotate-90' : ''}`}>▶</span>
          </button>
          <div className={`overflow-hidden transition-all duration-500 ${openStats ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}> 
            <div className="flex flex-row items-center gap-6 p-6 bg-white/90 rounded-2xl shadow-lg mb-2 border border-gray-100">
              <div className="flex-1 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-32 text-sm font-medium text-gray-700">Свободные номера</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                    <div className="bg-gradient-to-r from-green-400 to-green-500 h-3 rounded-full transition-all duration-500 shadow-sm" style={{ width: `${(roomStatusCounts.free/totalRooms)*100 || 0}%` }}></div>
                  </div>
                  <span className="ml-2 text-sm font-bold text-gray-900">{roomStatusCounts.free}/{totalRooms}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-32 text-sm font-medium text-gray-700">Занятые номера</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                    <div className="bg-gradient-to-r from-red-400 to-red-500 h-3 rounded-full transition-all duration-500 shadow-sm" style={{ width: `${(roomStatusCounts.busy/totalRooms)*100 || 0}%` }}></div>
                  </div>
                  <span className="ml-2 text-sm font-bold text-gray-900">{roomStatusCounts.busy}/{totalRooms}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-32 text-sm font-medium text-gray-700">Недоступные</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                    <div className="bg-gradient-to-r from-orange-400 to-orange-500 h-3 rounded-full transition-all duration-500 shadow-sm" style={{ width: `${(roomStatusCounts.repair/totalRooms)*100 || 0}%` }}></div>
                  </div>
                  <span className="ml-2 text-sm font-bold text-gray-900">{roomStatusCounts.repair}/{totalRooms}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-32 text-sm font-medium text-gray-700">Гости</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                    <div className="bg-gradient-to-r from-purple-400 to-purple-500 h-3 rounded-full transition-all duration-500 shadow-sm" style={{ width: `${(totalGuests/100)*100 || 0}%` }}></div>
                  </div>
                  <span className="ml-2 text-sm font-bold text-gray-900">{totalGuests}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-32 text-sm font-medium text-gray-700">Бронирования</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                    <div className="bg-gradient-to-r from-green-400 to-green-500 h-3 rounded-full transition-all duration-500 shadow-sm" style={{ width: `${(totalBookings/100)*100 || 0}%` }}></div>
                  </div>
                  <span className="ml-2 text-sm font-bold text-gray-900">{totalBookings}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-32 text-sm font-medium text-gray-700">Оплачено</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                    <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-3 rounded-full transition-all duration-500 shadow-sm" style={{ width: `${(paidBookings/totalBookings)*100 || 0}%` }}></div>
                  </div>
                  <span className="ml-2 text-sm font-bold text-gray-900">{paidBookings}/{totalBookings}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mb-1">
          <button onClick={() => setOpenRooms(v => !v)}
            className="flex items-center gap-3 text-lg font-bold text-gray-900 tracking-tight focus:outline-none w-full py-3 px-4 rounded-xl bg-gradient-to-r from-white/90 to-blue-50/90 shadow-lg border-l-4 border-l-blue-400 hover:border-l-blue-600 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group relative">
            <FaBed className="text-blue-500 text-xl group-hover:scale-110 transition-transform" />
            <span>Номера</span>
            <span className={`ml-auto transition-transform duration-300 ${openRooms ? 'rotate-90' : ''}`}>▶</span>
          </button>
          <div className={`overflow-hidden transition-all duration-500 ${openRooms ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}> 
            <div className="overflow-x-auto rounded-2xl shadow-xl bg-white/90 mb-4 animate-fade-in border border-gray-100">
              <table className="w-full text-base">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-50 to-purple-50 text-gray-700 border-b border-gray-200">
                    <th className="p-4 text-left font-bold text-gray-800">Номер</th>
                    <th className="p-4 text-left font-bold text-gray-800">Класс</th>
                    <th className="p-4 text-left font-bold text-gray-800">Цена</th>
                    <th className="p-4 text-left font-bold text-gray-800">Вместимость</th>
                    <th className="p-4 text-left font-bold text-gray-800">Статус</th>
                    <th className="p-4 text-left font-bold text-gray-800">Здание</th>
                  </tr>
                </thead>
                <tbody>
                  {availableRooms.length === 0 ? (
                    <tr><td colSpan={6} className="text-center text-gray-400 py-8">Нет номеров</td></tr>
                  ) : (
                    availableRooms.map((room) => (
                      <tr key={room.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200 group">
                        <td className="p-4 font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">№{room.number}</td>
                        <td className="p-4 text-gray-700">{safeString(getRoomClassLabel(room.room_class))}</td>
                        <td className="p-4 text-gray-700 font-medium">{room.price_per_night ? Math.round(room.price_per_night).toLocaleString() + ' сом' : '—'}</td>
                        <td className="p-4 text-gray-700">{room.capacity || '—'}</td>
                        <td className="p-4"><StatusBadge status={room.status} size="sm" /></td>
                        <td className="p-4 text-gray-700">{safeString(room.building?.name)}</td>
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
            className="flex items-center gap-3 text-lg font-bold text-gray-900 tracking-tight focus:outline-none w-full py-3 px-4 rounded-xl bg-gradient-to-r from-white/90 to-green-50/90 shadow-lg border-l-4 border-l-green-400 hover:border-l-green-600 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group relative">
            <FaCalendarCheck className="text-green-500 text-xl group-hover:scale-110 transition-transform" />
            <span>Детали бронирований</span>
            <span className={`ml-auto transition-transform duration-300 ${openBookings ? 'rotate-90' : ''}`}>▶</span>
          </button>
          <div className={`overflow-hidden transition-all duration-500 ${openBookings ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}> 
            <div className="overflow-x-auto rounded-2xl shadow-xl bg-white/90 mb-4 animate-fade-in border border-gray-100">
              <table className="w-full text-base">
                <thead>
                  <tr className="bg-gradient-to-r from-green-50 to-blue-50 text-gray-700 border-b border-gray-200">
                    <th className="p-4 text-left font-bold text-gray-800">Гость</th>
                    <th className="p-4 text-left font-bold text-gray-800">Номер</th>
                    <th className="p-4 text-left font-bold text-gray-800">Класс</th>
                    <th className="p-4 text-left font-bold text-gray-800">Период</th>
                    <th className="p-4 text-left font-bold text-gray-800">Цена</th>
                    <th className="p-4 text-left font-bold text-gray-800">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.length === 0 ? (
                    <tr><td colSpan={6} className="text-center text-gray-400 py-8">Нет бронирований</td></tr>
                  ) : (
                    recentBookings.map((booking) => (
                      <tr key={booking.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gradient-to-r hover:from-green-50 hover:to-blue-50 transition-all duration-200 group">
                        <td className="p-4 font-semibold text-gray-900 group-hover:text-green-700 transition-colors">{booking.guest.full_name}</td>
                        <td className="p-4 text-gray-700">№{booking.room.number} • {booking.people_count} гостей</td>
                        <td className="p-4 text-gray-700">{safeString(getRoomClassLabel(booking.room.room_class))}</td>
                        <td className="p-4 text-gray-700">{formatDate(booking.check_in)} — {formatDate(booking.check_out)}</td>
                        <td className="p-4 text-gray-700 font-medium">{booking.total_amount ? Math.round(booking.total_amount).toLocaleString() + ' сом' : 'Не оплачено'}</td>
                        <td className="p-4">
                          <StatusBadge 
                            status={(() => {
                              const now = new Date();
                              const checkIn = new Date(booking.check_in);
                              const checkOut = new Date(booking.check_out);
                              
                              if (now < checkIn) return 'pending';
                              if (now >= checkIn && now <= checkOut) return 'active';
                              return 'completed';
                            })()} 
                            size="sm" 
                          />
                        </td>
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
            className="flex items-center gap-3 text-lg font-bold text-gray-900 tracking-tight focus:outline-none w-full py-3 px-4 rounded-xl bg-gradient-to-r from-white/90 to-purple-50/90 shadow-lg border-l-4 border-l-purple-400 hover:border-l-purple-600 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group relative">
            <FaUsers className="text-purple-500 text-xl group-hover:scale-110 transition-transform" />
            <span>Гости</span>
            <span className={`ml-auto transition-transform duration-300 ${openGuests ? 'rotate-90' : ''}`}>▶</span>
          </button>
          <div className={`overflow-hidden transition-all duration-500 ${openGuests ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}> 
            <div className="overflow-x-auto rounded-2xl shadow-xl bg-white/90 mb-4 animate-fade-in border border-gray-100">
              <table className="w-full text-base">
                <thead>
                  <tr className="bg-gradient-to-r from-purple-50 to-pink-50 text-gray-700 border-b border-gray-200">
                    <th className="p-4 text-left font-bold text-gray-800">Гость</th>
                    <th className="p-4 text-left font-bold text-gray-800">Контакт</th>
                    <th className="p-4 text-left font-bold text-gray-800">Статус</th>
                    <th className="p-4 text-left font-bold text-gray-800">Оплачено</th>
                  </tr>
                </thead>
                <tbody>
                  {recentGuests.length === 0 ? (
                    <tr><td colSpan={4} className="text-center text-gray-400 py-8">Нет гостей</td></tr>
                  ) : (
                    recentGuests.map((guest) => (
                      <tr key={guest.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all duration-200 group">
                        <td className="p-4 font-semibold text-gray-900 group-hover:text-purple-700 transition-colors">{guest.full_name}</td>
                        <td className="p-4 text-gray-700">{guest.phone || guest.inn || '—'}</td>
                        <td className="p-4"><StatusBadge status={guest.status} size="sm" /></td>
                        <td className="p-4 text-green-700 font-medium">{guest.total_spent ? Math.round(Number(guest.total_spent)).toLocaleString() + ' сом' : '—'}</td>
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
    </div>
  );
} 