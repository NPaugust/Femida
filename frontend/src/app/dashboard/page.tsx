"use client";
import Link from "next/link";
import { FaBed, FaUser, FaCalendarCheck, FaChartBar } from "react-icons/fa";

export default function DashboardPage() {
  return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[80vh]">
      <h1 className="text-3xl font-bold mb-8">Главная</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl">
        <Link href="/rooms" className="flex flex-col items-center justify-center bg-white rounded-xl shadow-lg p-8 hover:bg-blue-50 transition-all">
          <FaBed className="text-4xl text-blue-600 mb-2" />
          <span className="text-xl font-semibold">Заполнить номера</span>
        </Link>
        <Link href="/guests" className="flex flex-col items-center justify-center bg-white rounded-xl shadow-lg p-8 hover:bg-green-50 transition-all">
          <FaUser className="text-4xl text-green-600 mb-2" />
          <span className="text-xl font-semibold">Заполнить гостей</span>
        </Link>
        <Link href="/bookings" className="flex flex-col items-center justify-center bg-white rounded-xl shadow-lg p-8 hover:bg-purple-50 transition-all">
          <FaCalendarCheck className="text-4xl text-purple-600 mb-2" />
          <span className="text-xl font-semibold">Заполнить бронирования</span>
        </Link>
        <Link href="/reports" className="flex flex-col items-center justify-center bg-white rounded-xl shadow-lg p-8 hover:bg-yellow-50 transition-all">
          <FaChartBar className="text-4xl text-yellow-600 mb-2" />
          <span className="text-xl font-semibold">Отчёты</span>
        </Link>
      </div>
    </div>
  );
} 