import React, { useState } from 'react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: { first_name: string; last_name: string; phone: string; email: string };
  onSave: (data: { first_name: string; last_name: string; phone: string; email: string }) => void;
}

export default function ProfileModal({ isOpen, onClose, user, onSave }: ProfileModalProps) {
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(user);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    onSave(form);
    setEditMode(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold">×</button>
        <h2 className="text-2xl font-bold mb-4">Профиль</h2>
        {!editMode ? (
          <div className="space-y-2">
            <div><b>Имя:</b> {user.first_name}</div>
            <div><b>Фамилия:</b> {user.last_name}</div>
            <div><b>Телефон:</b> {user.phone}</div>
            <div><b>Email:</b> {user.email}</div>
            <button onClick={() => setEditMode(true)} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded">Редактировать</button>
          </div>
        ) : (
          <form className="space-y-3" onSubmit={e => { e.preventDefault(); handleSave(); }}>
            <input name="first_name" value={form.first_name} onChange={handleChange} className="input w-full" placeholder="Имя" />
            <input name="last_name" value={form.last_name} onChange={handleChange} className="input w-full" placeholder="Фамилия" />
            <input name="phone" value={form.phone} onChange={handleChange} className="input w-full" placeholder="Телефон" />
            <input name="email" value={form.email} onChange={handleChange} className="input w-full" placeholder="Email" />
            <div className="flex gap-2 mt-2">
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Сохранить</button>
              <button type="button" onClick={() => setEditMode(false)} className="bg-gray-200 px-4 py-2 rounded">Отмена</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
} 