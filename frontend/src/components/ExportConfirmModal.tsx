import React from 'react';
import { FaFileCsv, FaDownload, FaTimes } from 'react-icons/fa';

interface ExportConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  fileName: string;
  loading?: boolean;
}

export default function ExportConfirmModal({ 
  open, 
  onClose, 
  onConfirm, 
  title, 
  description, 
  fileName, 
  loading = false 
}: ExportConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative animate-scale-in border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <FaFileCsv className="text-blue-600 text-xl" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
        </div>
        
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none transition-colors"
        >
          <FaTimes />
        </button>

        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <FaDownload className="text-gray-500" />
            <div>
              <p className="text-sm font-bold text-gray-700">Файл будет сохранен как:</p>
              <p className="text-sm text-gray-600 font-mono">{fileName}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold transition-colors"
            disabled={loading}
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Скачивание...
              </>
            ) : (
              <>
                <FaDownload />
                Скачать
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
} 