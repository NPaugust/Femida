'use client';

import { FaSpinner } from 'react-icons/fa';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray' | 'white';
  text?: string;
  variant?: 'spinner' | 'dots' | 'pulse';
  className?: string;
}

export default function LoadingSpinner({ 
  size = 'md', 
  color = 'blue', 
  text, 
  variant = 'spinner',
  className = '' 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const colorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    red: 'text-red-600',
    yellow: 'text-yellow-600',
    purple: 'text-purple-600',
    gray: 'text-gray-600',
    white: 'text-white'
  };

  const renderSpinner = () => {
    switch (variant) {
      case 'dots':
        return (
          <div className={`flex space-x-1 ${sizeClasses[size]}`}>
            <div className={`w-2 h-2 bg-current rounded-full animate-bounce ${colorClasses[color]}`}></div>
            <div className={`w-2 h-2 bg-current rounded-full animate-bounce ${colorClasses[color]}`} style={{ animationDelay: '0.1s' }}></div>
            <div className={`w-2 h-2 bg-current rounded-full animate-bounce ${colorClasses[color]}`} style={{ animationDelay: '0.2s' }}></div>
          </div>
        );
      case 'pulse':
        return (
          <div className={`${sizeClasses[size]} ${colorClasses[color]} animate-pulse bg-current rounded-full`}></div>
        );
      default:
        return (
          <FaSpinner className={`${sizeClasses[size]} ${colorClasses[color]} animate-spin`} />
        );
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {renderSpinner()}
      {text && (
        <p className="text-gray-600 mt-2 text-sm font-medium">{text}</p>
      )}
    </div>
  );
}

// Компонент для загрузки страницы
export function PageLoader({ text = 'Загрузка...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center h-64">
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}

// Компонент для загрузки кнопки
export function ButtonLoader({ text = 'Загрузка...' }: { text?: string }) {
  return (
    <div className="flex items-center gap-2">
      <LoadingSpinner size="sm" />
      <span>{text}</span>
    </div>
  );
}

// Компонент для загрузки таблицы
export function TableLoader() {
  return (
    <div className="flex items-center justify-center py-12">
      <LoadingSpinner size="md" text="Загрузка данных..." />
    </div>
  );
} 