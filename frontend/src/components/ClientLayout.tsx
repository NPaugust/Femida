'use client';

import { useTranslation } from 'react-i18next';
import Sidebar from './Sidebar';
import Header from './Header';
import { usePathname } from 'next/navigation';
import ProtectedRoute from './ProtectedRoute';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith('/login');

  const changeLang = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  if (isAuthPage) {
    return <main>{children}</main>;
  }

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen">
        <Sidebar onLogout={() => {}} />
        <div className="flex-1 flex flex-col ml-64 min-h-screen">
          <Header />
          <main className="flex-1 p-8">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
} 