import React, { useState, useRef, useEffect } from 'react';

interface Room {
  id: number;
  number: string;
  room_class: string | { value: string; label: string };
}
interface Guest {
  id: number;
  full_name: string;
}
interface Booking {
  id: number;
  room: Room;
  check_in: string;
  check_out: string;
  status: string;
  guest?: Guest;
  people_count?: number;
  comments?: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-200 text-green-800',
  completed: 'bg-red-200 text-red-800',
  cancelled: 'bg-yellow-200 text-yellow-800',
};

function getDaysArray(start: Date, end: Date) {
  const arr = [];
  for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
    arr.push(new Date(dt));
  }
  return arr;
}

type Props = {
  bookings: Booking[];
  rooms: Room[];
  startDate: Date;
  endDate: Date;
};

// Добавляю функцию formatDateTime (копия из page.tsx)
function formatDateTime(dt: string) {
  if (!dt) return '';
  const d = new Date(dt);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${day}.${month}.${year}, ${hours}:${minutes}`;
}

const BookingTable: React.FC<Props> = ({ bookings, rooms, startDate, endDate }) => {
  // Pagination по датам
  const [startIdx, setStartIdx] = useState(0);
  const days = getDaysArray(startDate, endDate);
  const visibleDays = 14; // показываем 14 дней за раз
  const pagedDays = days.slice(startIdx, startIdx + visibleDays);
  const canPrev = startIdx > 0;
  const canNext = startIdx + visibleDays < days.length;

  // Группируем бронирования по номерам
  const bookingsByRoom: Record<number, Booking[]> = {};
  bookings.forEach(b => {
    if (!bookingsByRoom[b.room.id]) bookingsByRoom[b.room.id] = [];
    bookingsByRoom[b.room.id].push(b);
  });

  // Tooltip
  function TooltipOnClick({ content, children }: { content: string, children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
      function handleClickOutside(e: MouseEvent) {
        if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
      }
      if (open) document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);
    return (
      <div className="relative inline-block" ref={ref}>
        <span onClick={e => { e.stopPropagation(); setOpen(o => !o); }} className="cursor-pointer">
          {children}
        </span>
        {open && (
          <div className="absolute z-50 left-1/2 -translate-x-1/2 mt-2 px-4 py-2 bg-white border rounded shadow text-xs whitespace-pre-line min-w-[120px] max-w-xs">
            {content}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg shadow bg-white w-full">
      <div className="flex justify-end gap-2 mb-2">
        <button disabled={!canPrev} onClick={() => setStartIdx(i => Math.max(0, i - visibleDays))} className="px-2 py-1 rounded border bg-gray-100 disabled:opacity-50">{'<'}</button>
        <button disabled={!canNext} onClick={() => setStartIdx(i => Math.min(days.length - visibleDays, i + visibleDays))} className="px-2 py-1 rounded border bg-gray-100 disabled:opacity-50">{'>'}</button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-gray-700">
            <th className="p-2 text-left">Тип номера</th>
            <th className="p-2 text-left">Номер</th>
            {pagedDays.map((d, i) => (
              <th key={i} className="p-2 text-center text-xs min-w-0 truncate">{d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rooms.map(room => (
            <tr key={room.id}>
              <td className="p-2 text-xs font-semibold min-w-0 truncate">{typeof room.room_class === 'object' ? room.room_class.label : room.room_class}</td>
              <td className="p-2 text-xs font-semibold min-w-0 truncate">{room.number}</td>
              {pagedDays.map((day, i) => {
                const booking = (bookingsByRoom[room.id] || []).find(b => {
                  const checkIn = new Date(b.check_in);
                  const checkOut = new Date(b.check_out);
                  return day >= checkIn && day <= checkOut;
                });
                return (
                  <td key={i} className="p-0 min-w-0 h-10 border border-gray-200 align-middle">
                    {booking ? (
                      <TooltipOnClick content={`Гость: ${booking.guest?.full_name || ''}\nНомер: ${room.number}\nКоличество гостей: ${booking.people_count || 1}\nДаты: ${formatDateTime(booking.check_in)} — ${formatDateTime(booking.check_out)}`}> 
                        <div className={`w-full h-full flex items-center justify-center text-xs font-medium rounded ${STATUS_COLORS[booking.status] || 'bg-gray-100 text-gray-700'}`}
                          title={`${booking.guest?.full_name || ''}`}
                        >
                          {room.number} {booking.guest ? `(${booking.guest.full_name})` : ''}
                        </div>
                      </TooltipOnClick>
                    ) : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BookingTable; 