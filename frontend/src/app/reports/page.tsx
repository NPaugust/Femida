"use client";
import { useEffect, useState } from "react";
import { API_URL } from "../../shared/api";
import { saveAs } from "file-saver";
import { FaFileCsv, FaFilter, FaSearch, FaCalendarAlt, FaBed, FaUsers, FaMoneyBillWave, FaChartLine, FaDownload, FaEye } from "react-icons/fa";
import Pagination from '../../components/Pagination';

interface Building {
  id: number;
  name: string;
  address?: string;
}

interface Room {
  id: number;
  number: string;
  building: Building | number;
  room_class: string | { value: string; label: string };
  room_type: string;
  capacity: number;
  status: string;
  description?: string;
  room_class_display?: { value: string; label: string };
}

interface Guest {
  id: number;
  full_name: string;
  phone?: string;
  inn?: string;
  total_spent?: string;
}

interface Booking {
  id: number;
  room: Room;
  guest: Guest;
  date_from: string;
  date_to: string;
  check_in?: string;
  check_out?: string;
  people_count: number;
  status: string;
  payment_status?: string;
  total_amount?: number;
  price_per_night?: number;
}

const ROOM_CLASS_LABELS: Record<string, string> = {
  standard: 'Стандарт',
  semi_lux: 'Полу-люкс',
  lux: 'Люкс',
};

const BOOKING_STATUSES = [
  { value: 'active', label: 'Активный', color: 'bg-green-100 text-green-800' },
  { value: 'completed', label: 'Завершён', color: 'bg-blue-100 text-blue-800' },
  { value: 'cancelled', label: 'Отменён', color: 'bg-red-100 text-red-800' },
];

export default function ReportsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    dateFrom: '',
    dateTo: '',
    room: '',
    guest: '',
    status: '',
    building: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const reportsPerPage = 9;
  const token = typeof window !== "undefined" ? localStorage.getItem("access") : "";
  const [sortState, setSortState] = useState<{ field: string | null; order: 'asc' | 'desc' | null }>({ field: null, order: null });

  useEffect(() => {
    if (!token) {
      window.location.href = '/login';
      return;
    }
    
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [bookingsResponse, roomsResponse, guestsResponse, buildingsResponse] = await Promise.all([
        fetch(`${API_URL}/api/bookings/`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/rooms/`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/guests/`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/buildings/`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (bookingsResponse.ok && roomsResponse.ok && guestsResponse.ok && buildingsResponse.ok) {
        const [bookingsData, roomsData, guestsData, buildingsData] = await Promise.all([
          bookingsResponse.json(),
          roomsResponse.json(),
          guestsResponse.json(),
          buildingsResponse.json(),
        ]);
        setBookings(bookingsData);
        setRooms(roomsData);
        setGuests(guestsData);
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

  const filtered = bookings.filter(b => {
    const matchesSearch = !filters.search || 
      b.guest.full_name.toLowerCase().includes(filters.search.toLowerCase()) ||
      b.guest.phone?.includes(filters.search) ||
      b.guest.inn?.includes(filters.search) ||
      b.room.number.includes(filters.search);
    
    const matchesDateFrom = !filters.dateFrom || 
      new Date(b.check_in ?? b.date_from) >= new Date(filters.dateFrom);
    
    const matchesDateTo = !filters.dateTo || 
      new Date(b.check_out ?? b.date_to) <= new Date(filters.dateTo);
    
    const matchesRoom = !filters.room || String(b.room.id) === filters.room;
    const matchesGuest = !filters.guest || String(b.guest.id) === filters.guest;
    const matchesStatus = !filters.status || b.status === filters.status;
    
    const matchesBuilding = !filters.building || (() => {
      const room = rooms.find(r => r.id === b.room.id);
      if (!room) return false;
      if (typeof room.building === 'object') {
        return room.building.id === parseInt(filters.building);
      } else {
        return room.building === parseInt(filters.building);
      }
    })();

    return matchesSearch && matchesDateFrom && matchesDateTo && matchesRoom && matchesGuest && matchesStatus && matchesBuilding;
  });

  // Пагинация
  const totalPages = Math.ceil(filtered.length / reportsPerPage);
  const paginatedReports = filtered.slice(
    (currentPage - 1) * reportsPerPage,
    currentPage * reportsPerPage
  );

  const exportToCSV = () => {
    const header = 'ID,Комната,Корпус,Класс,Тип,Статус,Гость,Телефон,ИНН,Дата заезда,Дата выезда,Кол-во гостей,Цена за ночь';
    const rows = filtered.map(b => {
      const room = rooms.find(r => r.id === b.room.id);
      let buildingName = '-';
      if (room) {
        if (typeof room.building === 'object' && room.building.name) {
          buildingName = room.building.name;
        } else if (typeof room.building === 'number') {
          const building = buildings.find(bld => bld.id === room.building);
          buildingName = building?.name || '-';
        }
      }
      
      return [
        b.id,
        `№${b.room.number}`,
        buildingName,
        typeof room?.room_class === 'object' && room?.room_class !== null ? room?.room_class.label : ROOM_CLASS_LABELS[room?.room_class as string] || room?.room_class || '-',
        room?.room_type || '-',
        BOOKING_STATUSES.find(s => s.value === b.status)?.label || b.status,
        b.guest.full_name,
        b.guest.phone || '-',
        b.guest.inn || '-',
        formatDate(b.check_in ?? b.date_from ?? ''),
        formatDate(b.check_out ?? b.date_to ?? ''),
        b.people_count,
        b.price_per_night || 0
      ].join(',');
    });
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `report_${new Date().toISOString().split('T')[0]}.csv`);
  };

  function formatDate(dateStr: string) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('ru-RU');
  }

  function getFieldValue(obj: any, path: string) {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  }

  const handleSort = (field: string) => {
    setSortState(prev => {
      if (prev.field !== field) return { field, order: 'asc' };
      if (prev.order === 'asc') return { field, order: 'desc' };
      if (prev.order === 'desc') return { field: null, order: null };
      return { field, order: 'asc' };
    });
  };

  const sortedReports = [...paginatedReports];
  if (sortState.field && sortState.order) {
    sortedReports.sort((a, b) => {
      let aValue = getFieldValue(a, sortState.field!);
      let bValue = getFieldValue(b, sortState.field!);
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();
      if (aValue < bValue) return sortState.order === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortState.order === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const getReportStatistics = () => {
    const total = bookings.length;
    const active = bookings.filter(b => b.status === 'active').length;
    const completed = bookings.filter(b => b.status === 'completed').length;
    const totalRevenue = bookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
    
    return { total, active, completed, totalRevenue };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка отчётов...</p>
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

  const stats = getReportStatistics();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Верхняя панель */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Отчёты</h1>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <FaChartLine className="text-blue-600" />
              <span>{stats.total} бронирований</span>
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
              <FaDownload />
              Экспорт CSV
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
                <FaChartLine className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Всего бронирований</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <FaBed className="text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Активных</p>
                <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FaUsers className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Завершённых</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <FaMoneyBillWave className="text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Общая выручка</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalRevenue.toLocaleString()} сом</p>
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
                  placeholder="Гость, телефон, ИНН, номер..."
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Дата заезда</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Дата выезда</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Статус</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Все статусы</option>
                {BOOKING_STATUSES.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Номер</label>
              <select
                value={filters.room}
                onChange={(e) => setFilters(prev => ({ ...prev, room: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Все номера</option>
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>№{r.number}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Гость</label>
              <select
                value={filters.guest}
                onChange={(e) => setFilters(prev => ({ ...prev, guest: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Все гости</option>
                {guests.map(g => (
                  <option key={g.id} value={g.id}>{g.full_name}</option>
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
                {buildings.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Контент */}
      <div className="px-6 py-6">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <FaChartLine className="text-gray-400 text-6xl mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Нет данных</h3>
            <p className="text-gray-500 mb-4">
              {filters.search || filters.dateFrom || filters.dateTo || filters.room || filters.guest || filters.status || filters.building
                ? 'Попробуйте изменить фильтры'
                : 'Нет бронирований для отображения'
              }
            </p>
          </div>
        ) : (
          <div className='rounded-lg shadow bg-white w-full'>
            <table className='w-full text-sm'>
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="bg-gray-50 text-gray-700">
                  <th className="p-3 text-center">ID</th>
                  <th className="p-3 text-center">Номер</th>
                  <th className="p-3 text-center">Здание</th>
                  <th className="p-3 text-center">Класс</th>
                  <th className="p-3 text-center">Статус</th>
                  <th className="p-3 text-center">Гость</th>
                  <th className="p-3 text-center">Телефон</th>
                  <th className="p-3 text-center">Заезд</th>
                  <th className="p-3 text-center">Выезд</th>
                  <th className="p-3 text-center">Гости</th>
                  <th className="p-3 text-center">Оплачено</th>
                  <th className="p-3 text-center">Цена</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedReports.map((b: Booking) => {
                  const room = rooms.find(r => r.id === b.room.id);
                  let buildingName = '-';
                  if (room) {
                    if (typeof room.building === 'object' && room.building.name) {
                      buildingName = room.building.name;
                    } else if (typeof room.building === 'number') {
                      const building = buildings.find(bld => bld.id === room.building);
                      buildingName = building?.name || '-';
                    }
                  }
                  
                  const status = BOOKING_STATUSES.find(s => s.value === b.status);
                  
                  return (
                    <tr key={b.id} className="hover:bg-blue-50 transition-colors">
                      <td className="p-3 text-center text-sm text-gray-500">#{b.id}</td>
                      <td className="p-3 text-center">
                        <div className="font-medium text-gray-900">№{b.room.number}</div>
                      </td>
                      <td className="p-3 text-center text-sm">{buildingName}</td>
                      <td className="p-3 text-center">
                        {room?.room_class_display?.label
                          || (typeof room?.room_class === 'object' && room?.room_class !== null ? room?.room_class.label
                          : ROOM_CLASS_LABELS[room?.room_class as string] || room?.room_class || '-')}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status?.color || 'bg-gray-100 text-gray-800'}`}>
                          {status?.label || b.status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div>
                          <div className="font-medium text-gray-900">{b.guest.full_name}</div>
                          <div className="text-sm text-gray-500">{b.guest.inn || '—'}</div>
                        </div>
                      </td>
                      <td className="p-3 text-center text-sm">{b.guest.phone || '—'}</td>
                      <td className="p-3 text-center text-sm">{formatDate(b.check_in ?? b.date_from ?? '')}</td>
                      <td className="p-3 text-center text-sm">{formatDate(b.check_out ?? b.date_to ?? '')}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center gap-2 text-sm">
                          <FaUsers className="text-gray-400" />
                          <span>{b.people_count}</span>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          b.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                          b.payment_status === 'unpaid' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {b.payment_status === 'paid' ? 'Оплачено' :
                           b.payment_status === 'unpaid' ? 'Не оплачено' :
                           'В ожидании'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="font-medium text-green-600">
                          {b.total_amount ? `${Math.round(b.total_amount).toLocaleString()} сом` : '—'}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="px-6 py-4 bg-white border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Показано {((currentPage - 1) * reportsPerPage) + 1} - {Math.min(currentPage * reportsPerPage, filtered.length)} из {filtered.length}
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
  );
} 