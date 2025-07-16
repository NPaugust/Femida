import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { FaChevronLeft, FaChevronRight, FaHome, FaCalendarCheck, FaUser, FaBed, FaChartBar, FaTrash, FaUsers } from "react-icons/fa";

const MENU = [
  { href: "/dashboard", label: "Главная", icon: <FaHome /> },
  { href: "/bookings", label: "Бронирования", icon: <FaCalendarCheck /> },
  { href: "/guests", label: "Гости", icon: <FaUser /> },
  { href: "/rooms", label: "Номера", icon: <FaBed /> },
  { href: "/reports", label: "Отчёты", icon: <FaChartBar /> },
  { href: "/trash", label: "Корзина", icon: <FaTrash /> },
  { href: "/users", label: "Пользователи", icon: <FaUsers /> },
];

export default function SidebarDrawer() {
  const [open, setOpen] = useState(false);
  const [showArrow, setShowArrow] = useState(true);
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
  }, [open]);

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
      {/* Кнопка-стрелка для открытия с анимацией */}
      <div className="fixed top-20 left-0 z-50 transition-all duration-300">
        <button
          className={`
            bg-white text-gray-700 shadow-lg border border-gray-200
            rounded-r-full w-6 h-10 flex items-center justify-center
            text-2xl focus:outline-none transition-all duration-300
            -translate-x-1/2
            hover:bg-blue-50 hover:text-blue-700
            ${showArrow && !open ? 'opacity-100 translate-x-0 pointer-events-auto' : 'opacity-0 -translate-x-6 pointer-events-none'}
          `}
          style={{ boxShadow: '2px 0 12px 0 rgba(31,38,135,0.10)', transitionProperty: 'opacity, transform' }}
          onClick={() => setOpen(true)}
          aria-label="Открыть меню"
        >
          <FaChevronRight />
        </button>
      </div>
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
        className={`fixed top-0 left-0 h-full z-40 transition-all duration-300 flex flex-col
          ${open ? "w-64" : "w-0 overflow-hidden"}`}
        style={{ background: "#fff", color: "#222", minWidth: open ? 256 : 0, boxShadow: open ? '0 0 24px 0 rgba(31,38,135,0.12)' : undefined }}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <span className={`font-bold text-xl transition-all ${open ? "opacity-100" : "opacity-0 w-0"}`}>Femida</span>
          <button
            className="text-gray-600 text-2xl focus:outline-none ml-auto bg-gray-100 rounded-full p-1 hover:bg-gray-200"
            onClick={() => setOpen(false)}
            aria-label="Закрыть меню"
          >
            <FaChevronLeft />
          </button>
        </div>
        <nav className="flex-1 flex flex-col gap-1 mt-2">
          {MENU.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg mx-2 text-gray-700 hover:bg-gray-100 transition-all font-medium ${open ? "justify-start" : "justify-center"}`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className={`transition-all ${open ? "block" : "hidden"}`}>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
} 