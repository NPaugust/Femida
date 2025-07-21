'use client';
import { Provider } from 'react-redux';
import { store, setAuth } from '../app/store';
import I18nProvider from './I18nProvider';
import { useEffect } from 'react';
import Cookies from 'js-cookie';

export default function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Инициализация auth из cookies
    const access = Cookies.get('access');
    const refresh = Cookies.get('refresh');
    const role = Cookies.get('role');
    let user = undefined;
    try {
      const userStr = Cookies.get('user');
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