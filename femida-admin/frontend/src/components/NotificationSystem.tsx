'use client';

import React, { useState, useEffect } from 'react';
import { FaBell, FaTimes, FaEnvelope, FaSms, FaCheckCircle, FaExclamationTriangle, FaInfoCircle } from 'react-icons/fa';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationSystemProps {
  children: React.ReactNode;
}

export const NotificationContext = React.createContext<{
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  clearAll: () => void;
  sendMessage: (guestId: number, type: 'sms' | 'email', message: string) => Promise<void>;
  openMessageModal: (guest: any) => void;
}>({
  notifications: [],
  addNotification: () => {},
  markAsRead: () => {},
  clearAll: () => {},
  sendMessage: async () => {},
  openMessageModal: () => {},
});

export function NotificationProvider({ children }: NotificationSystemProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<any>(null);
  const [messageType, setMessageType] = useState<'sms' | 'email'>('sms');
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false,
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const sendMessage = async (guestId: number, type: 'sms' | 'email', message: string) => {
    setSending(true);
    try {
      const token = localStorage.getItem('access');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/send-message/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          guest_id: guestId,
          type,
          message,
        }),
      });

      if (response.ok) {
        addNotification({
          type: 'success',
          title: 'Сообщение отправлено',
          message: `Сообщение успешно отправлено гостю через ${type === 'sms' ? 'SMS' : 'email'}`,
        });
        setShowMessageModal(false);
        setMessageText('');
      } else {
        throw new Error('Ошибка отправки');
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Ошибка отправки',
        message: 'Не удалось отправить сообщение. Попробуйте позже.',
      });
    } finally {
      setSending(false);
    }
  };

  const openMessageModal = (guest: any) => {
    setSelectedGuest(guest);
    setShowMessageModal(true);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, markAsRead, clearAll, sendMessage, openMessageModal }}>
      {children}
      
      {/* Иконка уведомлений */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setShowPanel(!showPanel)}
          className="relative bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all"
        >
          <FaBell className="text-xl text-gray-600" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Панель уведомлений */}
      {showPanel && (
        <div className="fixed bottom-24 right-6 z-50 w-full max-w-xs sm:max-w-sm md:max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 animate-fade-in" style={{boxShadow: '0 8px 32px rgba(0,0,0,0.18)'}}>
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold text-lg">Уведомления</h3>
            <div className="flex gap-2">
              <button
                onClick={clearAll}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Очистить все
              </button>
              <button
                onClick={() => setShowPanel(false)}
                className="text-gray-400 hover:text-gray-700 text-xl"
              >
                <FaTimes />
              </button>
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                Нет уведомлений
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`p-4 border-b hover:bg-gray-50 cursor-pointer ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 ${
                      notification.type === 'success' ? 'text-green-500' :
                      notification.type === 'error' ? 'text-red-500' :
                      notification.type === 'warning' ? 'text-yellow-500' :
                      'text-blue-500'
                    }`}>
                      {notification.type === 'success' ? <FaCheckCircle /> :
                       notification.type === 'error' ? <FaExclamationTriangle /> :
                       notification.type === 'warning' ? <FaExclamationTriangle /> :
                       <FaInfoCircle />}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm">{notification.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        {notification.timestamp.toLocaleTimeString()}
                      </p>
                      {notification.action && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            notification.action!.onClick();
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 mt-2"
                        >
                          {notification.action.label}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Модальное окно отправки сообщения */}
      {showMessageModal && selectedGuest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Отправить сообщение</h3>
              <button
                onClick={() => setShowMessageModal(false)}
                className="text-gray-400 hover:text-gray-700"
              >
                <FaTimes />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Гость: {selectedGuest.full_name}</p>
              <p className="text-sm text-gray-600">Телефон: {selectedGuest.phone}</p>
              {selectedGuest.email && (
                <p className="text-sm text-gray-600">Email: {selectedGuest.email}</p>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Тип сообщения:</label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="sms"
                    checked={messageType === 'sms'}
                    onChange={(e) => setMessageType(e.target.value as 'sms')}
                    className="mr-2"
                  />
                  <FaSms className="mr-1" />
                  SMS
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="email"
                    checked={messageType === 'email'}
                    onChange={(e) => setMessageType(e.target.value as 'email')}
                    className="mr-2"
                  />
                  <FaEnvelope className="mr-1" />
                  Email
                </label>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Сообщение:</label>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="w-full p-3 border rounded-lg resize-none"
                rows={4}
                placeholder={`Введите ${messageType === 'sms' ? 'SMS' : 'email'} сообщение...`}
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowMessageModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Отмена
              </button>
              <button
                onClick={() => sendMessage(selectedGuest.id, messageType, messageText)}
                disabled={!messageText.trim() || sending}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {sending ? 'Отправка...' : 'Отправить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Закрытие панели при клике вне её */}
      {showPanel && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowPanel(false)}
        />
      )}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const context = React.useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}; 