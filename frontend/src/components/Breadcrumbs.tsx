import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaHome, FaChevronRight } from 'react-icons/fa';

// Карта для человеко-понятных названий разделов
const PATH_LABELS: Record<string, string> = {
  'dashboard': 'Главная',
  'bookings': 'Бронирования',
  'rooms': 'Номера',
  'guests': 'Гости',
  'buildings': 'Здания',
  'reports': 'Отчёты',
  'trash': 'Корзина',
  'users': 'Сотрудники',
  'docs': 'Документация',
};

export default function Breadcrumbs() {
  const pathname = usePathname();
  // /dashboard/rooms -> ['', 'dashboard', 'rooms']
  const parts = pathname.split('/').filter(Boolean);

  // Если на главной, не показываем цепочку
  if (parts.length === 0 || (parts.length === 1 && parts[0] === 'dashboard')) {
    return null;
  }

  // Формируем цепочку
  const crumbs = [
    { href: '/dashboard', label: <><FaHome className="inline mr-1 mb-0.5" />Главная</> },
    ...parts.filter(p => p !== 'dashboard').map((part, idx) => {
      const href = '/dashboard/' + parts.slice(1, idx + 2).join('/');
      return {
        href: `/${part}`,
        label: PATH_LABELS[part] || part.charAt(0).toUpperCase() + part.slice(1),
      };
    })
  ];

  return (
    <nav aria-label="breadcrumb" className="mb-6 mt-4 pl-8">
      <ol className="flex items-center text-base font-semibold gap-3 flex-wrap">
        {crumbs.map((crumb, idx) => (
          <li key={idx} className="flex items-center">
            {idx > 0 && <FaChevronRight className="mx-2 text-gray-400 text-base" />}
            {idx < crumbs.length - 1 ? (
              <Link href={crumb.href} className="text-blue-700 hover:text-blue-800 transition-colors">{crumb.label}</Link>
            ) : (
              <span className="text-gray-500 font-bold">{crumb.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
} 