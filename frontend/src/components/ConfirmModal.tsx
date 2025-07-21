'use client';
import React from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';

interface ConfirmModalProps {
  open: boolean;
  title?: string;
  description?: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmClassName?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title = 'Подтвердите действие',
  description = 'Вы уверены, что хотите продолжить?',
  confirmText = 'Удалить',
  cancelText = 'Отмена',
  confirmClassName = 'px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold shadow transition',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm relative animate-modal-in border border-gray-100 flex flex-col items-center">
        <FaExclamationTriangle className="text-red-500 text-4xl mb-3" />
        <h2 className="text-xl font-bold mb-2 text-center">{title}</h2>
        <div className="text-gray-600 text-center mb-6">{description}</div>
        <div className="flex gap-3 w-full justify-center">
          <button
            onClick={onCancel}
            className="px-5 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={confirmClassName}
          >
            {confirmText}
          </button>
        </div>
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none"
          aria-label="Закрыть"
        >
          ×
        </button>
      </div>
      <style>{`
        .animate-fade-in { animation: fadeIn 0.2s; }
        .animate-modal-in { animation: modalIn 0.25s cubic-bezier(.4,2,.6,1); }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalIn { from { transform: scale(0.95) translateY(30px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
} 