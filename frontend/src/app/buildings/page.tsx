"use client";
import { useEffect, useState } from 'react';
import { FaPlus, FaEdit, FaTrash, FaChevronDown, FaChevronUp, FaBed, FaBuilding, FaFileCsv, FaSearch, FaFilter, FaTimesCircle } from 'react-icons/fa';
import StatusBadge from '../../components/StatusBadge';
import Button from '../../components/Button';
import LoadingSpinner from '../../components/LoadingSpinner';
import { API_URL, fetchWithAuth } from '../../shared/api';
import React from 'react';
import Pagination from '../../components/Pagination';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import Breadcrumbs from '../../components/Breadcrumbs';

interface Building {
  id: number;
  name: string;
  address?: string;
  description?: string;
  status?: 'open' | 'repair' | 'closed';
}

function BuildingModal({ open, onClose, onSave, initial, buildings }: {
  open: boolean;
  onClose: () => void;
  onSave: (b: Building) => void;
  initial?: Building | null;
  buildings: Building[];
}) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    address: initial?.address || '',
    description: initial?.description || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name,
        address: initial.address || '',
        description: initial.description || '',
      });
    } else {
      setForm({ name: '', address: '', description: '' });
    }
    setError('');
  }, [initial, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const access = useSelector((state: RootState) => state.auth.access);
  // Получаем список всех зданий из props или из Redux (если нужно)
  // const buildingsList = useSelector((state: RootState) => state.buildings?.buildings || []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Название обязательно');
      return;
    }
    // Валидация на уникальность названия и адреса
    const normalizedName = form.name.trim().toLowerCase();
    const normalizedAddress = form.address.trim().toLowerCase();
    const duplicate = buildings.some((b: Building) =>
      b.id !== initial?.id &&
      (b.name.trim().toLowerCase() === normalizedName || (b.address || '').trim().toLowerCase() === normalizedAddress)
    );
    if (duplicate) {
      setError('Корпус с таким названием или адресом уже существует');
      return;
    }
    setLoading(true);
    try {
      const url = initial ? `${API_URL}/api/buildings/${initial.id}/` : `${API_URL}/api/buildings/`;
      const method = initial ? 'PUT' : 'POST';
      const res = await fetchWithAuth(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${access}`,
        },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const saved = await res.json();
        onSave(saved);
        onClose();
      } else {
        setError('Ошибка при сохранении');
      }
    } catch {
      setError('Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;
  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in'>
      <div className='bg-white rounded-2xl shadow-2xl p-8 w-full max-w-xl relative animate-scale-in border border-gray-100'>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <FaBuilding className="text-blue-600 text-xl" />
          </div>
          <h2 className='text-xl font-bold text-gray-900'>{initial ? 'Редактировать корпус' : 'Добавить корпус'}</h2>
        </div>
        <button onClick={onClose} className='absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold transition-colors'>×</button>
        <form className='grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4' onSubmit={handleSubmit}>
          <label className='font-semibold md:text-right md:pr-2 flex items-center text-gray-700'>Название *</label>
          <input name='name' className='input w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200' value={form.name} onChange={handleChange} required placeholder="Введите название корпуса" />
          <label className='font-semibold md:text-right md:pr-2 flex items-center text-gray-700'>Адрес</label>
          <input name='address' className='input w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200' value={form.address} onChange={handleChange} placeholder="Введите адрес корпуса" />
          <label className='font-semibold md:text-right md:pr-2 flex items-center text-gray-700'>Описание</label>
          <textarea name='description' className='input w-full md:col-span-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200' rows={3} value={form.description} onChange={handleChange} placeholder="Дополнительная информация о корпусе" />
          {error && <div className='md:col-span-2 text-red-500 text-sm mt-2 flex items-center gap-1'><FaTimesCircle className="text-xs" />{error}</div>}
          <div className='md:col-span-2 flex justify-end gap-3 mt-6'>
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
              icon={loading ? undefined : <FaBuilding />}
            >
              {loading ? 'Сохранение...' : (initial ? 'Сохранить' : 'Добавить')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Карта 2ГИС (iframe, можно заменить на react-2gis-maps при необходимости)
const DGIS_MAP_URL = 'https://widgets.2gis.com/widget?type=firmsonmap&options=eyJjbG9uZSI6eyJsYXQiOjQyLjg3ODg2NTgsImxuZyI6NzQuNTk2ODI2fSwid2lkdGgiOjgwMCwiaGVpZ2h0Ijo0MDAsImxhbmd1YWdlIjoicnUifQ==';

export default function BuildingsPage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Building | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [roomsByBuilding, setRoomsByBuilding] = useState<Record<number, any[]>>({});

  // Добавим фильтры и сортировку
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name'|'address'|'rooms'|'description'>('name');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('asc');

  // Пагинация
  const [currentPage, setCurrentPage] = useState(1);
  const buildingsPerPage = 9;

  const access = useSelector((state: RootState) => state.auth.access);

  useEffect(() => { 
    fetchBuildings(); 
  }, []);
  
  useEffect(() => {
    if (!access) {
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  }, [access]);

  const fetchBuildings = async () => {
    try {
      const token = access;
      const res = await fetchWithAuth(`${API_URL}/api/buildings/`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) throw new Error('Ошибка загрузки');
      const buildingsData = await res.json();
      setBuildings(buildingsData);
      
      // Загружаем номера для всех зданий сразу
      await Promise.all(buildingsData.map((building: Building) => fetchRoomsForBuilding(building.id)));
    } catch { setError('Ошибка сети'); } finally { setLoading(false); }
  };

  const handleSave = (b: Building) => {
    if (editing) {
      setBuildings(prev => prev.map(x => x.id === b.id ? b : x));
    } else {
      setBuildings(prev => [...prev, b]);
    }
    setEditing(null);
  };
  const handleEdit = (b: Building) => { setEditing(b); setShowModal(true); };
  const handleDelete = (id: number) => { setDeleteId(id); setShowConfirmDelete(true); };
  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      const token = access;
      const res = await fetchWithAuth(`${API_URL}/api/buildings/${deleteId}/`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setBuildings(prev => prev.filter(x => x.id !== deleteId));
      else setError('Ошибка удаления');
    } catch { setError('Ошибка сети'); }
    setShowConfirmDelete(false); setDeleteId(null);
  };

  // Загружаем номера для каждого корпуса
  const fetchRoomsForBuilding = async (buildingId: number) => {
    if (roomsByBuilding[buildingId]) return;
    try {
      const token = access;
      const res = await fetchWithAuth(`${API_URL}/api/rooms/?building_id=${buildingId}`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) return;
      let data = await res.json();
      // Фильтруем только номера этого здания (на всякий случай)
      data = data.filter((room: any) => {
        if (typeof room.building === 'object') return room.building.id === buildingId;
        return room.building === buildingId;
      });
      setRoomsByBuilding(prev => ({ ...prev, [buildingId]: data }));
    } catch (error) {
      console.error('Ошибка загрузки номеров для здания:', buildingId, error);
    }
  };

  if (loading) return (
    <div className='flex items-center justify-center h-full'>
      <div className='text-center'>
        <LoadingSpinner size="lg" text="Загрузка корпусов..." />
      </div>
    </div>
  );
  if (error) return (
    <div className='flex items-center justify-center h-full'>
      <div className='text-center'>
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FaTimesCircle className="text-red-600 text-2xl" />
        </div>
        <p className='text-red-600 mb-4 text-lg font-medium'>{error}</p>
        <Button
          variant="primary"
          onClick={fetchBuildings}
          icon={<FaBuilding />}
        >
          Попробовать снова
        </Button>
      </div>
    </div>
  );

  // Фильтрация и сортировка корпусов
  const filteredBuildings = buildings
    .filter(b => b.name.toLowerCase().includes(search.toLowerCase()) || (b.address || '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let v1: any = '';
      let v2: any = '';
      if (sortBy === 'rooms') {
        v1 = roomsByBuilding[a.id]?.length || 0;
        v2 = roomsByBuilding[b.id]?.length || 0;
      } else if (sortBy === 'description') {
        v1 = a.description || '';
        v2 = b.description || '';
      } else {
        v1 = a[sortBy] || '';
        v2 = b[sortBy] || '';
      }
      if (v1 < v2) return sortDir === 'asc' ? -1 : 1;
      if (v1 > v2) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  const totalPages = Math.ceil(filteredBuildings.length / buildingsPerPage);
  const paginatedBuildings = filteredBuildings.slice(
    (currentPage - 1) * buildingsPerPage,
    currentPage * buildingsPerPage
  );

  // Экспорт в CSV
  const exportToCSV = () => {
    const header = ['ID', 'Название', 'Адрес', 'Описание', 'Кол-во номеров'];
    const rows = filteredBuildings.map(b => [
      b.id,
      b.name,
      b.address || '',
      b.description || '',
      roomsByBuilding[b.id]?.length || 0
    ]);
    const csv = [header, ...rows].map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'buildings.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className='min-h-screen bg-gray-50'>
      <Breadcrumbs />
      {/* Верхняя панель с кнопкой */}
      <div className='flex items-center justify-between px-6 pt-8 pb-2 gap-4 flex-wrap'>
        <div className='flex items-center gap-2'>
          <FaBuilding className='text-blue-600' />
          <h2 className='text-xl font-bold text-center'>Здания</h2>
        </div>
        <div className='flex items-center gap-3 justify-center'>
          <div className="relative">
            <input
              type='text'
              placeholder='Поиск по названию или адрес'
              value={search}
              onChange={e => setSearch(e.target.value)}
              className='input pl-3 pr-10 py-2 border rounded-lg text-sm w-64 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200'
            />
            <FaSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
          </div>
          <Button
            variant="success"
            onClick={exportToCSV}
            icon={<FaFileCsv />}
            className="shadow-lg hover:shadow-xl"
          >
            Экспорт в CSV
          </Button>
          <Button
            variant="primary"
            onClick={() => { setShowModal(true); setEditing(null); }}
            icon={<FaPlus />}
            className="shadow-lg hover:shadow-xl"
          >
            <span className="font-bold">Добавить корпус</span>
          </Button>
        </div>
      </div>
      {/* Таблица корпусов */}
      <div className='px-6 py-6'>
        <div className='rounded-xl shadow-lg bg-white w-full border border-gray-100 overflow-hidden'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='bg-gradient-to-r from-gray-50 to-blue-50 text-gray-700 border-b border-gray-200'>
                            <th className='p-3 text-center font-bold'>ID</th>
            <th className='p-3 text-center cursor-pointer font-bold' onClick={() => { setSortBy('name'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); }}>Название</th>
            <th className='p-3 text-center cursor-pointer font-bold' onClick={() => { setSortBy('address'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); }}>Адрес</th>
            <th className='p-3 text-center cursor-pointer font-bold' onClick={() => { setSortBy('description'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); }}>Описание</th>
            <th className='p-3 text-center cursor-pointer font-bold' onClick={() => { setSortBy('rooms'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); }}>Номера</th>
            <th className='p-3 text-center font-bold'>Действия</th>
              </tr>
            </thead>
            <tbody>
              {paginatedBuildings.map((b, idx) => (
                <React.Fragment key={b.id}>
                  <tr key={b.id} className={`transition-all duration-200 border-b border-gray-100 last:border-b-0 ${idx % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'} hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 group`}>
                    <td className='p-3 text-center'>{b.id}</td>
                    <td className='p-3 text-center font-medium text-gray-900'>{b.name}</td>
                    <td className='p-3 text-center'>{b.address || '—'}</td>
                    <td className='p-3 text-center truncate max-w-[200px]' title={b.description || 'Нет описания'}>{b.description ? (b.description.length > 30 ? `${b.description.substring(0, 30)}...` : b.description) : '—'}</td>
                    <td className='p-3 text-center font-semibold text-blue-600'>
                      {roomsByBuilding[b.id] !== undefined ? roomsByBuilding[b.id].length : (
                        <div className='w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto'></div>
                      )}
                    </td>
                    <td className='p-3 text-center'>
                      <div className='flex items-center gap-2 justify-center'>
                      <button
                        className='flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold text-xs px-2 py-1 rounded transition-colors bg-blue-50 hover:bg-blue-100'
                          onClick={() => {
                          setExpanded(expanded === b.id ? null : b.id);
                        }}
                      >
                        {expanded === b.id ? <FaChevronUp /> : <FaChevronDown />} Номера
                      </button>
                        <button onClick={() => handleEdit(b)} className='bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded-lg font-semibold flex items-center gap-1 text-xs transition-all duration-200 hover:scale-105 shadow-sm' title='Редактировать'>
                          <FaEdit /> Ред.
                        </button>
                        <button onClick={() => handleDelete(b.id)} className='bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded-lg font-semibold flex items-center gap-1 text-xs transition-all duration-200 hover:scale-105 shadow-sm' title='Удалить'>
                          <FaTrash /> Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expanded === b.id && roomsByBuilding[b.id] && (
                    <tr key={`rooms-${b.id}`}>
                      <td colSpan={6} className='bg-blue-50 p-4 border-t border-blue-100'>
                        <div className='mb-3'>
                          <h4 className='text-lg font-semibold text-blue-800 mb-2'>Номера в корпусе "{b.name}"</h4>
                          <div className='text-sm text-blue-600'>Всего номеров: {roomsByBuilding[b.id].length}</div>
                        </div>
                        <div className='flex flex-wrap gap-3'>
                          {roomsByBuilding[b.id].length === 0 ? (
                            <span className='text-gray-500 italic'>Нет номеров в этом корпусе</span>
                          ) : roomsByBuilding[b.id].map((room: any) => {
                            let color = 'bg-green-100 text-green-800 border-green-200';
                            let statusText = 'Свободен';
                            if (room.status === 'busy') {
                              color = 'bg-red-100 text-red-800 border-red-200';
                              statusText = 'Забронирован';
                            } else if (room.status === 'repair') {
                              color = 'bg-orange-100 text-orange-800 border-orange-200';
                              statusText = 'Недоступен';
                            }
                            return (
                              <div key={room.id} className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-sm border ${color} min-w-[200px] transition-all hover:shadow-md`}>
                                <FaBed className='text-xl' />
                                <div>
                                  <div className='font-semibold'>{room.number}</div>
                                  <div className='text-xs text-gray-500'>{statusText}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
        {showModal && (
          <BuildingModal
            open={showModal}
            onClose={() => { setShowModal(false); setEditing(null); }}
            onSave={handleSave}
            initial={editing}
            buildings={buildings}
          />
        )}
        {showConfirmDelete && (
          <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
            <div className='bg-white rounded-xl shadow-xl p-8 max-w-sm w-full'>
              <div className='text-lg font-bold mb-4 text-red-700'>Удалить корпус?</div>
              <div className='mb-6 text-gray-700'>Вы уверены, что хотите удалить этот корпус? Это действие нельзя отменить.</div>
              <div className='flex justify-end gap-3'>
                <button className='px-4 py-2 rounded bg-gray-200 hover:bg-gray-300' onClick={() => setShowConfirmDelete(false)}>Отмена</button>
                <button className='px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700' onClick={confirmDelete}>Удалить</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}