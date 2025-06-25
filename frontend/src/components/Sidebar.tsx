import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/router';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';

export default function Sidebar({ onLogout }: { onLogout: () => void }) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setUserRole(localStorage.getItem('role') || '');
    }
  }, []);

  return (
    <div className="flex-1">
      <nav className="flex-1">
        <ul className="space-y-2">
          {menu.filter(item => !item.superadminOnly || userRole === 'superadmin').map(item => (
            <li key={item.label}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg font-medium transition-all hover:bg-blue-50 hover:text-blue-700 ${pathname === item.href || pathname.startsWith(item.href) ? 'bg-blue-100 text-blue-700' : 'text-gray-700'}`}
              >
                {item.icon}
                {t(item.label)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
} 