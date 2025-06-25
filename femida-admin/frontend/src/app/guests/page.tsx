'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
// @ts-ignore
import { saveAs } from 'file-saver';
import { FaUser, FaEdit, FaTrash, FaFileCsv, FaPlus } from 'react-icons/fa';
import dynamic from 'next/dynamic';
import 'react-phone-input-2/lib/style.css';

type Guest = {
  id: number;
  full_name: string;
  inn: string;
  phone: string;
};

const PhoneInput: any = dynamic(() => import('react-phone-input-2').then(mod => mod.default), { ssr: false });

export default function GuestsPage() {
  const { t } = useTranslation();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fullName, setFullName] = useState('');
  const [inn, setInn] = useState('');
  const [phone, setPhone] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editGuest, setEditGuest] = useState<Guest | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    full_name: '',
    inn: '',
    phone: '',
    country: 'kg',
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const [addFieldErrors, setAddFieldErrors] = useState<{[k:string]: string}>({});

  useEffect(() => {
    setLoading(true);
    fetchGuests();
  }, [success]);

  const fetchGuests = () => {
    const token = localStorage.getItem('access');
    if (!token) {
      window.location.href = '/login';
      return;
    }
    fetch('http://127.0.0.1:8000/api/guests/', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        setGuests(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Ошибка загрузки гостей');
        setLoading(false);
      });
  };

  const handleAddChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddForm({ ...addForm, [e.target.name]: e.target.value });
  };

  const handlePhoneChange = (value: string, data: any) => {
    setAddForm(f => ({ ...f, phone: '+' + value, country: data.countryCode }));
  };

  const validateGuestForm = () => {
    const errors: {[k:string]: string} = {};
    if (!addForm.full_name || addForm.full_name.length < 5) errors.full_name = 'ФИО слишком короткое';
    if (!/^[0-9]{14}$/.test(addForm.inn)) errors.inn = 'ИНН должен содержать ровно 14 цифр';
    if (!/^\+\d{7,16}$/.test(addForm.phone.replace(/\s/g, ''))) errors.phone = 'Введите корректный номер телефона';
    return errors;
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    setAddSuccess('');
    const errors = validateGuestForm();
    setAddFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setAddLoading(true);
    try {
      const token = localStorage.getItem('access');
      const res = await fetch('http://127.0.0.1:8000/api/guests/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(addForm),
      });
      if (!res.ok) {
        setAddError('Ошибка при добавлении гостя. Проверьте корректность данных.');
      } else {
        setAddSuccess('Гость успешно добавлен');
        setShowAddModal(false);
        setAddForm({ full_name: '', inn: '', phone: '', country: 'kg' });
        setAddFieldErrors({});
        fetchGuests();
      }
    } catch {
      setAddError('Ошибка сети');
    } finally {
      setAddLoading(false);
    }
  };

  const handleEdit = (guest: Guest) => {
    setEditGuest(guest);
  };

  const handleEditSave = async () => {
    if (!editGuest) return;
    const token = localStorage.getItem('access');
    const res = await fetch(`http://127.0.0.1:8000/api/guests/${editGuest.id}/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        full_name: fullName,
        inn: inn,
        phone: phone,
      }),
    });
    if (res.ok) {
      setEditGuest(null);
      setSuccess('Гость обновлён');
      fetchGuests();
    }
  };

  const handleDelete = async (guestId: number) => {
    if (!window.confirm('Удалить гостя?')) return;
    const token = localStorage.getItem('access');
    await fetch(`http://127.0.0.1:8000/api/guests/${guestId}/`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setSuccess('Гость удалён');
    fetchGuests();
  };

  const filteredGuests = guests.filter(g =>
    (search ? g.full_name.toLowerCase().includes(search.toLowerCase()) : true)
  );

  const exportToCSV = () => {
    const header = 'ФИО,ИНН,Телефон';
    const rows = filteredGuests.map(g =>
      `${g.full_name},${g.inn},${g.phone}`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'guests.csv');
  };

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">{t('Посетители')}</h1>
        <div className="flex gap-2 items-center bg-white rounded-lg shadow px-4 py-2">
          <input
            type="text"
            placeholder="Поиск по ФИО"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input w-48"
          />
          <button onClick={exportToCSV} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow transition-all duration-200">
            <FaFileCsv /> Экспорт
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow transition-all duration-200 ml-2"
          >
            <FaPlus /> Добавить гостя
          </button>
        </div>
      </div>
      {/* Модальное окно добавления гостя */}
      {showAddModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#1a1a1a]/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-0 w-full max-w-xl relative animate-modal-in border border-gray-100">
            <div className="flex flex-col items-center pt-8 pb-2 px-8">
              <div className="-mt-12 mb-2 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-4xl shadow-lg border-4 border-white -translate-y-4">
                  <FaUser />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-6">Добавить гостя</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none"
                aria-label="Закрыть"
              >
                ×
              </button>
              <form onSubmit={handleAddSubmit} className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="font-semibold">ФИО</label>
                  <input name="full_name" value={addForm.full_name} onChange={handleAddChange} required className="input" placeholder="Ваше фамилия имя и отчество" />
                </div>
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="font-semibold">ИНН</label>
                  <input name="inn" value={addForm.inn} onChange={handleAddChange} required className="input" placeholder="ИНН 14 цифр" />
                </div>
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="font-semibold">Телефон</label>
                  <PhoneInput
                    country={'kg'}
                    value={addForm.phone.replace('+', '')}
                    onChange={handlePhoneChange}
                    inputClass="!w-full !text-base !py-2"
                    buttonClass="!bg-gray-100"
                    containerClass="!w-full"
                    placeholder="Телефон"
                    enableSearch
                  />
                </div>
                <div className="md:col-span-2 flex justify-end mt-4">
                  <button
                    type="submit"
                    disabled={addLoading}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded shadow transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <FaUser /> {addLoading ? 'Добавление...' : 'Добавить'}
                  </button>
                </div>
                {addError && <div className="text-red-500 md:col-span-2">{addError}</div>}
                {addSuccess && <div className="text-green-600 md:col-span-2">Гость успешно добавлен!</div>}
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Современный list-view гостей */}
      {loading ? (
        <div className="text-center text-gray-500">Загрузка...</div>
      ) : error ? (
        <div className="text-red-500 mb-4">{error}</div>
      ) : (
        <div className="space-y-3">
          {filteredGuests.map(guest => (
            <div
              key={guest.id}
              className="flex items-center gap-6 bg-white rounded-xl shadow px-6 py-4 hover:shadow-lg transition-all border border-gray-100"
            >
              <div className="flex items-center gap-4 min-w-[180px]">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-bold">
                  <FaUser />
                </div>
                <div>
                  <div className="font-bold text-lg">{guest.full_name}</div>
                  <div className="text-xs text-gray-400">ID: {guest.id}</div>
                </div>
              </div>
              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2">
                <div>
                  <div className="text-xs text-gray-500">ИНН</div>
                  <div className="font-semibold">{guest.inn}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Телефон</div>
                  <div className="font-semibold">{guest.phone}</div>
                </div>
              </div>
              <div className="flex gap-2 ml-auto">
                <button onClick={() => {
                  setEditGuest(guest);
                  setFullName(guest.full_name);
                  setInn(guest.inn);
                  setPhone(guest.phone);
                }} className="flex items-center gap-1 bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded shadow transition-all"><FaEdit />Редактировать</button>
                <button onClick={() => handleDelete(guest.id)} className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded shadow transition-all"><FaTrash />Удалить</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {editGuest && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-lg animate-fade-in">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><FaEdit /> Редактировать гостя</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="font-semibold">ФИО</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="input" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-semibold">ИНН</label>
                <input type="text" value={inn} onChange={e => setInn(e.target.value)} className="input" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-semibold">Телефон</label>
                <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="input" />
              </div>
            </div>
            <div className="flex gap-2 mt-6 justify-end">
              <button onClick={handleEditSave} className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow transition-all"><FaEdit />Сохранить</button>
              <button onClick={() => setEditGuest(null)} className="flex items-center gap-1 bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded shadow transition-all">Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
