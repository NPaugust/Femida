import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

const i18n = createInstance({
  lng: 'ru',
  fallbackLng: 'ru',
  debug: false,
  resources: {
    ru: {
      translation: {
        'Главная': 'Главная',
        'Номера': 'Номера',
        'Бронирование': 'Бронирование',
        'Календарь': 'Календарь',
        'Отчёты': 'Отчёты',
        'Гости': 'Гости',
        'Сотрудники': 'Сотрудники',
        'Добавить': 'Добавить',
        'Редактировать': 'Редактировать',
        'Удалить': 'Удалить',
        'Сохранить': 'Сохранить',
        'Отмена': 'Отмена',
        'Закрыть': 'Закрыть',
        'Поиск': 'Поиск',
        'Фильтр': 'Фильтр',
        'Экспорт в CSV': 'Экспорт в CSV',
        'Импорт': 'Импорт',
        'Дата': 'Дата',
        'Время': 'Время',
        'Статус': 'Статус',
        'Действия': 'Действия',
        'Нет данных': 'Нет данных',
        'Загрузка...': 'Загрузка...',
        'Ошибка загрузки данных': 'Ошибка загрузки данных',
        'Успешно сохранено': 'Успешно сохранено',
        'Ошибка сохранения': 'Ошибка сохранения',
        'Подтвердите удаление': 'Подтвердите удаление',
        'Успешно удалено': 'Успешно удалено',
        'Ошибка удаления': 'Ошибка удаления',
      }
    },
    ky: {
      translation: {
        'Главная': 'Башкы',
        'Номера': 'Бөлмөлөр',
        'Бронирование': 'Брондоо',
        'Календарь': 'Күндөлүк',
        'Отчёты': 'Отчеттор',
        'Гости': 'Коноктор',
        'Сотрудники': 'Колдонуучулар',
        'Добавить': 'Кошуу',
        'Редактировать': 'Оңдоо',
        'Удалить': 'Жоюу',
        'Сохранить': 'Сактоо',
        'Отмена': 'Жокко чыгаруу',
        'Закрыть': 'Жабуу',
        'Поиск': 'Издөө',
        'Фильтр': 'Фильтр',
        'Экспорт в CSV': 'Экспорт в CSV',
        'Импорт': 'Импорт',
        'Дата': 'Күнү',
        'Время': 'Убакыт',
        'Статус': 'Статус',
        'Действия': 'Аракеттер',
        'Нет данных': 'Маалымат жок',
        'Загрузка...': 'Жүктөлүүдө...',
        'Ошибка загрузки данных': 'Маалыматты жүктөөдө ката',
        'Успешно сохранено': 'Ийгиликтүү сакталды',
        'Ошибка сохранения': 'Сактоодо ката',
        'Подтвердите удаление': 'Жоюуну ырастаңыз',
        'Успешно удалено': 'Ийгиликтүү жойулду',
        'Ошибка удаления': 'Жоюуда ката',
      }
    }
  },
  interpolation: {
    escapeValue: false,
  },
});

i18n.use(initReactI18next);

export default i18n; 