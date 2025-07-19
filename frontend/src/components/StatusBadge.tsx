'use client';

import { FaCircle } from 'react-icons/fa';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'badge' | 'dot' | 'pill';
  showIcon?: boolean;
  className?: string;
}

export default function StatusBadge({ 
  status, 
  size = 'md', 
  variant = 'badge',
  showIcon = true,
  className = '' 
}: StatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; bgColor: string; borderColor: string; iconColor: string }> = {
      // Статусы бронирований
      'active': {
        label: 'Активно',
        color: 'text-green-800',
        bgColor: 'bg-green-100',
        borderColor: 'border-green-200',
        iconColor: 'text-green-500'
      },
      'completed': {
        label: 'Завершено',
        color: 'text-blue-800',
        bgColor: 'bg-blue-100',
        borderColor: 'border-blue-200',
        iconColor: 'text-blue-500'
      },
      'cancelled': {
        label: 'Отменено',
        color: 'text-red-800',
        bgColor: 'bg-red-100',
        borderColor: 'border-red-200',
        iconColor: 'text-red-500'
      },
      'pending': {
        label: 'В ожидании',
        color: 'text-yellow-800',
        bgColor: 'bg-yellow-100',
        borderColor: 'border-yellow-200',
        iconColor: 'text-yellow-500'
      },
      
      // Статусы номеров
      'free': {
        label: 'Свободен',
        color: 'text-green-800',
        bgColor: 'bg-green-100',
        borderColor: 'border-green-200',
        iconColor: 'text-green-500'
      },
      'busy': {
        label: 'Забронирован',
        color: 'text-red-800',
        bgColor: 'bg-red-100',
        borderColor: 'border-red-200',
        iconColor: 'text-red-500'
      },
      'repair': {
        label: 'Недоступен',
        color: 'text-orange-800',
        bgColor: 'bg-orange-100',
        borderColor: 'border-orange-200',
        iconColor: 'text-orange-500'
      },
      
      // Статусы оплаты
      'paid': {
        label: 'Оплачено',
        color: 'text-green-800',
        bgColor: 'bg-green-100',
        borderColor: 'border-green-200',
        iconColor: 'text-green-500'
      },
      'unpaid': {
        label: 'Не оплачено',
        color: 'text-red-800',
        bgColor: 'bg-red-100',
        borderColor: 'border-red-200',
        iconColor: 'text-red-500'
      },
      
      // Статусы гостей
      'guest_active': {
        label: 'Активный',
        color: 'text-green-800',
        bgColor: 'bg-green-100',
        borderColor: 'border-green-200',
        iconColor: 'text-green-500'
      },
      'inactive': {
        label: 'Неактивный',
        color: 'text-gray-800',
        bgColor: 'bg-gray-100',
        borderColor: 'border-gray-200',
        iconColor: 'text-gray-500'
      },
      'vip': {
        label: 'ВИП',
        color: 'text-purple-800',
        bgColor: 'bg-purple-100',
        borderColor: 'border-purple-200',
        iconColor: 'text-purple-500'
      },
      'blacklist': {
        label: 'Чёрный список',
        color: 'text-red-800',
        bgColor: 'bg-red-100',
        borderColor: 'border-red-200',
        iconColor: 'text-red-500'
      }
    };

    return configs[status] || {
      label: status,
      color: 'text-gray-800',
      bgColor: 'bg-gray-100',
      borderColor: 'border-gray-200',
      iconColor: 'text-gray-500'
    };
  };

  const config = getStatusConfig(status);

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  };

  const iconSizes = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  if (variant === 'dot') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <FaCircle className={`${iconSizes[size]} ${config.iconColor}`} />
        <span className={`${config.color} font-medium`}>{config.label}</span>
      </div>
    );
  }

  if (variant === 'pill') {
    return (
      <div className={`inline-flex items-center gap-2 ${sizeClasses[size]} ${config.bgColor} ${config.borderColor} border rounded-full ${config.color} font-medium ${className}`}>
        {showIcon && <FaCircle className={`${iconSizes[size]} ${config.iconColor}`} />}
        {config.label}
      </div>
    );
  }

  // Default badge variant
  return (
    <div className={`inline-flex items-center gap-2 ${sizeClasses[size]} ${config.bgColor} ${config.borderColor} border rounded-lg ${config.color} font-medium ${className}`}>
      {showIcon && <FaCircle className={`${iconSizes[size]} ${config.iconColor}`} />}
      {config.label}
    </div>
  );
} 