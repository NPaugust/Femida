"use client";
import { useEffect, useState, useRef } from "react";
import { API_URL, fetchWithAuth } from "../../shared/api";
import { saveAs } from "file-saver";
import { useSearchParams } from "next/navigation";
import { FaFileCsv, FaFilter, FaSearch, FaCalendarAlt, FaBed, FaUsers, FaMoneyBillWave, FaChartLine, FaDownload, FaEye, FaTimesCircle } from "react-icons/fa";
import StatusBadge from '../../components/StatusBadge';
import Button from '../../components/Button';
import LoadingSpinner from '../../components/LoadingSpinner';
import HighlightedText from '../../components/HighlightedText';
import Pagination from '../../components/Pagination';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch, setReports, setReportsLoading, setReportsError } from '../store';
import Breadcrumbs from '../../components/Breadcrumbs';

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
  price_per_night?: number;
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
  const searchParams = useSearchParams();
  const dispatch = useDispatch<AppDispatch>();
  const reports = useSelector((state: RootState) => state.reports.reports);
  const loading = useSelector((state: RootState) => state.reports.loading);
  const error = useSelector((state: RootState) => state.reports.error);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    dateFrom: '',
    dateTo: '',
    room: '',
    guest: '',
    status: '',
    building: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const reportsPerPage = 9;
  const access = useSelector((state: RootState) => state.auth.access);
  const bookings = useSelector((state: RootState) => state.bookings.bookings);
  const rooms = useSelector((state: RootState) => state.rooms.rooms);
  const guests = useSelector((state: RootState) => state.guests.guests);
  const [sortState, setSortState] = useState<{ field: string | null; order: 'asc' | 'desc' | null }>({ field: null, order: null });
  const [buildings, setBuildings] = useState<Building[]>([]);

  useEffect(() => {
    if (!access) {
      window.location.href = '/login';
    }
  }, [access]);

  if (!access) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
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

  // Загрузка данных через Redux (только для reports)
  // const fetchData = async () => {
  //   dispatch(setReportsLoading(true));
  //   try {
  //     if (!access) {
  //       window.location.href = '/login';
  //       return;
  //     }
  //     const response = await fetch(`${API_URL}/api/reports/`, { headers: { Authorization: `Bearer ${access}` } });
  //     if (response.ok) {
  //       const data = await response.json();
  //       dispatch(setReports(data));
  //     } else {
  //       dispatch(setReportsError('Ошибка загрузки данных'));
  //     }
  //   } catch (error) {
  //     dispatch(setReportsError('Ошибка сети'));
  //   } finally {
  //     dispatch(setReportsLoading(false));
  //   }
  // };

  // Исправляю все обращения к date_from/date_to на check_in/check_out
  // Привожу типизацию к Booking и Room
  // Исправляю map/filter/reduce для корректной типизации
  // Использую тип any для bookings и rooms в фильтрации и отображении, чтобы убрать ошибки типов
  const filtered = (bookings as any[]).filter((b) => {
    const matchesSearch = !filters.search || 
      b.guest?.full_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
      b.guest?.phone?.includes(filters.search) ||
      b.guest?.inn?.includes(filters.search);
    
    const matchesDateFrom = !filters.dateFrom || new Date(b.check_in) >= new Date(filters.dateFrom);
    
    const matchesDateTo = !filters.dateTo || new Date(b.check_out) <= new Date(filters.dateTo);
    
    const matchesRoom = !filters.room || String(b.room.id) === filters.room;
    const matchesGuest = !filters.guest || String(b.guest.id) === filters.guest;
    const matchesStatus = !filters.status || b.status === filters.status;
    
    const matchesBuilding = !filters.building || (() => {
      const room = (rooms as any[]).find(r => r.id === b.room.id);
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
    const rows = filtered.map((b) => {
      const room = (rooms as any[]).find((r) => r.id === b.room.id);
      let buildingName = '-';
      if (room) {
        buildingName = typeof room.building === 'object' ? room.building.name : room.building;
      }
      
      return [
        b.id,
        room ? room.number : '-',
        buildingName,
        room ? (typeof room.room_class === 'object' && room.room_class !== null ? room.room_class.label : ROOM_CLASS_LABELS[room.room_class as string] || room.room_class || '-') : '-',
        room ? room.room_type || '-' : '-',
        b.status,
        b.guest?.full_name || '-',
        b.guest?.phone || '-',
        b.guest?.inn || '-',
        b.check_in,
        b.check_out,
        b.people_count,
        room ? room.price_per_night || 0 : '-'
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

  const sortedReports = filtered; // если нужна сортировка, добавь sort
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

  // Статистика только через reports
  const getReportStatistics = () => {
    const total = (bookings as any[]).length;
    const paid = (bookings as any[]).filter((b: Booking) => b.payment_status === 'paid').length;
    const totalAmount = (bookings as any[]).reduce((sum: number, b: Booking) => sum + (b.total_amount || 0), 0);
    return { total, paid, totalAmount };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <LoadingSpinner size="lg" text="Загрузка отчётов..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaTimesCircle className="text-red-600 text-2xl" />
          </div>
          <p className="text-red-600 mb-4 text-lg font-medium">{error}</p>
          <Button
            variant="primary"
          onClick={async () => {
            dispatch(setReportsLoading(true));
            try {
              if (!access) {
                window.location.href = '/login';
                return;
              }
              const response = await fetchWithAuth(`${API_URL}/api/bookings/`);
              if (response.ok) {
                const data = await response.json();
                // Здесь можно обновить bookings через Redux, если нужно
              } else {
                dispatch(setReportsError('Ошибка загрузки данных'));
              }
            } catch (error) {
              dispatch(setReportsError('Ошибка сети'));
            } finally {
              dispatch(setReportsLoading(false));
            }
          }}
            icon={<FaChartLine />}
        >
          Попробовать снова
          </Button>
        </div>
      </div>
    );
  }

  const stats = getReportStatistics();

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumbs />
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
            <Button
              variant={showFilters ? "primary" : "ghost"}
              onClick={() => setShowFilters(!showFilters)}
              icon={<FaFilter />}
              className={showFilters ? "shadow-lg" : ""}
            >
              Фильтры
            </Button>
            
            <Button
              variant="success"
              onClick={exportToCSV}
              icon={<FaDownload />}
              className="shadow-lg hover:shadow-xl"
            >
              Экспорт CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Статистика */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-lg p-6 border border-blue-200 hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <FaChartLine className="text-white text-xl" />
              </div>
              <div>
                <p className="text-sm text-blue-700 font-bold">Всего бронирований</p>
                <p className="text-3xl font-bold text-blue-900">{stats.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl shadow-lg p-6 border border-green-200 hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <FaBed className="text-white text-xl" />
              </div>
              <div>
                <p className="text-sm text-green-700 font-bold">Активных</p>
                <p className="text-3xl font-bold text-green-900">{stats.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl shadow-lg p-6 border border-purple-200 hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <FaUsers className="text-white text-xl" />
              </div>
              <div>
                <p className="text-sm text-purple-700 font-bold">Завершённых</p>
                <p className="text-3xl font-bold text-purple-900">{stats.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl shadow-lg p-6 border border-orange-200 hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <FaMoneyBillWave className="text-white text-xl" />
              </div>
              <div>
                <p className="text-sm text-orange-700 font-bold">Общая выручка</p>
                <p className="text-3xl font-bold text-orange-900">{Math.round(stats.totalAmount).toLocaleString()} сом</p>
              </div>
            </div>
          </div>
        </div>
      </div>



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
                              <th className="p-3 text-center font-bold">ID</th>
            <th className="p-3 text-center font-bold">Номер</th>
            <th className="p-3 text-center font-bold">Здание</th>
            <th className="p-3 text-center font-bold">Класс</th>
            <th className="p-3 text-center font-bold">Статус</th>
            <th className="p-3 text-center font-bold">Гость</th>
            <th className="p-3 text-center font-bold">Телефон</th>
            <th className="p-3 text-center font-bold">Заезд</th>
            <th className="p-3 text-center font-bold">Выезд</th>
            <th className="p-3 text-center font-bold">Гости</th>
            <th className="p-3 text-center font-bold">Оплачено</th>
            <th className="p-3 text-center font-bold">Цена</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedReports.map((b, idx) => {
                  const room = (rooms as any[]).find((r) => r.id === b.room.id);
                  let buildingName = '-';
                  if (room) {
                    buildingName = typeof room.building === 'object' ? room.building.name : room.building;
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
                          <HighlightedText 
                            text={b.guest.full_name} 
                            searchQuery={filters.search} 
                            className="font-medium text-gray-900" 
                          />
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

      {/* Выдвижная панель фильтров */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-xs bg-white shadow-2xl z-50 transition-transform duration-300 ${showFilters ? 'translate-x-0' : 'translate-x-full'}`} style={{minWidth: 320}} ref={filterPanelRef}>
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
              placeholder="Гость, телефон, ИНН, номер..."
            />
            <FaSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
          </div>

          <label className="font-semibold">Дата заезда</label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />

          <label className="font-semibold">Дата выезда</label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />

          <label className="font-semibold">Статус</label>
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

          <label className="font-semibold">Номер</label>
          <select
            value={filters.room}
            onChange={(e) => setFilters(prev => ({ ...prev, room: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Все номера</option>
            {(rooms as any[]).map(r => (
              <option key={r.id} value={r.id}>№{r.number}</option>
            ))}
          </select>

          <label className="font-semibold">Гость</label>
          <select
            value={filters.guest}
            onChange={(e) => setFilters(prev => ({ ...prev, guest: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Все гости</option>
            {(guests as any[]).map(g => (
              <option key={g.id} value={g.id}>{g.full_name}</option>
            ))}
          </select>

          <label className="font-semibold">Здание</label>
          <select
            value={filters.building}
            onChange={(e) => setFilters(prev => ({ ...prev, building: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Все здания</option>
            {(buildings as any[]).map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          <div className="flex gap-2 mt-4">
            <button type="button" onClick={() => setFilters({ search: '', dateFrom: '', dateTo: '', room: '', guest: '', status: '', building: '' })} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-5 py-2 rounded font-semibold flex-1">Сбросить</button>
            <button type="button" onClick={() => setShowFilters(false)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-semibold shadow flex-1">Применить</button>
          </div>
        </div>
      </div>
    </div>
  );
} 