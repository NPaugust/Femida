"use client";
import { useEffect, useState } from "react";
import { API_URL } from "../../shared/api";
import { saveAs } from "file-saver";

type Building = { id: number; name: string; address?: string };
type Room = { id: number; number: string; building: Building | number; room_class: { value: string; label: string } | string; room_type: string; capacity: number; status: string; description?: string };
type Guest = { id: number; full_name: string; phone?: string; inn?: string };
type Booking = { id: number; room: Room; guest: Guest; date_from: string; date_to: string; check_in?: string; check_out?: string; people_count: number };

const ROOM_CLASS_LABELS: Record<string, string> = {
  standard: 'Стандарт',
  semi_lux: 'Полу-люкс',
  lux: 'Люкс',



};

export default function ReportsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [filterDate, setFilterDate] = useState("");
  const [filterRoom, setFilterRoom] = useState("");
  const [filterGuest, setFilterGuest] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const reportsPerPage = 10;
  const token = typeof window !== "undefined" ? localStorage.getItem("access") : "";
  const [sortState, setSortState] = useState<{ field: string | null; order: 'asc' | 'desc' | null }>({ field: null, order: null });

  useEffect(() => {
    if (!token) return;
    Promise.all([
      fetch(`${API_URL}/api/bookings/`, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json()),
      fetch(`${API_URL}/api/rooms/`, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json()),
      fetch(`${API_URL}/api/guests/`, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json()),
      fetch(`${API_URL}/api/buildings/`, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json()),
    ]).then(([bookingsData, roomsData, guestsData, buildingsData]) => {
      setBookings(bookingsData);
      setRooms(roomsData);
      setGuests(guestsData);
      setBuildings(buildingsData);
    });
  }, [token]);

  const filtered = bookings.filter(b => {
    if (filterDate) {
      const from = new Date(b.check_in ?? b.date_from);
      const to = new Date(b.check_out ?? b.date_to);
      const filter = new Date(filterDate);
      from.setHours(0,0,0,0);
      to.setHours(0,0,0,0);
      filter.setHours(0,0,0,0);
      if (!(filter >= from && filter <= to)) return false;
    }
    if (filterRoom && String(b.room.id) !== filterRoom) return false;
    if (filterGuest && String(b.guest.id) !== filterGuest) return false;
    return true;
  });

  // Пагинация
  const totalPages = Math.ceil(filtered.length / reportsPerPage);
  const paginatedReports = filtered.slice(
    (currentPage - 1) * reportsPerPage,
    currentPage * reportsPerPage
  );

  const exportToCSV = () => {
    const header = 'Комната,Корпус,Класс,Тип,Статус,Гость,Телефон,ИНН,Дата заезда,Дата выезда,Кол-во гостей';
    const rows = filtered.map(b => {
      const room = rooms.find(r => r.id === b.room.id);
      const building = buildings.find(bld => bld.id === room?.building);
      return `№${b.room.number},${building?.name || '-'},${typeof room?.room_class === 'object' && room?.room_class !== null ? room?.room_class.label : ROOM_CLASS_LABELS[room?.room_class as string] || room?.room_class || '-'},${room?.room_type || '-'},${room?.status || '-'},${b.guest.full_name},${b.guest.phone || '-'},${b.guest.inn || '-'},${`${b.check_in ?? b.date_from ?? ''}`},${`${b.check_out ?? b.date_to ?? ''}`},${b.people_count}`;
    });
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'report.csv');
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

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Отчёты</h1>
      <div className="flex gap-4 mb-4">
        <div className="flex gap-2">
          <input 
            type="date" 
            value={filterDate} 
            onChange={e => setFilterDate(e.target.value)} 
            className="input" 
            placeholder="Фильтр по дате"
          />
          {filterDate && (
            <button 
              onClick={() => setFilterDate('')} 
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded"
            >
              Сброс
            </button>
          )}
        </div>
        <select value={filterRoom} onChange={e => setFilterRoom(e.target.value)} className="input">
          <option value="">Все номера</option>
          {rooms.map(r => <option key={r.id} value={r.id}>{r.number}</option>)}
        </select>
        <select value={filterGuest} onChange={e => setFilterGuest(e.target.value)} className="input">
          <option value="">Все гости</option>
          {guests.map(g => <option key={g.id} value={g.id}>{g.full_name}</option>)}
        </select>
        <button onClick={exportToCSV} className="bg-green-600 text-white px-4 py-2 rounded">Экспорт в CSV</button>
      </div>
      {filtered.length === 0 ? (
        <div className="text-center text-gray-500 p-8">Нет данных для отображения</div>
      ) : (
        <table className="min-w-full bg-white rounded-lg">
          <thead>
            <tr className="bg-gray-50 text-gray-700">
              <th className="p-3 text-left" onClick={() => handleSort('room.number')}>Комната {sortState.field === 'room.number' && (sortState.order === 'asc' ? '▲' : sortState.order === 'desc' ? '▼' : '')}</th>
              <th className="p-3 text-left" onClick={() => handleSort('room.building')}>Корпус {sortState.field === 'room.building' && (sortState.order === 'asc' ? '▲' : sortState.order === 'desc' ? '▼' : '')}</th>
              <th className="p-3 text-left" onClick={() => handleSort('room.room_class')}>Класс {sortState.field === 'room.room_class' && (sortState.order === 'asc' ? '▲' : sortState.order === 'desc' ? '▼' : '')}</th>
              <th className="p-3 text-left" onClick={() => handleSort('room.room_type')}>Тип {sortState.field === 'room.room_type' && (sortState.order === 'asc' ? '▲' : sortState.order === 'desc' ? '▼' : '')}</th>
              <th className="p-3 text-left" onClick={() => handleSort('room.status')}>Статус {sortState.field === 'room.status' && (sortState.order === 'asc' ? '▲' : sortState.order === 'desc' ? '▼' : '')}</th>
              <th className="p-3 text-left" onClick={() => handleSort('guest.full_name')}>Гость {sortState.field === 'guest.full_name' && (sortState.order === 'asc' ? '▲' : sortState.order === 'desc' ? '▼' : '')}</th>
              <th className="p-3 text-left" onClick={() => handleSort('guest.phone')}>Телефон {sortState.field === 'guest.phone' && (sortState.order === 'asc' ? '▲' : sortState.order === 'desc' ? '▼' : '')}</th>
              <th className="p-3 text-left" onClick={() => handleSort('guest.inn')}>ИНН {sortState.field === 'guest.inn' && (sortState.order === 'asc' ? '▲' : sortState.order === 'desc' ? '▼' : '')}</th>
              <th className="p-3 text-left" onClick={() => handleSort('check_in')}>Дата заезда {sortState.field === 'check_in' && (sortState.order === 'asc' ? '▲' : sortState.order === 'desc' ? '▼' : '')}</th>
              <th className="p-3 text-left" onClick={() => handleSort('check_out')}>Дата выезда {sortState.field === 'check_out' && (sortState.order === 'asc' ? '▲' : sortState.order === 'desc' ? '▼' : '')}</th>
              <th className="p-3 text-left" onClick={() => handleSort('people_count')}>Кол-во гостей {sortState.field === 'people_count' && (sortState.order === 'asc' ? '▲' : sortState.order === 'desc' ? '▼' : '')}</th>
            </tr>
          </thead>
          <tbody>
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
              return (
                <tr key={b.id} className="hover:bg-blue-50 transition-all">
                  <td className="p-3 font-semibold">№{b.room.number}</td>
                  <td className="p-3">{buildingName}</td>
                  <td className="p-3">{typeof room?.room_class === 'object' && room?.room_class !== null ? room?.room_class.label : ROOM_CLASS_LABELS[room?.room_class as string] || room?.room_class || '-'}</td>
                  <td className="p-3">{room?.room_type || '-'}</td>
                  <td className="p-3">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${room?.status === 'busy' ? 'bg-red-200 text-red-800' : room?.status === 'repair' ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'}`}>
                      {room?.status === 'busy' ? 'Занят' : room?.status === 'repair' ? 'Ремонт' : 'Свободен'}
                    </span>
                  </td>
                  <td className="p-3">{b.guest.full_name}</td>
                  <td className="p-3 text-sm">{b.guest.phone || '-'}</td>
                  <td className="p-3 text-sm">{b.guest.inn || '-'}</td>
                  <td className="p-3">{formatDate(b.check_in ?? b.date_from ?? '')}</td>
                  <td className="p-3">{formatDate(b.check_out ?? b.date_to ?? '')}</td>
                  <td className="p-3">{b.people_count}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      
      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-4">
          <button
            className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Назад
          </button>
          <span className="text-sm text-gray-500">Страница {currentPage} из {totalPages}</span>
          <button
            className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Вперёд
          </button>
        </div>
      )}
    </div>
  );
} 