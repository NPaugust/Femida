"use client";
import { useEffect, useState } from "react";
import ConfirmModal from "../../components/ConfirmModal";
import { API_URL } from "../../shared/api";

const TABS = [
  { key: "guests", label: "Гости" },
  { key: "bookings", label: "Бронирования" },
  { key: "rooms", label: "Номера" },
];

export default function TrashPage() {
  const [tab, setTab] = useState("guests");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [confirm, setConfirm] = useState<{ type: string; id: number; action: "restore" | "delete" } | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setToken(localStorage.getItem("access"));
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError("");
    fetch(`${API_URL}/api/trash/${tab}/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((res) => setData(res))
      .catch(() => setError("Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, [tab, token, success]);

  const handleAction = (id: number, action: "restore" | "delete") => {
    setConfirm({ type: tab, id, action });
  };

  const confirmAction = async () => {
    if (!confirm || !token) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(
        `${API_URL}/api/trash/${confirm.action}/${confirm.type}/${confirm.id}/`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        setSuccess(
          confirm.action === "restore"
            ? "Успешно восстановлено"
            : "Удалено навсегда"
        );
        setConfirm(null);
      } else {
        setError("Ошибка операции");
      }
    } catch {
      setError("Ошибка сети");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Корзина</h1>
      <div className="flex gap-4 mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              tab === t.key
                ? "bg-blue-600 text-white shadow"
                : "bg-gray-100 text-gray-700 hover:bg-blue-100"
            }`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="text-gray-500">Загрузка...</div>
      ) : error ? (
        <div className="text-red-500 mb-4">{error}</div>
      ) : data.length === 0 ? (
        <div className="text-gray-400">Нет удалённых данных</div>
      ) : (
        <div className="overflow-x-auto rounded-lg shadow max-w-full">
          <table className="w-full bg-white rounded-lg">
            <thead>
              <tr className="bg-gray-50 text-gray-700">
                {tab === "guests" && (
                  <>
                    <th className="p-2">ФИО</th>
                    <th className="p-2">ИНН</th>
                    <th className="p-2">Телефон</th>
                    <th className="p-2">Статус</th>
                  </>
                )}
                {tab === "bookings" && (
                  <>
                    <th className="p-2">Гость</th>
                    <th className="p-2">Комната</th>
                    <th className="p-2">Заезд</th>
                    <th className="p-2">Выезд</th>
                  </>
                )}
                {tab === "rooms" && (
                  <>
                    <th className="p-2">Номер</th>
                    <th className="p-2">Корпус</th>
                    <th className="p-2">Вместимость</th>
                    <th className="p-2">Тип</th>
                  </>
                )}
                <th className="p-2">Действия</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.id} className="hover:bg-blue-50 transition-all">
                  {tab === "guests" && (
                    <>
                      <td className="p-2">{item.full_name}</td>
                      <td className="p-2">{item.inn}</td>
                      <td className="p-2">{item.phone}</td>
                      <td className="p-2">{item.status}</td>
                    </>
                  )}
                  {tab === "bookings" && (
                    <>
                      <td className="p-2">{item.guest?.full_name}</td>
                      <td className="p-2">{item.room?.number}</td>
                      <td className="p-2">{item.check_in || item.date_from}</td>
                      <td className="p-2">{item.check_out || item.date_to}</td>
                    </>
                  )}
                  {tab === "rooms" && (
                    <>
                      <td className="p-2">{item.number}</td>
                      <td className="p-2">{item.building?.name || item.building}</td>
                      <td className="p-2">{item.capacity}</td>
                      <td className="p-2">{item.room_type}</td>
                    </>
                  )}
                  <td className="p-2 flex gap-2">
                    <button
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded shadow"
                      onClick={() => handleAction(item.id, "restore")}
                    >
                      Восстановить
                    </button>
                    <button
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded shadow"
                      onClick={() => handleAction(item.id, "delete")}
                    >
                      Удалить навсегда
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmModal
        open={!!confirm}
        title={confirm?.action === "restore" ? "Восстановить?" : "Удалить навсегда?"}
        description={
          confirm?.action === "restore"
            ? "Вы действительно хотите восстановить этот объект?"
            : "Это действие необратимо. Удалить навсегда?"
        }
        confirmText={confirm?.action === "restore" ? "Восстановить" : "Удалить"}
        cancelText="Отмена"
        onConfirm={confirmAction}
        onCancel={() => setConfirm(null)}
      />
      {success && (
        <div className="fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg bg-green-500 text-white animate-fade-in">
          {success}
        </div>
      )}
      {error && (
        <div className="fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg bg-red-500 text-white animate-fade-in">
          {error}
        </div>
      )}
    </div>
  );
} 