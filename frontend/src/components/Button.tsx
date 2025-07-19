'use client';

import { ReactNode } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  onClick,
  type = 'button',
  className = ''
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 shadow-lg hover:shadow-xl',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500 shadow-lg hover:shadow-xl',
    success: 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500 shadow-lg hover:shadow-xl',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 shadow-lg hover:shadow-xl',
    warning: 'bg-yellow-600 hover:bg-yellow-700 text-white focus:ring-yellow-500 shadow-lg hover:shadow-xl',
    info: 'bg-blue-500 hover:bg-blue-600 text-white focus:ring-blue-400 shadow-lg hover:shadow-xl',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-700 focus:ring-gray-300 border border-gray-300'
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg'
  };

  const widthClass = fullWidth ? 'w-full' : '';

  const renderContent = () => {
    if (loading) {
      return (
        <>
          <LoadingSpinner size="sm" color="white" />
          <span className="ml-2">{children}</span>
        </>
      );
    }

    if (icon && iconPosition === 'left') {
      return (
        <>
          {icon}
          <span className="ml-2">{children}</span>
        </>
      );
    }

    if (icon && iconPosition === 'right') {
      return (
        <>
          <span className="mr-2">{children}</span>
          {icon}
        </>
      );
    }

    return children;
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${widthClass}
        ${className}
      `}
    >
      {renderContent()}
    </button>
  );
}

// Специализированные кнопки
export function PrimaryButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button {...props} variant="primary" />;
}

export function SecondaryButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button {...props} variant="secondary" />;
}

export function SuccessButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button {...props} variant="success" />;
}

export function DangerButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button {...props} variant="danger" />;
}

export function WarningButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button {...props} variant="warning" />;
}

export function InfoButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button {...props} variant="info" />;
}

export function GhostButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button {...props} variant="ghost" />;
} 