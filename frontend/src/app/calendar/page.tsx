"use client";
import { useEffect, useState, useMemo } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { API_URL } from "../../shared/api";
import { FaChevronLeft, FaChevronRight, FaBed, FaUser, FaCalendar, FaBuilding } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

// Настройка локализации для русского языка
moment.locale('ru', {
  months: 'январь_февраль_март_апрель_май_июнь_июль_август_сентябрь_октябрь_ноябрь_декабрь'.split('_'),
  monthsShort: 'янв_фев_март_апр_май_июнь_июль_авг_сен_окт_ноя_дек'.split('_'),
  weekdays: 'воскресенье_понедельник_вторник_среда_четверг_пятница_суббота'.split('_'),
  weekdaysShort: 'вс_пн_вт_ср_чт_пт_сб'.split('_'),
  weekdaysMin: 'вс_пн_вт_ср_чт_пт_сб'.split('_'),
  longDateFormat: {
    LT: 'HH:mm',
    LTS: 'HH:mm:ss',
    L: 'DD.MM.YYYY',
    LL: 'D MMMM YYYY г.',
    LLL: 'D MMMM YYYY г., HH:mm',
    LLLL: 'dddd, D MMMM YYYY г., HH:mm'
  },
  calendar: {
    sameDay: '[Сегодня в] LT',
    nextDay: '[Завтра в] LT',
    nextWeek: 'dddd [в] LT',
    lastDay: '[Вчера в] LT',
    lastWeek: 'dddd [в] LT',
    sameElse: 'L'
  },
  relativeTime: {
    future: 'через %s',
    past: '%s назад',
    s: 'несколько секунд',
    m: 'минута',
    mm: '%d минут',
    h: 'час',
    hh: '%d часов',
    d: 'день',
    dd: '%d дней',
    M: 'месяц',
    MM: '%d месяцев',
    y: 'год',
    yy: '%d лет'
  }
});

moment.locale('ru');

const localizer = momentLocalizer(moment);

type Room = {
  id: number;
  number: string;
  building: number | { id: number; name: string };
  status: string;
  room_type: string;
  room_class: string;
};

type Booking = {
  id: number;
  room: Room;
  guest: any;
  people_count: number;
  check_in: string;
  check_out: string;
  date_from?: string;
  date_to?: string;
};

type Building = { id: number; name: string };

const ROOM_CLASS_LABELS: Record<string, string> = {
  standard: 'Стандарт',
  semi_lux: 'Полу-люкс',
  lux: 'Люкс'


};

// Кастомный тултип компонент с поддержкой перевода и кнопкой закрытия
const CustomTooltip = ({ event, onClose }: { event: any, onClose: () => void }) => {
  const { t } = useTranslation();
  const room = event.resource.room;
  const building = event.resource.building;
  const guest = event.resource.guest;
  // Перевод статуса
  const statusValue = room?.status || '';
  let statusLabel = t('status_' + statusValue);
  if (!statusLabel || statusLabel === 'status_' + statusValue) {
    if (statusValue === 'free') statusLabel = t('Свободен');
    else if (statusValue === 'busy') statusLabel = t('Занят');
    else if (statusValue === 'repair') statusLabel = t('Ремонт');
    else statusLabel = statusValue || '-';
  }
  // Перевод класса
  let classValue = '';
  let classLabel = '';
  if (room?.room_class) {
    if (typeof room.room_class === 'object') {
      classValue = room.room_class.value;
      classLabel = room.room_class.label;
    } else {
      classValue = room.room_class;
      classLabel = '';
    }
  }
  const classTranslated = t('class_' + classValue);
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm relative pointer-events-auto animate-fade-in">
      <button onClick={onClose} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-xl font-bold focus:outline-none">×</button>
      <div className="flex items-center gap-2 mb-3">
        <FaBed className="text-blue-600" />
        <h3 className="font-semibold text-lg">{t('Бронирование')} #{event.resource.id}</h3>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <FaBuilding className="text-gray-500 w-4" />
          <span className="font-medium">{t('Комната')}:</span>
          <span className="text-gray-700">№{room?.number}</span>
        </div>
        {building && (
          <div className="flex items-center gap-2">
            <FaBuilding className="text-gray-500 w-4" />
            <span className="font-medium">{t('Корпус')}:</span>
            <span className="text-gray-700">{building.name}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="font-medium">{t('Класс')}:</span>
          <span className="text-gray-700">{classTranslated !== 'class_' + classValue ? classTranslated : (classLabel || classValue || '-')}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium">{t('Тип')}:</span>
          <span className="text-gray-700">{room?.room_type}</span>
        </div>
        {guest && (
          <div className="flex items-center gap-2">
            <FaUser className="text-gray-500 w-4" />
            <span className="font-medium">{t('Гость')}:</span>
            <span className="text-gray-700">{guest.full_name}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <FaUser className="text-gray-500 w-4" />
          <span className="font-medium">{t('Количество')}:</span>
          <span className="text-gray-700">{event.resource.people_count} {t('чел.')}</span>
        </div>
        <div className="flex items-center gap-2">
          <FaCalendar className="text-gray-500 w-4" />
          <span className="font-medium">{t('Период')}:</span>
          <span className="text-gray-700">{moment(event.start).format('DD.MM.YYYY')} - {moment(event.end).format('DD.MM.YYYY')}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium">{t('Статус')}:</span>
          <span className={`px-2 py-1 rounded text-xs font-semibold ${
            room?.status === 'busy' ? 'bg-red-100 text-red-800' : 
            room?.status === 'repair' ? 'bg-yellow-100 text-yellow-800' : 
            'bg-green-100 text-green-800'
          }`}>
            {statusLabel}
          </span>
        </div>
      </div>
    </div>
  );
};

export default function CalendarPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [filterBuilding, setFilterBuilding] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipEvent, setTooltipEvent] = useState<any>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const access = useSelector((state: RootState) => state.auth.access);

  useEffect(() => {
    if (!access) return;
    Promise.all([
      fetch(`${API_URL}/api/bookings/`, { headers: { Authorization: `Bearer ${access}` } }).then(res => res.json()),
      fetch(`${API_URL}/api/rooms/`, { headers: { Authorization: `Bearer ${access}` } }).then(res => res.json()),
      fetch(`${API_URL}/api/buildings/`, { headers: { Authorization: `Bearer ${access}` } }).then(res => res.json()),
    ]).then(([bookingsData, roomsData, buildingsData]) => {
      setBookings(bookingsData);
      setRooms(roomsData);
      setBuildings(buildingsData);
    });
  }, [access]);

  const events = useMemo<any[]>(() => {
    return bookings.map((b: Booking) => {
      const room = rooms.find((r: Room) => r.id === (typeof b.room === 'object' ? b.room.id : b.room));
      const building = buildings.find(bld => bld.id === (typeof room?.building === 'object' ? room.building.id : room?.building));
      
      return {
        id: b.id,
        title: `Номер ${room ? room.number : ''} (${b.people_count} чел.)`,
        start: new Date(b.check_in || b.date_from || ''),
        end: new Date(b.check_out || b.date_to || ''),
        resource: {
          ...b,
          room,
          building,
        },
        allDay: true,
      };
    });
  }, [bookings, rooms, buildings]);

  const filteredEvents = events.filter((e: any) => {
    const room = e.resource.room;
    if (!room) return false;
    
    if (filterBuilding && String(room.building) !== filterBuilding && 
        (typeof room.building === 'number' ? String(room.building) : String(room.building.id)) !== filterBuilding) return false;
    if (filterStatus && room.status !== filterStatus) return false;
    if (filterType && room.room_type !== filterType) return false;
    if (filterClass && (typeof room.room_class === 'object' ? (room.room_class as any).value !== filterClass : room.room_class !== filterClass)) return false;
    return true;
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Календарь занятости номеров</h1>
      {/* Отображение текущего месяца и года */}
      <div className="text-lg font-semibold text-gray-700 mb-2">
        {moment(currentDate).format('MMMM YYYY')}
      </div>
      
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <select 
            value={filterBuilding} 
            onChange={e => setFilterBuilding(e.target.value)} 
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
          <option value="">Все корпуса</option>
          {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
          
          <select 
            value={filterStatus} 
            onChange={e => setFilterStatus(e.target.value)} 
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
          <option value="">Все статусы</option>
          <option value="free">Свободен</option>
          <option value="busy">Занят</option>
          <option value="repair">На ремонте</option>
        </select>
          
          <select 
            value={filterType} 
            onChange={e => setFilterType(e.target.value)} 
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
          <option value="">Все типы</option>
          {[...new Set(rooms.map(r => r.room_type))].map(type => <option key={type} value={type}>{type}</option>)}
        </select>
          
          <select 
            value={filterClass} 
            onChange={e => setFilterClass(e.target.value)} 
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
          <option value="">Все классы</option>
          <option value="standard">Стандарт</option>
          <option value="semi_lux">Полу-люкс</option>
          <option value="lux">Люкс</option>

        </select>
          
          <div className="flex gap-2">
        <button
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          onClick={() => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
        >
          <FaChevronLeft /> Предыдущий месяц
        </button>
        <button
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          onClick={() => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
        >
          Следующий месяц <FaChevronRight />
        </button>
      </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
      <Calendar
        localizer={localizer}
        events={filteredEvents}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 400 }}
        date={currentDate}
        onNavigate={(date: Date) => setCurrentDate(date)}
        components={{ toolbar: () => null }}
        eventPropGetter={(event: any) => {
            const status = event.resource.room?.status;
            if (status === "busy") return { 
              style: { 
                backgroundColor: "#ef4444", 
                color: "white",
                border: "2px solid #dc2626",
                borderRadius: "6px",
                fontWeight: "600"
              } 
            };
            if (status === "repair") return { 
              style: { 
                backgroundColor: "#f59e0b", 
                color: "white",
                border: "2px solid #d97706",
                borderRadius: "6px",
                fontWeight: "600"
              } 
            };
            return { 
              style: { 
                backgroundColor: "#10b981", 
                color: "white",
                border: "2px solid #059669",
                borderRadius: "6px",
                fontWeight: "600"
              } 
            };
        }}
          onSelectEvent={(event: any, e: any) => {
            // Не показывать тултип, если клик по кнопке действия
            if (e && e.target && e.target.closest && e.target.closest('button[data-action="edit"],button[data-action="delete"]')) return;
            // Показываем тултип при клике, позиция — рядом с курсором
            if (e && e.clientX && e.clientY) {
              setTooltipPosition({ x: e.clientX, y: e.clientY });
            } else {
              setTooltipPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
            }
            setTooltipEvent(event);
            setShowTooltip(true);
          }}
          messages={{
            next: "Следующий",
            previous: "Предыдущий",
            today: "Сегодня",
            month: "Месяц",
            week: "Неделя",
            day: "День",
            agenda: "Повестка",
            date: "Дата",
            time: "Время",
            event: "Событие",
            noEventsInRange: "Нет событий в выбранном диапазоне.",
            showMore: (total: number) => `+${total} еще`
          }}
        />
      </div>

      {/* Кастомный тултип */}
      {showTooltip && tooltipEvent && (
        <div 
          className="fixed z-50 pointer-events-auto"
          style={{ 
            left: tooltipPosition.x + 10, 
            top: tooltipPosition.y - 10,
            transform: 'translateY(-100%)'
          }}
        >
          <CustomTooltip event={tooltipEvent} onClose={() => setShowTooltip(false)} />
        </div>
      )}
    </div>
  );
} 