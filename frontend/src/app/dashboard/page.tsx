'use client';

import { useEffect, useState } from 'react';
import { FaUsers, FaBed, FaMoneyBillWave, FaCalendarAlt, FaChartLine, FaChartBar, FaStar, FaMapMarkerAlt, FaPlus, FaUserPlus } from 'react-icons/fa';
import { API_URL } from '../../shared/api';
import Link from 'next/link';

type DashboardData = {
  totalGuests: number;
  totalRooms: number;
  totalBookings: number;
  monthlyRevenue: number;
  activeBookings: number;
  occupancyRate: number;
  averageRating: number;
  topGuests: Array<{
    id: number;
    full_name: string;
    total_spent: number;
    visits_count: number;
  }>;
  recentBookings: Array<{
    id: number;
    guest: { full_name: string };
    room: { number: string; building: { name: string } };
    check_in: string;
    check_out: string;
    total_amount: number;
    status: string;
  }>;
  revenueByMonth: Array<{ month: string; revenue: number }>;
  bookingsByDay: Array<{ date: string; count: number }>;
  popularRooms: Array<{ room: string; bookings: number; revenue: number }>;
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setToken(localStorage.getItem('access'));
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    fetchDashboardData();
  }, [token]);

  const fetchDashboardData = async () => {
    try {
      const [guestsRes, roomsRes, bookingsRes] = await Promise.all([
        fetch(`${API_URL}/api/guests/`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/api/rooms/`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/api/bookings/`, { headers: { 'Authorization': `Bearer ${token}` } }),
      ]);

      const [guests, rooms, bookings] = await Promise.all([
        guestsRes.json(),
        roomsRes.json(),
        bookingsRes.json(),
      ]);

      // Рассчитываем статистику
      const monthlyRevenue = bookings
        .filter((b: any) => {
          const bookingDate = new Date(b.created_at);
          const now = new Date();
          return bookingDate.getMonth() === now.getMonth() && bookingDate.getFullYear() === now.getFullYear();
        })
        .reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0);

      const activeBookings = bookings.filter((b: any) => b.status === 'active').length;
      const occupancyRate = rooms.length > 0 ? Math.round((activeBookings / rooms.length) * 100) : 0;

      const topGuests = guests
        .sort((a: any, b: any) => (b.total_spent || 0) - (a.total_spent || 0))
        .slice(0, 5);

      const recentBookings = bookings
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

      // Генерируем данные для графиков
      const revenueByMonth = generateRevenueData(bookings);
      const bookingsByDay = generateBookingsData(bookings);
      const popularRooms = generatePopularRoomsData(bookings);

      setData({
        totalGuests: guests.length,
        totalRooms: rooms.length,
        totalBookings: bookings.length,
        monthlyRevenue,
        activeBookings,
        occupancyRate,
        averageRating: 4.5, // Заглушка
        topGuests,
        recentBookings,
        revenueByMonth,
        bookingsByDay,
        popularRooms,
      });
    } catch (err) {
      setError('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const generateRevenueData = (bookings: any[]) => {
    const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
    return months.map((month, index) => ({
      month,
      revenue: bookings
        .filter((b: any) => new Date(b.created_at).getMonth() === index)
        .reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0),
    }));
  };

  const generateBookingsData = (bookings: any[]) => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map(date => ({
      date: new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
      count: bookings.filter((b: any) => b.check_in === date).length,
    }));
  };

  const generatePopularRoomsData = (bookings: any[]) => {
    const roomStats: { [key: string]: { bookings: number; revenue: number } } = {};
    
    bookings.forEach((b: any) => {
      const roomKey = `${b.room?.building?.name} ${b.room?.number}`;
      if (!roomStats[roomKey]) {
        roomStats[roomKey] = { bookings: 0, revenue: 0 };
      }
      roomStats[roomKey].bookings++;
      roomStats[roomKey].revenue += b.total_amount || 0;
    });

    return Object.entries(roomStats)
      .map(([room, stats]) => ({ room, ...stats }))
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 5);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-8">
      {/* Заголовок и быстрые действия */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Дашборд</h1>
          <p className="text-gray-600">Обзор деятельности пансионата</p>
        </div>
        <div className="flex gap-3">
          <Link href="/bookings?add=1" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow transition-all">
            <FaPlus /> Новое бронирование
          </Link>
          <Link href="/guests?add=1" className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow transition-all">
            <FaUserPlus /> Добавить гостя
          </Link>
        </div>
      </div>

      {/* Ключевые показатели */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Всего гостей</p>
              <p className="text-3xl font-bold text-gray-800">{data.totalGuests}</p>
            </div>
            <FaUsers className="text-3xl text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Доход за месяц</p>
              <p className="text-3xl font-bold text-gray-800">{data.monthlyRevenue.toLocaleString()} сом</p>
            </div>
            <FaMoneyBillWave className="text-3xl text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Загрузка номеров</p>
              <p className="text-3xl font-bold text-gray-800">{data.occupancyRate}%</p>
            </div>
            <FaBed className="text-3xl text-purple-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Активных бронирований</p>
              <p className="text-3xl font-bold text-gray-800">{data.activeBookings}</p>
            </div>
            <FaCalendarAlt className="text-3xl text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Графики и аналитика */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* График доходов */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FaChartLine className="text-blue-500" />
            Доход по месяцам
          </h3>
          <div className="h-64 flex items-end justify-between gap-2">
            {data.revenueByMonth.map((item, index) => (
              <div key={index} className="flex flex-col items-center flex-1">
                <div 
                  className="bg-blue-500 rounded-t w-full transition-all hover:bg-blue-600"
                  style={{ height: `${Math.max(10, (item.revenue / Math.max(...data.revenueByMonth.map(r => r.revenue))) * 200)}px` }}
                ></div>
                <span className="text-xs text-gray-600 mt-2">{item.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* График бронирований */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FaChartBar className="text-green-500" />
            Бронирования за неделю
          </h3>
          <div className="h-64 flex items-end justify-between gap-2">
            {data.bookingsByDay.map((item, index) => (
              <div key={index} className="flex flex-col items-center flex-1">
                <div 
                  className="bg-green-500 rounded-t w-full transition-all hover:bg-green-600"
                  style={{ height: `${Math.max(10, (item.count / Math.max(...data.bookingsByDay.map(b => b.count))) * 200)}px` }}
                ></div>
                <span className="text-xs text-gray-600 mt-2">{item.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Топ гости и последние бронирования */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Топ гости */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FaStar className="text-yellow-500" />
            Топ гости
          </h3>
          <div className="space-y-3">
            {data.topGuests.map((guest, index) => (
              <div key={guest.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-yellow-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold">{guest.full_name}</p>
                    <p className="text-sm text-gray-600">{guest.visits_count} посещений</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600">{guest.total_spent?.toLocaleString()} сом</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Последние бронирования */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FaCalendarAlt className="text-purple-500" />
            Последние бронирования
          </h3>
          <div className="space-y-3">
            {data.recentBookings.map((booking) => (
              <div key={booking.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-semibold">{booking.guest.full_name}</p>
                  <p className="text-sm text-gray-600">
                    {booking.room.building.name} {booking.room.number}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(booking.check_in).toLocaleDateString()} — {new Date(booking.check_out).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600">{booking.total_amount?.toLocaleString()} сом</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    booking.status === 'active' ? 'bg-green-100 text-green-800' :
                    booking.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {booking.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 