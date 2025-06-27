'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaBed, FaUserFriends, FaCalendarCheck, FaUserShield, FaHome, FaRegCalendarAlt, FaChartBar } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';

const menu = [
  {
    label: 'Главная',
    icon: <FaHome size={20} />,
    href: '/',
  },
  {
    label: 'Номера',
    icon: <FaBed size={20} />,
    href: '/rooms',
  },
  {
    label: 'Бронирование',
    icon: <FaCalendarCheck size={20} />,
    href: '/bookings',
  },
  {
    label: 'Календарь',
    icon: <FaRegCalendarAlt size={20} />,
    href: '/calendar',
  },
  {
    label: 'Отчёты',
    icon: <FaChartBar size={20} />,
    href: '/reports',
  },
  {
    label: 'Гости',
    icon: <FaUserFriends size={20} />,
    href: '/guests',
  },
  {
    label: 'Сотрудники',
    icon: <FaUserShield size={20} />,
    href: '/users',
    superadminOnly: true,
  },
];

export default function Sidebar({ onLogout }: { onLogout: () => void }) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [userRole, setUserRole] = useState<string>('');
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem('role') || '';
    setUserRole(role);
    setIsHydrated(true);
  }, []);

  // На сервере и до hydration показываем все пункты меню
  // После hydration фильтруем по роли
  const filteredMenu = isHydrated && userRole 
    ? menu.filter(item => !item.superadminOnly || userRole === 'superadmin')
    : menu;

  return (
    <aside className="h-screen w-64 bg-white shadow-lg flex flex-col py-6 px-2 fixed z-20">
      <div className="mb-8 flex items-center gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-2xl font-bold text-blue-700 group-hover:text-blue-900 transition">Femida</span>
          <FaHome className="text-blue-400 group-hover:text-blue-700 transition" />
        </Link>
      </div>
      <nav className="flex-1">
        <ul className="space-y-2">
          {filteredMenu.map(item => (
            <li key={item.label}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg font-medium transition-all hover:bg-blue-50 hover:text-blue-700 ${
                  item.href === '/' 
                    ? (pathname === '/' ? 'bg-blue-100 text-blue-700' : 'text-gray-700')
                    : (pathname === item.href || pathname.startsWith(item.href)) 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-700'
                }`}
              >
                {item.icon}
                {t(item.label)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
} 