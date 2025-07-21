'use client';
import { Provider } from 'react-redux';
import { store, setAuth } from '../app/store';
import I18nProvider from './I18nProvider';
import { useEffect } from 'react';

export default function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Инициализация auth из localStorage
    const access = localStorage.getItem('access');
    const refresh = localStorage.getItem('refresh');
    const role = localStorage.getItem('role');
    let user = null;
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) user = JSON.parse(userStr);
    } catch {}
    if (access || refresh || role || user) {
      store.dispatch(setAuth({ access, refresh, role, user }));
    }
  }, []);

  return (
    <Provider store={store}>
      <I18nProvider>
        {children}
      </I18nProvider>
    </Provider>
  );
} 