"use client";
import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { FaTrash, FaUndo, FaTrashAlt, FaEye, FaFilter, FaSearch, FaBed, FaUser, FaCalendarCheck, FaExclamationTriangle } from "react-icons/fa";
import { API_URL } from "../../shared/api";
import ConfirmModal from "../../components/ConfirmModal";
import HighlightedText from "../../components/HighlightedText";
import Pagination from '../../components/Pagination';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import Breadcrumbs from '../../components/Breadcrumbs';

interface TrashItem {
  id: number;
  type: 'room' | 'guest' | 'booking';
  name: string;
  description: string;
  deleted_at: string;
  data: any;
}

export default function TrashPage() {
  const searchParams = useSearchParams();
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    type: '',
    dateFrom: '',
    dateTo: '',
  });
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [showConfirmRestore, setShowConfirmRestore] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [actionTarget, setActionTarget] = useState<number | number[] | null>(null);
  const [actionType, setActionType] = useState<'restore' | 'delete' | null>(null);

  const access = useSelector((state: RootState) => state.auth.access);

  // СНАЧАЛА фильтрация
  const filteredItems = trashItems.filter(item => {
    const matchesSearch = !filters.search || item.name.toLowerCase().includes(filters.search.toLowerCase()) || item.description.toLowerCase().includes(filters.search.toLowerCase());
    const matchesType = !filters.type || item.type === filters.type;
    const matchesDateFrom = !filters.dateFrom || new Date(item.deleted_at) >= new Date(filters.dateFrom);
    const matchesDateTo = !filters.dateTo || new Date(item.deleted_at) <= new Date(filters.dateTo);
    return matchesSearch && matchesType && matchesDateFrom && matchesDateTo;
  });

  // Сбрасываем страницу при изменении фильтров
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // ПОТОМ пагинация
  const [currentPage, setCurrentPage] = useState(1);
  const trashPerPage = 10;
  const totalPages = Math.ceil(filteredItems.length / trashPerPage);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * trashPerPage,
    currentPage * trashPerPage
  );

  useEffect(() => {
    fetchTrashData();
  }, []);

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

  const fetchTrashData = async () => {
    try {
      if (!access) {
        window.location.href = '/login';
        return;
      }
      setLoading(true);
      const types = ['rooms', 'guests', 'bookings'];
      let allTrash: TrashItem[] = [];
      for (const type of types) {
        const res = await fetch(`${API_URL}/api/trash/${type}/`, {
          headers: { 'Authorization': `Bearer ${access}` },
        });
        if (!res.ok) throw new Error('Ошибка загрузки корзины');
        const data = await res.json();
        allTrash = allTrash.concat(data.map((item: any) => ({
          id: item.id,
          type: type.slice(0, -1),
          name: item.number || item.full_name || `Бронирование #${item.id}`,
          description: item.description || item.notes || item.comment || '',
          deleted_at: item.deleted_at || '',
          data: item,
        })));
      }
      setTrashItems(allTrash);
    } catch (error) {
      setError('Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = (itemId: number) => {
    setActionTarget(itemId);
    setActionType('restore');
    setShowConfirmRestore(true);
  };

  const handleDelete = (itemId: number) => {
    setActionTarget(itemId);
    setActionType('delete');
    setShowConfirmDelete(true);
  };

  const confirmRestore = async () => {
    if (!actionTarget) return;
    try {
      if (!access) {
        window.location.href = '/login';
        return;
      }
      const ids = Array.isArray(actionTarget) ? actionTarget : [actionTarget];
      for (const id of ids) {
        const item = trashItems.find(i => i.id === id);
        if (!item) continue;
        const res = await fetch(`${API_URL}/api/trash/restore/${item.type}s/${id}/`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${access}` },
        });
        if (!res.ok) throw new Error('Ошибка восстановления');
      }
      // После успешного восстановления обновляем список
      fetchTrashData();
      setSelectedItemIds([]);
    } catch (error) {
      setError('Ошибка при восстановлении');
    } finally {
      setActionTarget(null);
      setActionType(null);
      setShowConfirmRestore(false);
    }
  };

  const confirmDelete = async () => {
    if (!actionTarget) return;
    try {
      if (!access) {
        window.location.href = '/login';
        return;
      }
      const ids = Array.isArray(actionTarget) ? actionTarget : [actionTarget];
      for (const id of ids) {
        const item = trashItems.find(i => i.id === id);
        if (!item) continue;
        const res = await fetch(`${API_URL}/api/trash/delete/${item.type}s/${id}/`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${access}` },
        });
        if (!res.ok) throw new Error('Ошибка удаления');
      }
      // После успешного удаления обновляем список
      fetchTrashData();
      setSelectedItemIds([]);
    } catch (error) {
      setError('Ошибка при удалении');
    } finally {
      setActionTarget(null);
      setActionType(null);
      setShowConfirmDelete(false);
    }
  };

  const handleSelectItem = (id: number) => {
    setSelectedItemIds(prev => 
      prev.includes(id) 
        ? prev.filter(itemId => itemId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedItemIds.length === filteredItems.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(filteredItems.map(item => item.id));
    }
  };

  const handleMassRestore = () => {
    setActionTarget(selectedItemIds);
    setActionType('restore');
    setShowConfirmRestore(true);
  };

  const handleMassDelete = () => {
    setActionTarget(selectedItemIds);
    setActionType('delete');
    setShowConfirmDelete(true);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'room':
        return <FaBed className="text-blue-600" />;
      case 'guest':
        return <FaUser className="text-green-600" />;
      case 'booking':
        return <FaCalendarCheck className="text-purple-600" />;
      default:
        return <FaTrash className="text-gray-600" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'room':
        return 'Номер';
      case 'guest':
        return 'Гость';
      case 'booking':
        return 'Бронирование';
      default:
        return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'room':
        return 'bg-blue-100 text-blue-800';
      case 'guest':
        return 'bg-green-100 text-green-800';
      case 'booking':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('ru-RU') + ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const getTrashStatistics = () => {
    const total = trashItems.length;
    const rooms = trashItems.filter(item => item.type === 'room').length;
    const guests = trashItems.filter(item => item.type === 'guest').length;
    const bookings = trashItems.filter(item => item.type === 'booking').length;
    
    return { total, rooms, guests, bookings };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка корзины...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-600 mb-4">{error}</p>
        <button 
          onClick={fetchTrashData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  const stats = getTrashStatistics();

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumbs />
      {/* Верхняя панель */}
      <div className="bg-white border-b border-red-200 px-6 py-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
              <FaTrash className="text-white text-xl" />
            </div>
            <div>
            <h1 className="text-2xl font-bold text-gray-900">Корзина</h1>
              <p className="text-sm text-gray-600">Удаленные элементы</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-red-50 px-3 py-1 rounded-full">
              <FaExclamationTriangle className="text-red-600" />
              <span>{stats.total} элементов</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-300 ${
                showFilters 
                  ? 'bg-red-50 border-red-200 text-red-700 shadow-md' 
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:shadow-md'
              }`}
            >
              <FaFilter />
              Фильтры
            </button>
            
            <button
              onClick={handleMassRestore}
              disabled={selectedItemIds.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <FaUndo />
              Восстановить
            </button>
            
            <button
              onClick={handleMassDelete}
              disabled={selectedItemIds.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <FaTrashAlt />
              Удалить
            </button>
          </div>
        </div>
      </div>

      {/* Статистика */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl shadow-lg p-6 border border-red-200 hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <FaTrash className="text-white text-xl" />
              </div>
              <div>
                <p className="text-sm text-red-700 font-bold">Всего удалено</p>
                <p className="text-3xl font-bold text-red-900">{stats.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-lg p-6 border border-blue-200 hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <FaBed className="text-white text-xl" />
              </div>
              <div>
                <p className="text-sm text-blue-700 font-bold">Номеров</p>
                <p className="text-3xl font-bold text-blue-900">{stats.rooms}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl shadow-lg p-6 border border-green-200 hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <FaUser className="text-white text-xl" />
              </div>
              <div>
                <p className="text-sm text-green-700 font-bold">Гостей</p>
                <p className="text-3xl font-bold text-green-900">{stats.guests}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl shadow-lg p-6 border border-purple-200 hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <FaCalendarCheck className="text-white text-xl" />
              </div>
              <div>
                <p className="text-sm text-purple-700 font-bold">Бронирований</p>
                <p className="text-3xl font-bold text-purple-900">{stats.bookings}</p>
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* Контент */}
      <div className="px-6 py-6">
        {paginatedItems.length === 0 ? (
          <div className="text-center py-12">
            <FaTrash className="text-gray-400 text-6xl mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Корзина пуста</h3>
            <p className="text-gray-500 mb-4">
              {filters.search || filters.type || filters.dateFrom || filters.dateTo
                ? 'Попробуйте изменить фильтры'
                : 'Удалённые элементы появятся здесь'
              }
            </p>
          </div>
        ) : (
          <div className='rounded-lg shadow bg-white w-full'>
            <table className='w-full text-sm'>
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="bg-gray-50 text-gray-700">
                  <th className="p-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedItemIds.length === filteredItems.length && filteredItems.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                              <th className="p-3 text-left text-sm font-bold text-gray-700">Тип</th>
            <th className="p-3 text-left text-sm font-bold text-gray-700">Название</th>
            <th className="p-3 text-left text-sm font-bold text-gray-700">Описание</th>
            <th className="p-3 text-left text-sm font-bold text-gray-700">Дата удаления</th>
            <th className="p-3 text-left text-sm font-bold text-gray-700">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50 transition-colors">
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedItemIds.includes(item.id)}
                        onChange={() => handleSelectItem(item.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="p-3 text-left">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(item.type)}
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(item.type)}`}>
                          {getTypeLabel(item.type)}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-left">
                      <HighlightedText 
                        text={item.name} 
                        searchQuery={filters.search} 
                        className="font-medium text-gray-900" 
                      />
                      <div className="text-sm text-gray-500">#{item.id}</div>
                    </td>
                    <td className="p-3 text-left">
                      <div className="text-sm text-gray-700">{item.description}</div>
                    </td>
                    <td className="p-3 text-left">
                      <div className="text-sm text-gray-600">{formatDate(item.deleted_at)}</div>
                    </td>
                    <td className="p-3 text-left">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRestore(item.id)}
                          className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                          title="Восстановить"
                        >
                          <FaUndo />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                          title="Удалить навсегда"
                        >
                          <FaTrashAlt />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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
              Показано {((currentPage - 1) * trashPerPage) + 1} - {Math.min(currentPage * trashPerPage, filteredItems.length)} из {filteredItems.length}
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      )}

      {/* Массовые действия */}
      {selectedItemIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex gap-4 bg-white shadow-xl rounded-full px-6 py-3 border items-center animate-fade-in">
          <span className="font-semibold text-blue-700">Выбрано: {selectedItemIds.length}</span>
          <button
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow flex items-center gap-2"
            onClick={handleMassRestore}
          >
            <FaUndo /> Восстановить
          </button>
          <button
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded shadow flex items-center gap-2"
            onClick={handleMassDelete}
          >
            <FaTrashAlt /> Удалить навсегда
          </button>
          <button
            className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded shadow flex items-center gap-2"
            onClick={() => { setSelectedItemIds([]); }}
          >
            Отмена
          </button>
        </div>
      )}

      {/* Модалка подтверждения восстановления */}
      <ConfirmModal
        open={showConfirmRestore}
        title="Восстановить элементы?"
        description={
          Array.isArray(actionTarget) 
            ? `Вы действительно хотите восстановить ${actionTarget.length} элементов?`
            : "Вы действительно хотите восстановить этот элемент?"
        }
        confirmText="Восстановить"
        cancelText="Отмена"
        onConfirm={confirmRestore}
        onCancel={() => {
          setShowConfirmRestore(false);
          setActionTarget(null);
          setActionType(null);
        }}
      />

      {/* Модалка подтверждения удаления */}
      <ConfirmModal
        open={showConfirmDelete}
        title="Удалить навсегда?"
        description={
          <div className="text-center">
            <FaExclamationTriangle className="text-red-500 text-4xl mx-auto mb-4" />
            <p className="text-red-600 font-semibold mb-2">Внимание!</p>
            <p>
              {Array.isArray(actionTarget) 
                ? `Вы действительно хотите окончательно удалить ${actionTarget.length} элементов? Это действие необратимо.`
                : "Вы действительно хотите окончательно удалить этот элемент? Это действие необратимо."
              }
            </p>
          </div>
        }
        confirmText="Удалить навсегда"
        cancelText="Отмена"
        confirmClassName="bg-red-600 hover:bg-red-700"
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowConfirmDelete(false);
          setActionTarget(null);
          setActionType(null);
        }}
      />

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
              placeholder="Название, описание..."
            />
            <FaSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
          </div>

          <label className="font-semibold">Тип</label>
          <select
            value={filters.type}
            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Все типы</option>
            <option value="room">Номера</option>
            <option value="guest">Гости</option>
            <option value="booking">Бронирования</option>
          </select>

          <label className="font-semibold">Дата удаления</label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />

          <label className="font-semibold">До</label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />

          <div className="flex gap-2 mt-4">
            <button type="button" onClick={() => setFilters({ search: '', type: '', dateFrom: '', dateTo: '' })} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-5 py-2 rounded font-semibold flex-1">Сбросить</button>
            <button type="button" onClick={() => setShowFilters(false)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-semibold shadow flex-1">Применить</button>
          </div>
        </div>
      </div>
    </div>
  );
} 