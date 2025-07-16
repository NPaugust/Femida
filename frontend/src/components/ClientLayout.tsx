'use client';

import { useTranslation } from 'react-i18next';
import SidebarDrawer from './SidebarDrawer';
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
        <SidebarDrawer />
        <div className="flex-1 flex flex-col min-h-screen transition-all duration-300">
          <Header />
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
} 