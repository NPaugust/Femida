"use client";
import { useEffect, useState } from 'react';
import { FaPlus, FaEdit, FaTrash, FaChevronDown, FaChevronUp, FaBed, FaBuilding, FaFileCsv } from 'react-icons/fa';
import { API_URL } from '../../shared/api';
import React from 'react';
import Pagination from '../../components/Pagination';

interface Building {
  id: number;
  name: string;
  address?: string;
  description?: string;
  status?: 'open' | 'repair' | 'closed';
}

function BuildingModal({ open, onClose, onSave, initial }: {
  open: boolean;
  onClose: () => void;
  onSave: (b: Building) => void;
  initial?: Building | null;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Название обязательно');
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('access');
      const url = initial ? `${API_URL}/api/buildings/${initial.id}/` : `${API_URL}/api/buildings/`;
      const method = initial ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
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
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm'>
      <div className='bg-white rounded-xl shadow-2xl p-8 w-full max-w-xl relative border border-gray-100'>
        <h2 className='text-xl font-bold mb-6'>{initial ? 'Редактировать корпус' : 'Добавить корпус'}</h2>
        <button onClick={onClose} className='absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold'>×</button>
        <form className='grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4' onSubmit={handleSubmit}>
          <label className='font-semibold md:text-right md:pr-2 flex items-center'>Название *</label>
          <input name='name' className='input w-full' value={form.name} onChange={handleChange} required />
          <label className='font-semibold md:text-right md:pr-2 flex items-center'>Адрес</label>
          <input name='address' className='input w-full' value={form.address} onChange={handleChange} />
          <label className='font-semibold md:text-right md:pr-2 flex items-center'>Описание</label>
          <textarea name='description' className='input w-full md:col-span-1' rows={2} value={form.description} onChange={handleChange} />
          {error && <div className='md:col-span-2 text-red-500 text-sm mt-2'>{error}</div>}
          <div className='md:col-span-2 flex justify-end gap-3 mt-6'>
            <button type='button' onClick={onClose} className='bg-gray-200 hover:bg-gray-300 text-gray-700 px-5 py-2 rounded font-semibold'>Отмена</button>
            <button type='submit' disabled={loading} className='bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-semibold shadow disabled:opacity-60 disabled:cursor-not-allowed'>{loading ? 'Сохранение...' : (initial ? 'Сохранить' : 'Добавить')}</button>
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

  useEffect(() => { 
    fetchBuildings(); 
  }, []);
  
  const fetchBuildings = async () => {
    try {
      const token = localStorage.getItem('access');
      const res = await fetch(`${API_URL}/api/buildings/`, { headers: { 'Authorization': `Bearer ${token}` } });
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
      const token = localStorage.getItem('access');
      const res = await fetch(`${API_URL}/api/buildings/${deleteId}/`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setBuildings(prev => prev.filter(x => x.id !== deleteId));
      else setError('Ошибка удаления');
    } catch { setError('Ошибка сети'); }
    setShowConfirmDelete(false); setDeleteId(null);
  };

  // Загружаем номера для каждого корпуса
  const fetchRoomsForBuilding = async (buildingId: number) => {
    if (roomsByBuilding[buildingId]) return;
    try {
      const token = localStorage.getItem('access');
      const res = await fetch(`${API_URL}/api/rooms/?building_id=${buildingId}`, { headers: { 'Authorization': `Bearer ${token}` } });
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

  if (loading) return <div className='flex items-center justify-center h-64'><div className='text-center'><div className='w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4'></div><p className='text-gray-600'>Загрузка корпусов...</p></div></div>;
  if (error) return <div className='text-center p-8'><p className='text-red-600 mb-4'>{error}</p><button onClick={fetchBuildings} className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700'>Попробовать снова</button></div>;

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
      {/* Верхняя панель с кнопкой */}
      <div className='flex items-center justify-between px-6 pt-8 pb-2 gap-4 flex-wrap'>
        <div className='flex items-center gap-2'>
          <FaBuilding className='text-blue-600' />
          <h2 className='text-xl font-bold text-center'>Здания</h2>
        </div>
        <div className='flex items-center gap-2 justify-center'>
          <input
            type='text'
            placeholder='Поиск по названию или адрес'
            value={search}
            onChange={e => setSearch(e.target.value)}
            className='input px-3 py-2 border rounded-lg text-sm w-64 text-center'
          />
          <button onClick={exportToCSV} className='bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2'>
            <FaFileCsv /> Экспорт в CSV
          </button>
          <button
            onClick={() => { setShowModal(true); setEditing(null); }}
            className='bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-semibold shadow flex items-center gap-2'
          >
            <FaPlus /> Добавить корпус
          </button>
        </div>
      </div>
      {/* Таблица корпусов */}
      <div className='px-6 py-6'>
        <div className='rounded-lg shadow bg-white w-full'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='bg-gray-50 text-gray-700'>
                <th className='p-3 text-center'>ID</th>
                <th className='p-3 text-center cursor-pointer' onClick={() => { setSortBy('name'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); }}>Название</th>
                <th className='p-3 text-center cursor-pointer' onClick={() => { setSortBy('address'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); }}>Адрес</th>
                <th className='p-3 text-center cursor-pointer' onClick={() => { setSortBy('description'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); }}>Описание</th>
                <th className='p-3 text-center cursor-pointer' onClick={() => { setSortBy('rooms'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); }}>Номера</th>
                <th className='p-3 text-center'>Действия</th>
              </tr>
            </thead>
            <tbody>
              {paginatedBuildings.map((b, idx) => (
                <React.Fragment key={b.id}>
                  <tr key={b.id} className={`transition-all border-b last:border-b-0 ${idx % 2 === 1 ? 'bg-gray-50' : 'bg-white'} hover:bg-blue-50`}>
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
                        <button onClick={() => handleEdit(b)} className='bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded font-semibold flex items-center gap-1 text-xs' title='Редактировать'>
                          <FaEdit /> Ред.
                        </button>
                        <button onClick={() => handleDelete(b.id)} className='bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded font-semibold flex items-center gap-1 text-xs' title='Удалить'>
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
                                <FaBed className='text-lg' />
                                <div className='flex flex-col'>
                                  <span className='font-bold text-lg'>{room.number}</span>
                                  <span className='text-xs opacity-75'>{statusText}</span>
                                </div>
                                {room.price_per_night && (
                                  <div className='ml-auto text-right'>
                                    <div className='text-sm font-semibold'>{room.price_per_night} сом</div>
                                    <div className='text-xs opacity-75'>за сутки</div>
                                  </div>
                                )}
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
      </div>
      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="px-6 py-4 bg-white border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Показано {((currentPage - 1) * buildingsPerPage) + 1} - {Math.min(currentPage * buildingsPerPage, filteredBuildings.length)} из {filteredBuildings.length}
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      )}
      <BuildingModal open={showModal} onClose={() => { setShowModal(false); setEditing(null); }} onSave={handleSave} initial={editing} />
      {/* Модалка подтверждения удаления */}
      {showConfirmDelete && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm'>
          <div className='bg-white rounded-xl shadow-2xl p-8 w-full max-w-sm relative border border-gray-100'>
            <h2 className='text-xl font-bold mb-4'>Удалить корпус?</h2>
            <p className='mb-6 text-gray-600'>Вы уверены, что хотите удалить корпус <b>№{deleteId}</b>?</p>
            <div className='flex justify-end gap-3'>
              <button onClick={() => setShowConfirmDelete(false)} className='bg-gray-200 hover:bg-gray-300 text-gray-700 px-5 py-2 rounded font-semibold'>Отмена</button>
              <button onClick={confirmDelete} className='bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded font-semibold shadow'>Удалить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 