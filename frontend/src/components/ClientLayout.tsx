'use client';

import { useTranslation } from 'react-i18next';
import SidebarDrawer from './SidebarDrawer';
import Header from './Header';
import { usePathname } from 'next/navigation';
import ProtectedRoute from './ProtectedRoute';
import ToastContainer from './Toast';
import { useState } from 'react';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith('/login');

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const changeLang = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  if (isAuthPage) {
    return <main>{children}</main>;
  }

  return (
    <ProtectedRoute>
      <div className="flex h-screen overflow-hidden">
        <SidebarDrawer open={sidebarOpen} setOpen={setSidebarOpen} />
        <div className="flex-1 flex flex-col h-screen transition-all duration-300">
          <Header onSidebarOpen={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
      <ToastContainer />
    </ProtectedRoute>
  );
} 