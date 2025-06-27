'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
// @ts-ignore
import { saveAs } from 'file-saver';
import { FaUser, FaEdit, FaTrash, FaFileCsv, FaPlus, FaMapMarkerAlt, FaCalendarAlt, FaMoneyBillWave, FaChartBar, FaCheckCircle, FaTimesCircle, FaComment } from 'react-icons/fa';
import dynamic from 'next/dynamic';
import 'react-phone-input-2/lib/style.css';
import { API_URL } from '../../shared/api';
import { useSearchParams } from 'next/navigation';
import ConfirmModal from '../../components/ConfirmModal';
import { useNotifications } from '../../components/NotificationSystem';

type Guest = {
  id: number;
  full_name: string;
  inn: string;
  phone: string;
  notes: string;
  registration_date: string;
  total_spent: number;
  visits_count: number;
  status: string;
};

const PhoneInput: any = dynamic(() => import('react-phone-input-2').then(mod => mod.default), { ssr: false });

const GUEST_STATUSES = [
  { value: 'active', label: 'Активный', color: 'bg-green-200 text-green-800' },
  { value: 'inactive', label: 'Неактивный', color: 'bg-gray-200 text-gray-800' },
  { value: 'vip', label: 'ВИП', color: 'bg-purple-200 text-purple-800' },
  { value: 'blacklist', label: 'Чёрный список', color: 'bg-red-200 text-red-800' },
];

export default function GuestsPage() {
  const { t } = useTranslation();
  const { openMessageModal } = useNotifications();
  const [guests, setGuests] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
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
    notes: '',
    status: 'active',
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const [addFieldErrors, setAddFieldErrors] = useState<{[k:string]: string}>({});
  const [currentPage, setCurrentPage] = useState(1);
  const guestsPerPage = 10;
  const searchParams = useSearchParams();
  const [sortState, setSortState] = useState<{ field: string | null; order: 'asc' | 'desc' | null }>({ field: null, order: null });
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [selectedDeleteId, setSelectedDeleteId] = useState<number | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [tokenLoaded, setTokenLoaded] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterVisitsFrom, setFilterVisitsFrom] = useState('');
  const [filterVisitsTo, setFilterVisitsTo] = useState('');
  const [filterSpentFrom, setFilterSpentFrom] = useState('');
  const [filterSpentTo, setFilterSpentTo] = useState('');
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [showGuestPanel, setShowGuestPanel] = useState(false);
  const [selectedGuestIds, setSelectedGuestIds] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [editingCell, setEditingCell] = useState<{ guestId: number; field: string } | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [editingError, setEditingError] = useState('');
  const [searchField, setSearchField] = useState('full_name');
  const [savedFilters, setSavedFilters] = useState<{[key: string]: any}>({});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setToken(localStorage.getItem('access'));
      setTokenLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!tokenLoaded) return; // ждём пока токен загрузится
    if (!token) {
      window.location.href = '/login';
      return;
    }
    setLoading(true);
    fetchGuests();
    if (searchParams.get('add') === '1') {
      setShowAddModal(true);
    } else {
      setShowAddModal(false);
    }
  }, [success, searchParams, tokenLoaded, token]);

  const fetchGuests = () => {
    if (!token) {
      window.location.href = '/login';
      return;
    }
    Promise.all([
      fetch(`${API_URL}/api/guests/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }),
      fetch(`${API_URL}/api/bookings/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }),
    ])
      .then(([guestsResponse, bookingsResponse]) => {
        if (guestsResponse && bookingsResponse) {
          guestsResponse.json().then(guestsData => {
            bookingsResponse.json().then(bookingsData => {
              setGuests(guestsData);
              setBookings(bookingsData);
              setLoading(false);
            });
          });
        }
      })
      .catch((error) => {
        setError('Ошибка загрузки гостей');
        setLoading(false);
      });
  };

  const handleAddChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
      const res = await fetch(`${API_URL}/api/guests/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(addForm),
      });
      
      if (!res) return; // Ошибка аутентификации уже обработана
      
      if (!res.ok) {
        const errorMessage = 'Ошибка при добавлении гостя. Проверьте корректность данных.';
        setAddError(errorMessage);
        showToast('error', errorMessage);
      } else {
        setAddSuccess('Гость успешно добавлен');
        showToast('success', 'Гость успешно добавлен');
        setShowAddModal(false);
        setAddForm({ full_name: '', inn: '', phone: '', country: 'kg', notes: '', status: 'active' });
        setAddFieldErrors({});
        fetchGuests();
      }
    } catch {
      const errorMessage = 'Ошибка сети';
      setAddError(errorMessage);
      showToast('error', errorMessage);
    } finally {
      setAddLoading(false);
    }
  };

  const handleEdit = (guest: Guest) => {
    setEditGuest(guest);
    setFullName(guest.full_name);
    setInn(guest.inn);
    setPhone(guest.phone);
  };

  const handleEditSave = async () => {
    if (!editGuest) return;
    const res = await fetch(`${API_URL}/api/guests/${editGuest.id}/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        full_name: fullName,
        inn: inn,
        phone: phone,
      }),
    });
    
    if (!res) return; // Ошибка аутентификации уже обработана
    
    if (res.ok) {
      setEditGuest(null);
      setSuccess('Гость обновлён');
      showToast('success', 'Гость успешно обновлён');
      fetchGuests();
    } else {
      showToast('error', 'Ошибка при обновлении гостя');
    }
  };

  const handleDelete = async (guestId: number) => {
    setSelectedDeleteId(guestId);
    setShowConfirmDelete(true);
  };

  const confirmDelete = async () => {
    if (!selectedDeleteId) return;
    const res = await fetch(`${API_URL}/api/guests/${selectedDeleteId}/`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!res) return; // Ошибка аутентификации уже обработана
    
    if (res.ok) {
      setSuccess('Гость удалён');
      showToast('success', 'Гость успешно удалён');
      fetchGuests();
    } else {
      showToast('error', 'Ошибка при удалении гостя');
    }
    setShowConfirmDelete(false);
    setSelectedDeleteId(null);
  };

  const guestsArray = Array.isArray(guests) ? guests : [];
  const filteredGuests = guestsArray.filter(g => {
    const searchMatch = !search || 
      (searchField === 'full_name' && g.full_name.toLowerCase().includes(search.toLowerCase())) ||
      (searchField === 'phone' && g.phone.includes(search)) ||
      (searchField === 'inn' && g.inn.includes(search));
    
    const statusMatch = !filterStatus || g.status === filterStatus;
    const visitsFromMatch = !filterVisitsFrom || (g.visits_count || 0) >= Number(filterVisitsFrom);
    const visitsToMatch = !filterVisitsTo || (g.visits_count || 0) <= Number(filterVisitsTo);
    const spentFromMatch = !filterSpentFrom || (g.total_spent || 0) >= Number(filterSpentFrom);
    const spentToMatch = !filterSpentTo || (g.total_spent || 0) <= Number(filterSpentTo);
    
    return searchMatch && statusMatch && visitsFromMatch && visitsToMatch && spentFromMatch && spentToMatch;
  });

  const handleSort = (field: string) => {
    setSortState(prev => {
      if (prev.field !== field) return { field, order: 'asc' };
      if (prev.order === 'asc') return { field, order: 'desc' };
      if (prev.order === 'desc') return { field: null, order: null };
      return { field, order: 'asc' };
    });
  };

  const sortedGuests = [...filteredGuests];
  if (sortState.field && sortState.order) {
    sortedGuests.sort((a, b) => {
      let aValue = a[sortState.field!];
      let bValue = b[sortState.field!];
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();
      if (aValue < bValue) return sortState.order === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortState.order === 'asc' ? 1 : -1;
      return 0;
    });
  }

  // Пагинация
  const totalPages = Math.ceil(filteredGuests.length / guestsPerPage);
  const paginatedGuests = filteredGuests.slice(
    (currentPage - 1) * guestsPerPage,
    currentPage * guestsPerPage
  );

  const exportToCSV = () => {
    const header = 'ФИО,ИНН,Телефон,Статус,Посещений,Потрачено (сом),Дата регистрации,Примечания';
    const rows = filteredGuests.map(g => {
      const status = GUEST_STATUSES.find(s => s.value === g.status)?.label || g.status;
      return `${g.full_name},${g.inn},${g.phone},${status},${g.visits_count || 0},${g.total_spent || 0},${g.registration_date || ''},"${g.notes || ''}"`;
    });
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'guests.csv');
  };

  const getBookingCount = (guestId: number) => {
    return bookings.filter(b => b.guest?.id === guestId).length;
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const getGuestStatistics = () => {
    const total = filteredGuests.length;
    const active = filteredGuests.filter(g => g.status === 'active').length;
    const vip = filteredGuests.filter(g => g.status === 'vip').length;
    const totalSpent = filteredGuests.reduce((sum, g) => sum + (g.total_spent || 0), 0);
    const totalVisits = filteredGuests.reduce((sum, g) => sum + (g.visits_count || 0), 0);
    
    return {
      total,
      active,
      vip,
      totalSpent,
      totalVisits,
      activePercentage: total > 0 ? Math.round((active / total) * 100) : 0,
      averageSpent: total > 0 ? Math.round(totalSpent / total) : 0,
      averageVisits: total > 0 ? Math.round(totalVisits / total) : 0,
    };
  };

  const openGuestPanel = (guest: Guest) => {
    setSelectedGuest(guest);
    setShowGuestPanel(true);
  };
  const closeGuestPanel = () => {
    setShowGuestPanel(false);
    setSelectedGuest(null);
  };

  const handleSelectGuest = (id: number) => {
    setSelectedGuestIds(prev => prev.includes(id) ? prev.filter(gid => gid !== id) : [...prev, id]);
  };
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedGuestIds([]);
      setSelectAll(false);
    } else {
      setSelectedGuestIds(filteredGuests.map(g => g.id));
      setSelectAll(true);
    }
  };

  const handleMassDelete = async () => {
    if (!window.confirm(`Удалить ${selectedGuestIds.length} гостей? Это действие необратимо!`)) return;
    try {
      for (const id of selectedGuestIds) {
        await fetch(`${API_URL}/api/guests/${id}/`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        });
      }
      showToast('success', 'Гости удалены');
      setSelectedGuestIds([]);
      setSelectAll(false);
      fetchGuests();
    } catch {
      showToast('error', 'Ошибка при удалении гостей');
    }
  };

  const handleMassStatusChange = async (status: string) => {
    try {
      for (const id of selectedGuestIds) {
        await fetch(`${API_URL}/api/guests/${id}/`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        });
      }
      showToast('success', 'Статус обновлён');
      setSelectedGuestIds([]);
      setSelectAll(false);
      fetchGuests();
    } catch {
      showToast('error', 'Ошибка при обновлении статуса');
    }
  };

  const handleMassExport = () => {
    const header = 'ФИО,ИНН,Телефон,Статус,Посещений,Потрачено (сом),Дата регистрации,Примечания';
    const rows = guestsArray.filter(g => selectedGuestIds.includes(g.id)).map(g => {
      const status = GUEST_STATUSES.find(s => s.value === g.status)?.label || g.status;
      return `${g.full_name},${g.inn},${g.phone},${status},${g.visits_count || 0},${g.total_spent || 0},${g.registration_date || ''},"${g.notes || ''}"`;
    });
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'selected_guests.csv');
  };

  const startInlineEdit = (guestId: number, field: string, currentValue: string) => {
    setEditingCell({ guestId, field });
    setEditingValue(currentValue);
    setEditingError('');
  };

  const saveInlineEdit = async () => {
    if (!editingCell) return;
    
    // Валидация
    const error = validateField(editingCell.field, editingValue);
    if (error) {
      setEditingError(error);
      return;
    }
    
    try {
      const token = localStorage.getItem('access');
      const response = await fetch(`${API_URL}/api/guests/${editingCell.guestId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ [editingCell.field]: editingValue }),
      });
      
      if (response.ok) {
        showToast('success', 'Поле обновлено');
        fetchGuests();
        setEditingCell(null);
        setEditingValue('');
      } else {
        throw new Error('Ошибка обновления');
      }
    } catch {
      showToast('error', 'Ошибка при обновлении поля');
    }
  };

  const cancelInlineEdit = () => {
    setEditingCell(null);
    setEditingValue('');
    setEditingError('');
  };

  const validateField = (field: string, value: string): string => {
    switch (field) {
      case 'full_name':
        return value.length < 2 ? 'ФИО должно содержать минимум 2 символа' : '';
      case 'inn':
        return value && !/^[0-9]{14}$/.test(value) ? 'ИНН должен содержать ровно 14 цифр' : '';
      case 'phone':
        return value && !/^\+\d{7,16}$/.test(value.replace(/\s/g, '')) ? 'Введите корректный номер телефона' : '';
      default:
        return '';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('success', 'Скопировано в буфер обмена');
  };

  const printGuests = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const printContent = `
        <html>
          <head>
            <title>Список гостей</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
              .header { text-align: center; margin-bottom: 20px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Список гостей пансионата Фемида</h1>
              <p>Дата: ${new Date().toLocaleDateString()}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>ФИО</th>
                  <th>ИНН</th>
                  <th>Телефон</th>
                  <th>Статус</th>
                  <th>Посещений</th>
                  <th>Потрачено</th>
                </tr>
              </thead>
              <tbody>
                ${filteredGuests.map(guest => `
                  <tr>
                    <td>${guest.full_name}</td>
                    <td>${guest.inn}</td>
                    <td>${guest.phone}</td>
                    <td>${GUEST_STATUSES.find(s => s.value === guest.status)?.label || guest.status}</td>
                    <td>${guest.visits_count || 0}</td>
                    <td>${guest.total_spent ? `${guest.total_spent.toLocaleString()} сом` : '0 сом'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </body>
        </html>
      `;
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const exportToExcel = () => {
    const header = 'ФИО,ИНН,Телефон,Статус,Посещений,Потрачено (сом),Дата регистрации,Примечания';
    const rows = filteredGuests.map(g => {
      const status = GUEST_STATUSES.find(s => s.value === g.status)?.label || g.status;
      return `"${g.full_name}","${g.inn}","${g.phone}","${status}",${g.visits_count || 0},${g.total_spent || 0},"${g.registration_date || ''}","${g.notes || ''}"`;
    });
    const csv = [header, ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'guests.xlsx');
    showToast('success', 'Экспорт в Excel выполнен');
  };

  const saveFilters = () => {
    const filters = {
      search,
      searchField,
      filterStatus,
      filterVisitsFrom,
      filterVisitsTo,
      filterSpentFrom,
      filterSpentTo,
    };
    setSavedFilters(filters);
    showToast('success', 'Фильтры сохранены');
  };

  const loadFilters = () => {
    if (Object.keys(savedFilters).length > 0) {
      setSearch(savedFilters.search || '');
      setSearchField(savedFilters.searchField || 'full_name');
      setFilterStatus(savedFilters.filterStatus || '');
      setFilterVisitsFrom(savedFilters.filterVisitsFrom || '');
      setFilterVisitsTo(savedFilters.filterVisitsTo || '');
      setFilterSpentFrom(savedFilters.filterSpentFrom || '');
      setFilterSpentTo(savedFilters.filterSpentTo || '');
      showToast('success', 'Фильтры загружены');
    }
  };

  const clearFilters = () => {
    setSearch('');
    setSearchField('full_name');
    setFilterStatus('');
    setFilterVisitsFrom('');
    setFilterVisitsTo('');
    setFilterSpentFrom('');
    setFilterSpentTo('');
    showToast('success', 'Фильтры очищены');
  };

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">{t('Список гостей')}</h1>
        <div className="flex gap-2 flex-wrap items-center bg-white rounded-lg shadow px-4 py-2">
          <select value={searchField} onChange={e => setSearchField(e.target.value)} className="input w-32">
            <option value="full_name">ФИО</option>
            <option value="phone">Телефон</option>
            <option value="inn">ИНН</option>
          </select>
          <input
            type="text"
            placeholder={`Поиск по ${searchField === 'full_name' ? 'ФИО' : searchField === 'phone' ? 'телефону' : 'ИНН'}`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input w-48"
          />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input w-40">
            <option value="">Все статусы</option>
            {GUEST_STATUSES.map(status => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Посещений от"
            value={filterVisitsFrom}
            onChange={e => setFilterVisitsFrom(e.target.value)}
            className="input w-24"
          />
          <input
            type="number"
            placeholder="до"
            value={filterVisitsTo}
            onChange={e => setFilterVisitsTo(e.target.value)}
            className="input w-24"
          />
          <input
            type="number"
            placeholder="Потрачено от"
            value={filterSpentFrom}
            onChange={e => setFilterSpentFrom(e.target.value)}
            className="input w-24"
          />
          <input
            type="number"
            placeholder="до"
            value={filterSpentTo}
            onChange={e => setFilterSpentTo(e.target.value)}
            className="input w-24"
          />
          <button onClick={clearFilters} className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded shadow transition-all duration-200">
            Сбросить
          </button>
          <button onClick={exportToCSV} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow transition-all duration-200">
            <FaFileCsv /> Экспорт в CSV
          </button>
          <button onClick={exportToExcel} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow transition-all duration-200">
            <FaFileCsv /> Excel
          </button>
          <button onClick={printGuests} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded shadow transition-all duration-200">
            <FaFileCsv /> Печать
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow transition-all duration-200 ml-2"
          >
            <FaPlus /> Добавить гостя
          </button>
        </div>
      </div>
      {/* Статистика гостей */}
      {(() => {
        const stats = getGuestStatistics();
        return (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2">
                <FaUser className="text-blue-600" />
                <span className="font-semibold">Всего гостей</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2">
                <FaCheckCircle className="text-green-600" />
                <span className="font-semibold">Активных</span>
              </div>
              <div className="text-2xl font-bold text-green-600">{stats.active} ({stats.activePercentage}%)</div>
            </div>
          </div>
        );
      })()}
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
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="font-semibold">Статус</label>
                  <select name="status" value={addForm.status} onChange={handleAddChange} className="input">
                    {GUEST_STATUSES.map(status => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="font-semibold">Примечания</label>
                  <textarea name="notes" value={addForm.notes} onChange={handleAddChange} className="input" rows={3} placeholder="Дополнительная информация о госте..." />
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
          <div className="overflow-x-auto rounded-lg shadow max-w-full">
            <table className="w-full bg-white rounded-lg">
              <thead>
                <tr className="bg-gray-50 text-gray-700">
                  <th className="p-3 text-left">
                    <input type="checkbox" checked={selectAll} onChange={handleSelectAll} />
                  </th>
                  <th className="p-2 text-left" onClick={() => handleSort('full_name')}>ФИО {sortState.field === 'full_name' && (sortState.order === 'asc' ? '▲' : sortState.order === 'desc' ? '▼' : '')}</th>
                  <th className="p-2 text-left" onClick={() => handleSort('inn')}>ИНН {sortState.field === 'inn' && (sortState.order === 'asc' ? '▲' : sortState.order === 'desc' ? '▼' : '')}</th>
                  <th className="p-2 text-left" onClick={() => handleSort('phone')}>Телефон {sortState.field === 'phone' && (sortState.order === 'asc' ? '▲' : sortState.order === 'desc' ? '▼' : '')}</th>
                  <th className="p-2 text-left" onClick={() => handleSort('status')}>Статус {sortState.field === 'status' && (sortState.order === 'asc' ? '▲' : sortState.order === 'desc' ? '▼' : '')}</th>
                  <th className="p-2 text-left" onClick={() => handleSort('visits_count')}>Посещения {sortState.field === 'visits_count' && (sortState.order === 'asc' ? '▲' : sortState.order === 'desc' ? '▼' : '')}</th>
                  <th className="p-2 text-left" onClick={() => handleSort('total_spent')}>Потрачено {sortState.field === 'total_spent' && (sortState.order === 'asc' ? '▲' : sortState.order === 'desc' ? '▼' : '')}</th>
                  <th className="p-2 text-left">Бронирования</th>
                  <th className="p-2 text-left">Действия</th>
                </tr>
              </thead>
              <tbody>
                {sortedGuests.map(guest => (
                  <tr key={guest.id} className="hover:bg-blue-50 transition-all cursor-pointer" onClick={() => openGuestPanel(guest)}>
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedGuestIds.includes(guest.id)}
                        onChange={e => { e.stopPropagation(); handleSelectGuest(guest.id); }}
                        onClick={e => e.stopPropagation()}
                      />
                    </td>
                    <td className="p-2 truncate max-w-[120px]" title={guest.full_name}>{guest.full_name}</td>
                    <td className="p-2">{guest.inn}</td>
                    <td className="p-2">{guest.phone}</td>
                    <td className="p-2">
                      {(() => {
                        const status = GUEST_STATUSES.find(s => s.value === guest.status);
                        return (
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${status?.color || 'bg-gray-200 text-gray-800'}`}>
                            {status?.label || guest.status}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="p-2 text-center">{guest.visits_count || 0}</td>
                    <td className="p-2 font-semibold text-green-600">{guest.total_spent ? `${guest.total_spent.toLocaleString()} сом` : '0 сом'}</td>
                    <td className="p-2">
                      <span className="inline-block px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                        {getBookingCount(guest.id)}
                      </span>
                    </td>
                    <td className="p-2 flex gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); copyToClipboard(guest.full_name); }} 
                        className="text-blue-600 hover:text-blue-800" 
                        title="Копировать ФИО"
                      >
                        <FaFileCsv />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); copyToClipboard(guest.phone); }} 
                        className="text-green-600 hover:text-green-800" 
                        title="Копировать телефон"
                      >
                        <FaFileCsv />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleEdit(guest); }} className="text-yellow-600 hover:text-yellow-800" title="Редактировать"><FaEdit /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(guest.id); }} className="text-red-600 hover:text-red-800" title="Удалить"><FaTrash /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Пагинация */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-4">
              <button
                className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Назад
              </button>
              <span className="text-sm text-gray-500">Страница {currentPage} из {totalPages}</span>
              <button
                className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Вперёд
              </button>
            </div>
          )}
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
      <ConfirmModal
        open={showConfirmDelete}
        title="Удалить гостя?"
        description="Вы действительно хотите удалить этого гостя? Это действие необратимо."
        confirmText="Удалить"
        cancelText="Отмена"
        onConfirm={confirmDelete}
        onCancel={() => { setShowConfirmDelete(false); setSelectedDeleteId(null); }}
      />
      {/* Toast уведомления */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${
          toast.type === 'success' 
            ? 'bg-green-500 text-white' 
            : 'bg-red-500 text-white'
        }`}>
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? <FaCheckCircle /> : <FaTimesCircle />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
      {showGuestPanel && selectedGuest && (
        <div className="fixed inset-0 z-50 flex">
          {/* Тёмный фон */}
          <div className="fixed inset-0 bg-black/30" onClick={closeGuestPanel}></div>
          {/* Sidepanel */}
          <div className="relative ml-auto w-full max-w-md bg-white h-full shadow-2xl animate-slide-in-right flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-2">
                <FaUser className="text-2xl text-blue-600" />
                <span className="text-xl font-bold">{selectedGuest.full_name}</span>
              </div>
              <button onClick={closeGuestPanel} className="text-2xl text-gray-400 hover:text-gray-700">×</button>
            </div>
            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
              <div className="flex flex-col gap-2">
                <span className="text-gray-500 text-xs">Телефон:</span>
                <span className="font-semibold">{selectedGuest.phone}</span>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-gray-500 text-xs">ИНН:</span>
                <span>{selectedGuest.inn || '-'}</span>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-gray-500 text-xs">Статус:</span>
                <span>{GUEST_STATUSES.find(s => s.value === selectedGuest.status)?.label || selectedGuest.status}</span>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-gray-500 text-xs">Дата регистрации:</span>
                <span>{selectedGuest.registration_date || '-'}</span>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-gray-500 text-xs">Посещений:</span>
                <span>{selectedGuest.visits_count || 0}</span>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-gray-500 text-xs">Потрачено:</span>
                <span className="font-semibold text-green-600">{selectedGuest.total_spent ? `${selectedGuest.total_spent.toLocaleString()} сом` : '0 сом'}</span>
              </div>
              {selectedGuest.notes && (
                <div className="flex flex-col gap-2">
                  <span className="text-gray-500 text-xs">Примечания:</span>
                  <span>{selectedGuest.notes}</span>
                </div>
              )}
              {/* Кнопка отправки сообщения */}
              <div className="mt-6 pt-4 border-t">
                <button
                  onClick={() => openMessageModal(selectedGuest)}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow transition-all"
                >
                  <FaComment /> Отправить сообщение
                </button>
              </div>
              {/* История бронирований */}
              <div className="mt-6">
                <span className="font-semibold text-gray-700">История бронирований:</span>
                <ul className="mt-2 space-y-2">
                  {bookings.filter(b => b.guest?.id === selectedGuest.id).length === 0 && (
                    <li className="text-gray-400 text-sm">Нет бронирований</li>
                  )}
                  {bookings.filter(b => b.guest?.id === selectedGuest.id).map(b => (
                    <li key={b.id} className="p-2 bg-gray-50 rounded shadow flex flex-col gap-1">
                      <span className="text-sm font-semibold">{b.room?.number} ({b.room?.building?.name})</span>
                      <span className="text-xs text-gray-500">{b.check_in} — {b.check_out}</span>
                      <span className="text-xs">Статус: {b.status}</span>
                      <span className="text-xs">Оплата: {b.payment_status} ({b.payment_amount} сом)</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
      {selectedGuestIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex gap-4 bg-white shadow-xl rounded-full px-6 py-3 border items-center animate-fade-in">
          <span className="font-semibold text-blue-700">Выбрано: {selectedGuestIds.length}</span>
          <button
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded shadow flex items-center gap-2"
            onClick={() => handleMassDelete()}
          >
            <FaTrash /> Удалить
          </button>
          <select
            className="input"
            onChange={e => handleMassStatusChange(e.target.value)}
            defaultValue=""
          >
            <option value="" disabled>Сменить статус</option>
            {GUEST_STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <button
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow flex items-center gap-2"
            onClick={handleMassExport}
          >
            <FaFileCsv /> Экспорт
          </button>
          <button
            className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded shadow flex items-center gap-2"
            onClick={() => { setSelectedGuestIds([]); setSelectAll(false); }}
          >
            Отмена
          </button>
        </div>
      )}
    </div>
  );
}