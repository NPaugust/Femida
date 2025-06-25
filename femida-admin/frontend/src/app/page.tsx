"use client";

import React, { useEffect, useState } from "react";
import { FaBed, FaUserFriends, FaCalendarCheck, FaUsers } from "react-icons/fa";
import { useRouter } from "next/navigation";

const ROOM_CLASS_LABELS: Record<string, string> = {
  standard: "Стандарт",
  semi_lux: "Полу-люкс",
  lux: "Люкс",
};
const ROOM_CLASS_COLORS: Record<string, string> = {
  standard: "text-gray-500",
  semi_lux: "text-yellow-500",
  lux: "text-purple-600",
};

export default function Dashboard() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [guests, setGuests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token) {
      window.location.href = "/login";
      return;
    }
    setLoading(true);
    Promise.all([
      fetch("http://127.0.0.1:8000/api/rooms/", { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json()),
      fetch("http://127.0.0.1:8000/api/bookings/", { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json()),
      fetch("http://127.0.0.1:8000/api/guests/", { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json()),
    ])
      .then(([roomsData, bookingsData, guestsData]) => {
        setRooms(roomsData);
        setBookings(bookingsData);
        setGuests(guestsData);
        setLoading(false);
      });
  }, []);

  // Гарантируем, что rooms, bookings, guests — массивы
  const roomsArray = Array.isArray(rooms) ? rooms : ((rooms as any)?.results || []);
  const bookingsArray = Array.isArray(bookings) ? bookings : ((bookings as any)?.results || []);
  const guestsArray = Array.isArray(guests) ? guests : ((guests as any)?.results || []);

  const today = new Date();
  const busyRooms = roomsArray.filter((room: any) =>
    bookingsArray.some((b: any) => b.room.id === room.id && new Date(b.date_from) <= today && new Date(b.date_to) >= today)
  );
  const freeRooms = roomsArray.length - busyRooms.length;
  const activeBookings = bookingsArray.filter((b: any) => new Date(b.date_from) <= today && new Date(b.date_to) >= today);

  // Визуализация номеров: домики в ряд
  const renderRoomHouses = () => (
    <div className="w-full flex flex-col items-center mt-4">
      <div className="flex flex-wrap gap-4 justify-center">
        {roomsArray.map((room: any) => {
          const isBusy = bookingsArray.some((b: any) => b.room.id === room.id && new Date(b.date_from) <= today && new Date(b.date_to) >= today);
          return (
            <div key={room.id} className="flex flex-col items-center w-20">
              <span
                title={`Номер: ${room.number}\nКласс: ${ROOM_CLASS_LABELS[room.room_class] || room.room_class}\nСтатус: ${isBusy ? 'Занят' : 'Свободен'}`}
                className="text-3xl select-none"
                style={{ filter: isBusy ? 'grayscale(0.7)' : 'none' }}
              >🏠</span>
              <span className={`text-xs font-semibold mt-1 ${ROOM_CLASS_COLORS[room.room_class]}`}>{ROOM_CLASS_LABELS[room.room_class] || '-'}</span>
              <span className="mt-1">
                <span className={`inline-block w-3 h-3 rounded-full ${isBusy ? 'bg-red-500' : 'bg-green-500'}`}></span>
              </span>
              <span className="text-xs text-gray-400 mt-1">Номер комнаты {room.number}</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Динамический расчёт мест по классам номеров:
  const placesByClass = roomsArray.reduce((acc: any, room: any) => {
    const capacity = room.capacity || 1;
    if (!acc[room.room_class]) {
      acc[room.room_class] = 0;
    }
    acc[room.room_class] += capacity;
    return acc;
  }, {});

  // Карточки отчётов (кликабельные)
  const stats = [
    {
      label: 'Всего номеров',
      value: roomsArray.length,
      icon: <FaBed className="text-blue-600 text-xl mb-1" />,
      onClick: () => router.push('/rooms'),
    },
    {
      label: 'Активных бронирований',
      value: activeBookings.length,
      icon: <FaCalendarCheck className="text-green-600 text-xl mb-1" />,
      onClick: () => router.push('/bookings'),
    },
    {
      label: 'Гостей',
      value: guestsArray.length,
      icon: <FaUsers className="text-purple-600 text-xl mb-1" />,
      onClick: () => router.push('/guests'),
    },
    {
      label: 'Занятых номеров',
      value: busyRooms.length,
      icon: <FaBed className="text-red-600 text-xl mb-1" />,
      onClick: () => router.push('/rooms'),
      extra: <span className="text-green-600 text-xs font-semibold mt-1">Свободно: {freeRooms}</span>,
    },
    {
      label: 'Обновлено',
      value: <span className="text-xs text-gray-500">{new Date().toLocaleString()}</span>,
      icon: <span className="text-xs text-gray-400">⏱</span>,
      onClick: undefined,
    },
  ];

  // Формат даты дд.мм.гггг:
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU');
  };

  return (
    <div className="p-4 max-w-[1400px] mx-auto">
      <h1 className="text-3xl font-bold mb-4">Добро пожаловать в админ-панель Фемида</h1>
      {loading ? (
        <div className="text-center text-gray-500">Загрузка...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            {stats.map((stat, i) => (
              <div
                key={stat.label}
                className={`bg-white rounded-lg shadow p-3 flex flex-col items-center gap-1 min-w-[90px] cursor-pointer hover:bg-blue-50 transition ${stat.onClick ? 'hover:shadow-lg active:scale-95' : ''}`}
                onClick={stat.onClick}
                title={stat.label}
              >
                {stat.icon}
                <div className="text-lg font-bold leading-none">{stat.value}</div>
                <div className="text-xs text-gray-500">{stat.label}</div>
                {stat.extra}
              </div>
            ))}
          </div>
          
          {/* Статистика по классам номеров */}
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <h3 className="text-lg font-semibold mb-3">Мест по классам номеров</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(placesByClass).map(([roomClass, capacity]) => (
                <div key={roomClass} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className={`text-lg ${ROOM_CLASS_COLORS[roomClass]}`}>
                      {roomClass === 'standard' && '🛏️'}
                      {roomClass === 'semi_lux' && '⭐'}
                      {roomClass === 'lux' && '👑'}
                    </span>
                    <span className="font-semibold">{ROOM_CLASS_LABELS[roomClass] || roomClass}</span>
                  </div>
                  <span className="text-xl font-bold text-blue-600">{capacity as number}</span>
                </div>
              ))}
            </div>
          </div>
          
          {renderRoomHouses()}
        </>
      )}
    </div>
  );
}
