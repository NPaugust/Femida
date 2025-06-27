'use client';
import React from 'react';
// @ts-ignore
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ru } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

registerLocale('ru', ru);

export default function DatePickerClient(props: any) {
  const { i18n } = useTranslation();
  // Для ky используем ru как fallback
  const lang = i18n.language === 'ky' ? 'ru' : 'ru';
  // Прокидываем все пропсы, но по умолчанию locale='ru', showTimeSelect=true, dateFormat='Pp'
  return (
    <DatePicker
      locale={props.locale || lang}
      showTimeSelect={props.showTimeSelect !== undefined ? props.showTimeSelect : true}
      timeFormat={props.timeFormat || 'HH:mm'}
      dateFormat={props.dateFormat || 'Pp'}
      timeIntervals={props.timeIntervals || 15}
      {...props}
    />
  );
} 