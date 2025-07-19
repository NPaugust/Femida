"use client";

import React from 'react';
import { FaBed, FaUser, FaCalendarCheck, FaMoneyBillWave, FaExclamationTriangle, FaCheckCircle, FaTimesCircle, FaInfoCircle, FaQuestionCircle, FaLightbulb, FaExclamationCircle, FaSearch } from 'react-icons/fa';

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="w-full px-2 md:px-6 xl:px-16 py-0 flex flex-col gap-1">
        <div className="flex items-center gap-4 bg-white/80 rounded-2xl shadow p-4 mb-2 mt-6">
          <div className="flex flex-col">
            <span className="text-lg font-bold text-gray-900">📚 Руководство для сотрудников</span>
            <span className="text-sm text-gray-500">Подробная инструкция по работе с системой управления пансионатом</span>
          </div>
        </div>

        {/* Глобальный поиск */}
        <div className="bg-white/90 rounded-2xl shadow mb-4 p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <FaSearch className="text-blue-500" />
            Глобальный поиск
          </h2>
          
          <div className="space-y-3">
            <p className="text-gray-700">
              В верхней части экрана находится поле глобального поиска, которое позволяет быстро найти нужную информацию:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li><strong>Поиск гостей</strong> - введите имя, фамилию или отчество гостя</li>
              <li><strong>Поиск номеров</strong> - введите номер комнаты</li>
              <li><strong>Поиск бронирований</strong> - введите любую информацию о бронировании</li>
            </ul>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>💡 Совет:</strong> Поиск автоматически перенаправит вас на страницу бронирований с примененным фильтром
              </p>
            </div>
          </div>
        </div>

        {/* Основные принципы */}
        <div className="bg-white/90 rounded-2xl shadow mb-4 p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <FaLightbulb className="text-yellow-500" />
            Основные принципы работы системы
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <FaBed className="text-blue-500" />
                Статусы номеров (автоматические)
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  <span className="font-medium">Свободен</span>
                  <span className="text-gray-600">- номер доступен для бронирования</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="font-medium">Забронирован</span>
                  <span className="text-gray-600">- номер занят активным бронированием</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
                  <span className="font-medium">Недоступен</span>
                  <span className="text-gray-600">- номер на ремонте или техническом обслуживании</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <FaCalendarCheck className="text-green-500" />
                Статусы бронирований (автоматические)
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  <span className="font-medium">Активно</span>
                  <span className="text-gray-600">- гость проживает в номере</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="font-medium">Завершено</span>
                  <span className="text-gray-600">- гость выехал</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="font-medium">Отменено</span>
                  <span className="text-gray-600">- бронирование отменено</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <FaMoneyBillWave className="text-yellow-500" />
              Статусы оплаты (ручные)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <span className="font-medium">В ожидании</span>
                <span className="text-gray-600">- оплата ожидается</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                <span className="font-medium">Оплачено</span>
                <span className="text-gray-600">- оплата получена</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="font-medium">Не оплачено</span>
                <span className="text-gray-600">- оплата не получена</span>
              </div>
            </div>
            <div className="mt-4 bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>💡 Важно:</strong> Статус оплаты необходимо обновлять вручную при получении платежа. Это влияет на статистику и отчеты.
              </p>
            </div>
          </div>
        </div>

        {/* Логика работы */}
        <div className="bg-white/90 rounded-2xl shadow mb-4 p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <FaInfoCircle className="text-blue-500" />
            Логика работы системы
          </h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-2">Автоматическое обновление статусов:</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li><strong>При создании бронирования</strong> → номер автоматически становится "Забронирован"</li>
                <li><strong>При завершении бронирования</strong> → номер автоматически становится "Свободен"</li>
                <li><strong>При отмене бронирования</strong> → номер автоматически становится "Свободен"</li>
              </ol>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">Расчет стоимости:</h3>
              <p className="text-gray-700">
                Система автоматически рассчитывает общую стоимость на основе:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                <li>Цены номера за сутки (задается в разделе "Номера")</li>
                <li>Количества дней проживания</li>
        </ul>
            </div>
          </div>
        </div>

        {/* Как работать с системой */}
        <div className="bg-white/90 rounded-2xl shadow mb-4 p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <FaUser className="text-green-500" />
            Как работать с системой
          </h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-3">Добавление нового бронирования:</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>Перейдите в раздел <strong>"Бронирования"</strong></li>
                <li>Нажмите <strong>"Добавить"</strong></li>
                <li>Заполните поля:
                  <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                    <li><strong>Статус оплаты</strong> - выберите текущий статус оплаты</li>
                    <li><strong>Гость</strong> - выберите из списка или создайте нового</li>
                    <li><strong>Количество гостей</strong> - укажите количество</li>
                    <li><strong>Номер</strong> - выберите доступный номер</li>
                    <li><strong>Дата заезда/выезда</strong> - укажите период проживания</li>
                    <li><strong>Комментарий</strong> - при необходимости</li>
        </ul>
                </li>
                <li>Нажмите <strong>"Сохранить"</strong></li>
              </ol>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-3">Управление номерами:</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>Перейдите в раздел <strong>"Номера"</strong></li>
                <li>Для добавления номера нажмите <strong>"Добавить"</strong></li>
                <li>Обязательно укажите <strong>"Цена за сутки"</strong> - это основа для расчета стоимости</li>
                <li>Статус номера обновляется автоматически</li>
              </ol>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-3">Проверка статусов:</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li><strong>Главная страница</strong> - общий обзор всех номеров и бронирований</li>
                <li><strong>Раздел "Номера"</strong> - детальная информация по каждому номеру</li>
                <li><strong>Раздел "Бронирования"</strong> - все активные и завершенные бронирования</li>
                <li><strong>Раздел "Отчеты"</strong> - аналитика и статистика</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-3">Быстрые действия на главной странице:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">📊 Карточки статистики</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• <strong>Все номера</strong> - общее количество номеров</li>
                    <li>• <strong>Бронирований</strong> - количество всех бронирований</li>
                    <li>• <strong>Оплачено</strong> - количество оплаченных бронирований</li>
                    <li>• <strong>Не оплачено</strong> - количество неоплаченных бронирований</li>
                    <li>• <strong>Гостей</strong> - общее количество гостей</li>
                    <li>• <strong>Общая выручка</strong> - сумма всех бронирований</li>
                  </ul>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">⚡ Кнопки быстрых действий</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• <strong>Бронирование</strong> - создание нового бронирования</li>
                    <li>• <strong>Гости</strong> - управление базой гостей</li>
                    <li>• <strong>Номера</strong> - управление номерами</li>
                    <li>• <strong>Отчёты</strong> - экспорт данных</li>
                    <li>• <strong>Здания</strong> - управление зданиями</li>
                    <li>• <strong>Корзина</strong> - удаленные записи</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-3">Детальная статистика:</h3>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-purple-800 mb-2">
                  <strong>📈 Кнопка "Показать статистику"</strong> открывает подробную информацию:
                </p>
                <ul className="text-sm text-purple-700 space-y-1">
                  <li>• <strong>Данные</strong> - карточки всех номеров с их статусами и информацией</li>
                  <li>• <strong>Статистика</strong> - прогресс-бары заполненности номеров и гостей</li>
                  <li>• <strong>Номера</strong> - таблица всех номеров с детальной информацией</li>
                  <li>• <strong>Детали бронирований</strong> - таблица последних бронирований</li>
                  <li>• <strong>Гости</strong> - таблица последних гостей</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Важные моменты */}
        <div className="bg-white/90 rounded-2xl shadow mb-4 p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <FaExclamationTriangle className="text-orange-500" />
            Важные моменты
          </h2>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <FaCheckCircle className="text-green-500 mt-1 flex-shrink-0" />
              <div>
                <strong>Не редактируйте статус номера вручную</strong> - он обновляется автоматически
              </div>
            </div>
            <div className="flex items-start gap-3">
              <FaCheckCircle className="text-green-500 mt-1 flex-shrink-0" />
              <div>
                <strong>Статус бронирования</strong> также обновляется автоматически
              </div>
            </div>
            <div className="flex items-start gap-3">
              <FaCheckCircle className="text-green-500 mt-1 flex-shrink-0" />
              <div>
                <strong>Статус оплаты</strong> - единственное поле, которое нужно контролировать вручную
              </div>
            </div>
            <div className="flex items-start gap-3">
              <FaCheckCircle className="text-green-500 mt-1 flex-shrink-0" />
              <div>
                <strong>Цена номера</strong> - задается один раз в разделе "Номера" и используется для всех расчетов
              </div>
            </div>
          </div>
        </div>

        {/* Частые ошибки */}
        <div className="bg-white/90 rounded-2xl shadow mb-4 p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <FaExclamationCircle className="text-red-500" />
            Частые ошибки
          </h2>
          
          <div className="space-y-4">
            <div className="border-l-4 border-red-500 pl-4">
              <div className="flex items-center gap-2 mb-2">
                <FaTimesCircle className="text-red-500" />
                <strong className="text-red-700">Неправильно:</strong>
              </div>
              <p className="text-gray-700">Ручное изменение статуса номера на "Свободен" при наличии активного бронирования</p>
            </div>
            
            <div className="border-l-4 border-green-500 pl-4">
              <div className="flex items-center gap-2 mb-2">
                <FaCheckCircle className="text-green-500" />
                <strong className="text-green-700">Правильно:</strong>
              </div>
              <p className="text-gray-700">Завершить бронирование, тогда статус обновится автоматически</p>
            </div>

            <div className="border-l-4 border-red-500 pl-4">
              <div className="flex items-center gap-2 mb-2">
                <FaTimesCircle className="text-red-500" />
                <strong className="text-red-700">Неправильно:</strong>
              </div>
              <p className="text-gray-700">Не указывать цену номера</p>
            </div>
            
            <div className="border-l-4 border-green-500 pl-4">
              <div className="flex items-center gap-2 mb-2">
                <FaCheckCircle className="text-green-500" />
                <strong className="text-green-700">Правильно:</strong>
              </div>
              <p className="text-gray-700">Всегда указывать цену за сутки при создании номера</p>
            </div>
          </div>
        </div>

        {/* Поддержка */}
        <div className="bg-white/90 rounded-2xl shadow mb-4 p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <FaQuestionCircle className="text-blue-500" />
            Поддержка
          </h2>
          
          <p className="text-gray-700">
            При возникновении вопросов обращайтесь к администратору системы.
          </p>
        </div>
      </div>
    </div>
  );
} 