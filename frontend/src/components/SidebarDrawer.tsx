'use client';

import React, { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { FaChevronLeft, FaChevronRight, FaHome, FaCalendarCheck, FaUser, FaBed, FaChartBar, FaTrash, FaUsers, FaBuilding } from "react-icons/fa";
import { useSelector } from 'react-redux';
import { RootState } from '../app/store';

const MENU = [
  { href: "/dashboard", label: "Главная", icon: <FaHome /> },
  { href: "/bookings", label: "Бронирования", icon: <FaCalendarCheck /> },
  { href: "/buildings", label: "Здания", icon: <FaBuilding /> },
  { href: "/rooms", label: "Номера", icon: <FaBed /> },
  { href: "/guests", label: "Гости", icon: <FaUser /> },
  { href: "/reports", label: "Отчёты", icon: <FaChartBar /> },
  { href: "/trash", label: "Корзина", icon: <FaTrash /> },
  { href: "/users", label: "Сотрудники", icon: <FaUsers /> },
];

export default function SidebarDrawer({ open, setOpen }: { open: boolean, setOpen: (open: boolean) => void }) {
  const [showArrow, setShowArrow] = React.useState(true);
  const userRole = useSelector((state: RootState) => state.auth.role) || 'admin';
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Закрытие при клике вне Sidebar
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, setOpen]);

  // Анимация стрелки
  useEffect(() => {
    if (open) {
      setShowArrow(false);
    } else {
      const timeout = setTimeout(() => setShowArrow(true), 250);
      return () => clearTimeout(timeout);
    }
  }, [open]);

  return (
    <>
      {/* Затемнение фона при открытом сайдбаре */}
      {open && (
        <div className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm transition-opacity duration-300 animate-fade-in" onClick={() => setOpen(false)} />
      )}
      {/* Блокировка скролла при открытом сайдбаре */}
      {open && typeof window !== 'undefined' && (document.body.style.overflow = 'hidden')}
      {!open && typeof window !== 'undefined' && (document.body.style.overflow = '')}
      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={`fixed top-0 left-0 h-full z-40 transition-all duration-300 flex flex-col bg-white border-r border-gray-200
          ${open ? "w-64" : "w-0 overflow-hidden"}`}
        style={{ 
          minWidth: open ? 256 : 0, 
          boxShadow: open ? '0 0 32px 0 rgba(0,0,0,0.1)' : undefined 
        }}
      >
        <div className="flex items-center justify-between px-6 py-6 border-b border-gray-200">
          <div className={`transition-all ${open ? "opacity-100" : "opacity-0 w-0"}`}>
            <span className="font-bold text-2xl text-gray-900">Фемида</span>
            <div className="text-gray-600 text-sm mt-1">Админ-панель</div>
          </div>
          <button
            className="text-gray-600 text-xl focus:outline-none ml-auto bg-gray-100 rounded-full p-2 hover:bg-gray-200 transition-colors"
            onClick={() => setOpen(false)}
            aria-label="Закрыть меню"
          >
            <FaChevronLeft />
          </button>
        </div>
        <nav className="flex-1 flex flex-col gap-2 mt-4 px-3">
          {MENU.map((item) => {
            // Скрываем раздел "Сотрудники" для не-супер-админов
            if (item.href === "/users" && userRole !== 'superadmin') {
              return null;
            }
            
            return (
            <Link
              key={item.href}
              href={item.href}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-all font-medium group ${open ? "justify-start" : "justify-center"}`}
            >
                <span className="text-xl group-hover:scale-110 transition-transform">{item.icon}</span>
              <span className={`transition-all ${open ? "block" : "hidden"}`}>{item.label}</span>
            </Link>
            );
          })}
        </nav>

      </aside>
    </>
  );
} 