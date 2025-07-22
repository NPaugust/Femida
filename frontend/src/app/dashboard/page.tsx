'use client';
import { useEffect, useState } from "react";
import Link from "next/link";
import { FaBed, FaUser, FaCalendarCheck, FaChartBar, FaBuilding, FaMoneyBillWave, FaUsers, FaPlus, FaFileCsv, FaUsersCog, FaRegSmile, FaTrash } from "react-icons/fa";
import StatusBadge from "../../components/StatusBadge";
import { API_URL, fetchWithAuth } from "../../shared/api";
import { useRef } from "react";
import { Line, Pie, Bar } from 'react-chartjs-2';
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
  BarElement,
} from 'chart.js';
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import Breadcrumbs from '../../components/Breadcrumbs';
import BigActionCard from '../../components/BigActionCard';
import { FaQuestionCircle } from 'react-icons/fa';

// Делаю графики адаптивными
const chartOptions = {
  responsive: true,
  plugins: {
    legend: { display: true, position: 'top' as const },
    title: { display: false },
  },
};

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

  const auth = useSelector((state: RootState) => state.auth);
  const access = auth.access;
  const user = auth.user;
  const userRole = auth.role || 'admin';

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
    setUserName(user?.first_name || user?.username || 'Пользователь');
  }, [user]);

  useEffect(() => {
    if (!access) {
      window.location.href = '/login';
    }
  }, [access]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      if (!access) {
        window.location.href = '/login';
        return;
      }
      setLoading(true);
      const [roomsResponse, guestsResponse, bookingsResponse]: [Response, Response, Response] = await Promise.all([
        fetchWithAuth(`${API_URL}/api/rooms/`, { headers: { Authorization: `Bearer ${access}` } }),
        fetchWithAuth(`${API_URL}/api/guests/`, { headers: { Authorization: `Bearer ${access}` } }),
        fetchWithAuth(`${API_URL}/api/bookings/`, { headers: { Authorization: `Bearer ${access}` } }),
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

  // Исправляю getRoomClassLabel для корректного отображения 'semi_lux' как 'Полу-люкс'
  const getRoomClassLabel = (roomClass: string) => {
    switch (roomClass) {
      case 'lux': return 'Люкс';
      case 'standard': return 'Стандарт';
      case 'econom': return 'Эконом';
      case 'semi_lux': return 'Полу-люкс';
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

  const [activeBigCard, setActiveBigCard] = useState<null | 'stats' | 'charts' | 'help'>(null);

  // Пример данных для графиков (можно заменить на реальные)
  const chartData1 = {
    labels: ['Янв', 'Фев', 'Мар', 'Апр', 'Май'],
    datasets: [{
      label: 'Доход',
      data: [1200, 1900, 3000, 2500, 3200],
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99,102,241,0.2)',
      tension: 0.4,
    }],
  };
  const chartData2 = {
    labels: ['Свободные', 'Занятые', 'Недоступные'],
    datasets: [{
      label: 'Номера',
      data: [roomStats.free, roomStats.busy, roomStats.repair],
      backgroundColor: ['#34d399', '#f87171', '#fbbf24'],
      borderWidth: 1,
    }],
  };
  const chartData3 = {
    labels: ['Гости', 'Бронирования'],
    datasets: [{
      label: 'Гости/Бронирования',
      data: [stats.totalGuests, stats.totalBookings],
      backgroundColor: ['#a78bfa', '#facc15'],
      borderWidth: 1,
    }],
  };

  // Формирую данные для графика по зданиям
  const buildingsMap = new Map();
  availableRooms.forEach(room => {
    const buildingName = room.building?.name || 'Неизвестное здание';
    if (!buildingsMap.has(buildingName)) {
      buildingsMap.set(buildingName, 0);
    }
    buildingsMap.set(buildingName, buildingsMap.get(buildingName) + 1);
  });
  const buildingsChartData = {
    labels: Array.from(buildingsMap.keys()),
    datasets: [{
      label: 'Количество номеров',
      data: Array.from(buildingsMap.values()),
      backgroundColor: '#60a5fa',
      borderColor: '#2563eb',
      borderWidth: 1,
    }],
  };

  // Улучшаю helpAccordions: добавляю визуальные подсказки, стрелки, мини-инструкции
  const helpAccordions = [
    {
      title: 'Как добавлять номера, гостей и бронирования?',
      content: (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="#e0e7ff"/><path d="M10 16h12M16 10v12" stroke="#6366f1" strokeWidth="2" strokeLinecap="round"/></svg>
            <span className="font-bold text-base">Добавление номера:</span>
            <span className="text-gray-700">Перейдите в раздел <b>Номера</b> и нажмите <b>Добавить номер</b>.</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="#bbf7d0"/><path d="M16 10v12M10 16h12" stroke="#22c55e" strokeWidth="2" strokeLinecap="round"/></svg>
            <span className="font-bold text-base">Добавление гостя:</span>
            <span className="text-gray-700">Перейдите в раздел <b>Гости</b> и нажмите <b>Добавить гостя</b>.</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="#fef08a"/><path d="M10 16h12" stroke="#eab308" strokeWidth="2" strokeLinecap="round"/></svg>
            <span className="font-bold text-base">Добавление бронирования:</span>
            <span className="text-gray-700">Перейдите в раздел <b>Бронирование</b> и выберите нужные параметры.</span>
          </div>
        </div>
      ),
    },
    {
      title: 'Как просматривать отчёты?',
      content: (
        <div className="flex items-center gap-2">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="#fef9c3"/><path d="M10 16h12" stroke="#f59e42" strokeWidth="2" strokeLinecap="round"/></svg>
          <span className="text-gray-700">Перейдите в раздел <b>Отчёты</b> в верхнем меню. Выберите нужный период и скачайте отчёт.</span>
        </div>
      ),
    },
    {
      title: 'Как редактировать данные гостя?',
      content: (
        <div className="flex items-center gap-2">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="#f3e8ff"/><path d="M16 10v12" stroke="#a21caf" strokeWidth="2" strokeLinecap="round"/></svg>
          <span className="text-gray-700">В разделе <b>Гости</b> найдите нужного гостя, нажмите на иконку <b>редактирования</b>, внесите изменения и сохраните.</span>
        </div>
      ),
    },
    {
      title: 'Как восстановить удалённые данные?',
      content: (
        <div className="flex items-center gap-2">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="#fee2e2"/><path d="M10 16h12" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/></svg>
          <span className="text-gray-700">Воспользуйтесь разделом <b>Корзина</b> для восстановления удалённых номеров, гостей или бронирований.</span>
        </div>
      ),
    },
    {
      title: 'Как сменить пароль или выйти из системы?',
      content: (
        <div className="flex items-center gap-2">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="#e0e7ff"/><path d="M16 10v12" stroke="#6366f1" strokeWidth="2" strokeLinecap="round"/></svg>
          <span className="text-gray-700">В разделе <b>Сотрудники</b> вы можете изменить пароль или выйти из системы с помощью кнопки <b>Выйти</b>.</span>
        </div>
      ),
    },
  ];

  // Обновляю аккордеоны для графиков
  const guestsBookingsBarData = {
    labels: ['Гости', 'Бронирования'],
    datasets: [
      {
        label: 'Гости',
        data: [stats.totalGuests, 0],
        backgroundColor: '#a78bfa',
        borderColor: '#7c3aed',
        borderWidth: 1,
      },
      {
        label: 'Бронирования',
        data: [0, stats.totalBookings],
        backgroundColor: '#facc15',
        borderColor: '#ca8a04',
        borderWidth: 1,
      },
    ],
  };
  // Обновляю barChartOptions для горизонтальных bar chart
  const horizontalBarChartOptions = {
    responsive: true,
    plugins: {
      legend: { display: true, position: 'top' as const },
      title: { display: false },
    },
    indexAxis: 'y' as const,
    scales: {
      x: { grid: { display: true }, title: { display: false }, beginAtZero: true, ticks: { font: { size: 12 } } },
      y: { grid: { display: true }, title: { display: false }, ticks: { font: { size: 12 } } },
    },
    elements: {
      bar: { borderRadius: 4, barPercentage: 0.5, categoryPercentage: 0.5 },
    },
    maintainAspectRatio: false,
  };
  const chartsAccordions = [
    {
      title: 'Динамика дохода',
      content: <div style={{height: 180, minWidth: 220}}><Line data={chartData1} options={{...chartOptions, maintainAspectRatio: false}} /></div>,
    },
    {
      title: 'Статус номеров',
      content: <div style={{height: 180, minWidth: 220}}><Pie data={chartData2} options={{...chartOptions, maintainAspectRatio: false}} /></div>,
    },
    {
      title: 'Гости и бронирования',
      content: <div style={{height: 180, minWidth: 220}}><Bar data={guestsBookingsBarData} options={horizontalBarChartOptions} /></div>,
    },
    {
      title: 'Номера по зданиям',
      content: <div style={{height: 180, minWidth: 220}}><Bar data={buildingsChartData} options={horizontalBarChartOptions} /></div>,
    },
  ];

  // Аккордеоны для статистики (оставляю текущие секции)
  const statsAccordions = [
    {
      title: 'Данные',
      content: (
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
                  <h3 className="font-bold text-base text-blue-900 mb-3 flex items-center gap-2">
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
      ),
    },
    {
      title: 'Статистика',
      content: (
        <div className="flex flex-row items-center gap-6 p-6 bg-white/90 rounded-2xl shadow-lg mb-2 border border-gray-100">
          <div className="flex-1 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="w-32 text-base font-medium text-gray-700">Свободные номера</span>
              <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                <div className="bg-gradient-to-r from-green-400 to-green-500 h-3 rounded-full transition-all duration-500 shadow-sm" style={{ width: `${(roomStatusCounts.free/totalRooms)*100 || 0}%` }}></div>
              </div>
              <span className="ml-2 text-sm font-bold text-gray-900">{roomStatusCounts.free}/{totalRooms}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-32 text-base font-medium text-gray-700">Занятые номера</span>
              <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                <div className="bg-gradient-to-r from-red-400 to-red-500 h-3 rounded-full transition-all duration-500 shadow-sm" style={{ width: `${(roomStatusCounts.busy/totalRooms)*100 || 0}%` }}></div>
              </div>
              <span className="ml-2 text-sm font-bold text-gray-900">{roomStatusCounts.busy}/{totalRooms}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-32 text-base font-medium text-gray-700">Недоступные</span>
              <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                <div className="bg-gradient-to-r from-orange-400 to-orange-500 h-3 rounded-full transition-all duration-500 shadow-sm" style={{ width: `${(roomStatusCounts.repair/totalRooms)*100 || 0}%` }}></div>
              </div>
              <span className="ml-2 text-sm font-bold text-gray-900">{roomStatusCounts.repair}/{totalRooms}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-32 text-base font-medium text-gray-700">Гости</span>
              <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                <div className="bg-gradient-to-r from-purple-400 to-purple-500 h-3 rounded-full transition-all duration-500 shadow-sm" style={{ width: `${(totalGuests/100)*100 || 0}%` }}></div>
              </div>
              <span className="ml-2 text-sm font-bold text-gray-900">{totalGuests}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-32 text-base font-medium text-gray-700">Бронирования</span>
              <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                <div className="bg-gradient-to-r from-green-400 to-green-500 h-3 rounded-full transition-all duration-500 shadow-sm" style={{ width: `${(totalBookings/100)*100 || 0}%` }}></div>
              </div>
              <span className="ml-2 text-sm font-bold text-gray-900">{totalBookings}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-32 text-base font-medium text-gray-700">Оплачено</span>
              <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-3 rounded-full transition-all duration-500 shadow-sm" style={{ width: `${(paidBookings/totalBookings)*100 || 0}%` }}></div>
              </div>
              <span className="ml-2 text-sm font-bold text-gray-900">{paidBookings}/{totalBookings}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Номера',
      content: (
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
      ),
    },
    {
      title: 'Детали бронирований',
      content: (
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
      ),
    },
    {
      title: 'Гости',
      content: (
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
      ),
    },
  ];

  if (!access) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return null;
  }

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
        <Breadcrumbs />
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

        {/* Блок с тремя большими кнопками */}
        <div className="flex flex-col items-center justify-center mt-6 mb-8 w-full">
          {!activeBigCard && (
            <div className="flex flex-col sm:flex-row gap-4 w-full justify-center px-2 md:px-8 xl:px-24">
            <button 
                className="flex-1 min-w-[180px] max-w-none bg-blue-100 text-gray-900 rounded-2xl font-bold text-base shadow-lg hover:shadow-2xl transition-all duration-200 transform hover:-translate-y-1 hover:scale-105 cursor-pointer border border-gray-200 hover:border-blue-400 px-6 py-7 flex flex-col items-center gap-3 group"
                onClick={() => setActiveBigCard('stats')}
              >
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mb-1 shadow group-hover:scale-110 transition-transform">
                  <FaChartBar className="text-white text-xl" />
                </div>
                <span className="text-base font-bold tracking-tight">Статистика</span>
                <span className="text-base text-gray-500 font-medium">Данные и детали</span>
              </button>
              <button
                className="flex-1 min-w-[180px] max-w-none bg-green-100 text-gray-900 rounded-2xl font-bold text-base shadow-lg hover:shadow-2xl transition-all duration-200 transform hover:-translate-y-1 hover:scale-105 cursor-pointer border border-gray-200 hover:border-green-400 px-6 py-7 flex flex-col items-center gap-3 group"
                onClick={() => setActiveBigCard('charts')}
              >
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mb-1 shadow group-hover:scale-110 transition-transform">
                  <FaChartBar className="text-white text-xl" />
                </div>
                <span className="text-base font-bold tracking-tight">Графики</span>
                <span className="text-base text-gray-500 font-medium">Визуализация</span>
              </button>
              <button
                className="flex-1 min-w-[180px] max-w-none bg-purple-100 text-gray-900 rounded-2xl font-bold text-base shadow-lg hover:shadow-2xl transition-all duration-200 transform hover:-translate-y-1 hover:scale-105 cursor-pointer border border-gray-200 hover:border-purple-400 px-6 py-7 flex flex-col items-center gap-3 group"
                onClick={() => setActiveBigCard('help')}
              >
                <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center mb-1 shadow group-hover:scale-110 transition-transform">
                  <FaQuestionCircle className="text-white text-xl" />
                </div>
                <span className="text-base font-bold tracking-tight">Помощь</span>
                <span className="text-base text-gray-500 font-medium">Инструкции</span>
            </button>
          </div>
        )}
          <div className={`w-full transition-all duration-300 ${activeBigCard ? 'max-w-full' : ''} px-0`}>
            {activeBigCard === 'stats' && (
              <BigActionCard
                icon={<FaChartBar className="text-white text-2xl" />}
                title="Статистика"
                description="Данные и детали"
                accordions={statsAccordions}
                onBack={() => setActiveBigCard(null)}
              />
            )}
            {activeBigCard === 'charts' && (
              <BigActionCard
                icon={<FaChartBar className="text-white text-2xl" />}
                title="Графики"
                description="Визуализация"
                accordions={chartsAccordions}
                onBack={() => setActiveBigCard(null)}
              />
            )}
            {activeBigCard === 'help' && (
              <BigActionCard
                icon={<FaQuestionCircle className="text-white text-2xl" />}
                title="Помощь"
                description="Инструкции"
                accordions={helpAccordions}
                onBack={() => setActiveBigCard(null)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 