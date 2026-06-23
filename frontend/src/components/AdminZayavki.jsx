import { useState, useEffect } from 'react';
import { api, getUserRole } from '../api/api';
import { OrderDetailsModal } from './OrderDetailsModal';

export function AdminZayavki() {
  const [zayavki, setZayavki] = useState([]);
  const [filter, setFilter] = useState({ status: '', date_from: '', date_to: '', srochnost: '' });
  const [selectedZayavka, setSelectedZayavka] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const load = async () => {
    const params = {};
    if (filter.status) params.status = filter.status;
    if (filter.date_from) params.date_from = filter.date_from;
    if (filter.date_to) params.date_to = filter.date_to;
    if (filter.srochnost) params.srochnost = filter.srochnost;
    const data = await api.getZayavki(params);
    setZayavki(data);
  };

  useEffect(() => { load(); }, [filter]);

  const handleStatusUpdate = async (id, status) => {
    try {
      await api.updateStatus(id, status);
      alert('Статус обновлён');
      load();
      if (selectedZayavka?.id === id) {
        setSelectedZayavka({ ...selectedZayavka, status });
      }
    } catch (err) {
      alert('Ошибка: ' + err.message);
    }
  };

  const handlePriceUpdate = async (id, tsena) => {
    try {
      await api.updateTsena(id, tsena);
      alert('Цена обновлена');
      load();
    } catch (err) {
      alert('Ошибка: ' + err.message);
    }
  };

  const handleDelete = async (id, nomer) => {
    if (!confirm(`Вы уверены, что хотите удалить заявку №${nomer}? Это действие нельзя отменить.`)) return;
    try {
      await api.deleteZayavka(id);
      alert('Заявка удалена');
      load();
      if (selectedZayavka?.id === id) {
        setSelectedZayavka(null);
        setShowModal(false);
      }
    } catch (err) {
      alert('Ошибка: ' + err.message);
    }
  };

  const openOrderDetails = (zayavka) => {
    setSelectedZayavka(zayavka);
    setShowModal(true);
  };

  const getStatusColor = (status) => {
    const colors = {
      'Новая': 'bg-yellow-100 text-yellow-800',
      'В работе': 'bg-blue-100 text-blue-800',
      'Завершена': 'bg-green-100 text-green-800',
      'Отклонена': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getSrochnostColor = (srochnost) => {
    const colors = {
      'Срочно': 'bg-red-100 text-red-700',
      'Средняя срочность': 'bg-yellow-100 text-yellow-700',
      'Не срочно': 'bg-green-100 text-green-700'
    };
    return colors[srochnost] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold text-gray-800">Заявки</h1>
      </div>

      {/* Фильтры */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <select
            value={filter.status}
            onChange={e => setFilter({ ...filter, status: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Все статусы</option>
            <option value="Новая">Новая</option>
            <option value="В работе">В работе</option>
            <option value="Завершена">Завершена</option>
            <option value="Отклонена">Отклонена</option>
          </select>
          <select
            value={filter.srochnost}
            onChange={e => setFilter({ ...filter, srochnost: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Вся срочность</option>
            <option value="Срочно">Срочно</option>
            <option value="Средняя срочность">Средняя срочность</option>
            <option value="Не срочно">Не срочно</option>
          </select>
          <input
            type="date"
            value={filter.date_from}
            onChange={e => setFilter({ ...filter, date_from: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            placeholder="Дата от"
          />
          <input
            type="date"
            value={filter.date_to}
            onChange={e => setFilter({ ...filter, date_to: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            placeholder="Дата до"
          />
          <button
            onClick={() => setFilter({ status: '', date_from: '', date_to: '', srochnost: '' })}
            className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-200"
          >
            Сбросить
          </button>
        </div>
      </div>

      {/* Список заявок */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">№</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Клиент</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Статус</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Срочность</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Дата</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Цена(BYN)</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {zayavki.map(z => (
                <tr key={z.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{z.nomer}</td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{z.polzovatel?.imya}</div>
                    <div className="text-xs text-gray-500">{z.polzovatel?.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    {['В работе', 'Завершена', 'Отклонена'].includes(z.status) ? (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(z.status)}`}>
                        {z.status}
                      </span>
                    ) : (
                      <select
                        value={z.status}
                        onChange={(e) => handleStatusUpdate(z.id, e.target.value)}
                        className={`px-2 py-1 rounded-full text-xs font-medium border-0 ${getStatusColor(z.status)}`}
                      >
                        <option value="Новая">Новая</option>
                        <option value="В работе">В работе</option>
                        <option value="Завершена">Завершена</option>
                        <option value="Отклонена">Отклонена</option>
                      </select>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSrochnostColor(z.srochnost)}`}>
                      {z.srochnost || 'Не указана'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(z.data_podachi).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <input
                      type="number"
                      value={z.tsena || ''}
                      onChange={(e) => handlePriceUpdate(z.id, parseFloat(e.target.value))}
                      className="w-24 border border-gray-300 rounded px-2 py-1 text-sm"
                      placeholder="Цена"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openOrderDetails(z)}
                        className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700"
                      >
                        📋 Детали
                      </button>
                      <button
                        onClick={() => handleDelete(z.id, z.nomer)}
                        className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                      >
                        🗑️ Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Модальное окно с чатом и файлами */}
      {showModal && selectedZayavka && (
        <OrderDetailsModal 
          order={selectedZayavka} 
          onClose={() => {
            setShowModal(false);
            setSelectedZayavka(null);
            load();
          }} 
        />
      )}
    </div>
  );
}