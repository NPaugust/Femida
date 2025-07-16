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
const STATUS_LABELS: Record<string, string> = {
  active: 'Активный',
  completed: 'Завершён',
  cancelled: 'Недоступен',
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatDate(dt: Date) {
  return dt.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
}

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

type Props = {
  bookings: Booking[];
  year: number;
  month: number; // 0-based
};

// Добавляю компонент TooltipOnClick
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

const BookingCalendar: React.FC<Props> = ({ bookings, year, month }) => {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month, daysInMonth);

  // Группируем бронирования по дням
  const bookingsByDay: Record<number, Booking[]> = {};
  bookings.forEach(b => {
    const checkIn = new Date(b.check_in);
    const checkOut = new Date(b.check_out);
    for (let d = new Date(checkIn); d <= checkOut; d.setDate(d.getDate() + 1)) {
      if (d >= firstDay && d <= lastDay) {
        const day = d.getDate();
        if (!bookingsByDay[day]) bookingsByDay[day] = [];
        bookingsByDay[day].push(b);
      }
    }
  });

  // Рендер календаря
  const weeks: React.ReactNode[][] = [];
  let week: React.ReactNode[] = [];
  let dayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  for (let i = 0; i < dayOfWeek; i++) {
    week.push(<td key={`empty-${i}`}></td>);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    week.push(
      <td key={day} className="align-top p-1 min-w-[120px] h-28 border border-gray-200 bg-white">
        <div className="text-xs font-semibold mb-1">{day}</div>
        <div className="flex flex-col gap-1">
          {(bookingsByDay[day] || []).map(b => (
            <TooltipOnClick key={b.id} content={`Гость: ${b.guest?.full_name || ''}\nНомер: ${b.room.number}\nКоличество гостей: ${b.people_count || 1}\nДаты: ${formatDateTime(b.check_in)} — ${formatDateTime(b.check_out)}`}>
              <div className={`truncate px-2 py-1 rounded text-xs font-medium cursor-pointer ${STATUS_COLORS[b.status] || 'bg-gray-100 text-gray-700'}`}
                title={`${b.room.number}, ${b.guest?.full_name || ''}`}
              >
                {b.room.number} {b.guest ? `(${b.guest.full_name})` : ''}
              </div>
            </TooltipOnClick>
          ))}
        </div>
      </td>
    );
    if ((week.length === 7) || (day === daysInMonth)) {
      weeks.push(week);
      week = [];
    }
  }

  return (
    <div className="rounded-lg shadow bg-white w-full p-4" style={{overflow: 'visible', maxHeight: 'none'}}>
      <div className="text-lg font-bold mb-2">{formatDate(firstDay).replace(/\d{4}/, String(year))}</div>
      <table className="w-full border-collapse table-fixed">
        <thead>
          <tr className="bg-gray-50 text-gray-700">
            <th className="p-2">Пн</th>
            <th className="p-2">Вт</th>
            <th className="p-2">Ср</th>
            <th className="p-2">Чт</th>
            <th className="p-2">Пт</th>
            <th className="p-2">Сб</th>
            <th className="p-2">Вс</th>
          </tr>
        </thead>
        <tbody>
          {weeks.map((w, i) => <tr key={i}>{w}</tr>)}
        </tbody>
      </table>
    </div>
  );
};

export default BookingCalendar; 