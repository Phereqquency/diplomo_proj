import { useState, useEffect } from 'react';
import { api } from '../api/api';

export function AssignManagerModal({ zayavkaId, currentManagerId, onClose, onAssigned }) {
  const [managers, setManagers] = useState([]);
  const [selectedManagerId, setSelectedManagerId] = useState(currentManagerId || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadManagers();
  }, []);

  const loadManagers = async () => {
    try {
      const data = await api.getManagers();
      setManagers(data);
    } catch (err) {
      console.error('Ошибка загрузки разработчиков:', err);
    }
  };

  const handleAssign = async () => {
    if (!selectedManagerId) {
      alert('Выберите разработчика');
      return;
    }
    setLoading(true);
    try {
      await api.assignManagerToZayavka(zayavkaId, selectedManagerId);
      alert('Разработчик успешно назначен');
      if (onAssigned) onAssigned();
      onClose();
    } catch (err) {
      alert('Ошибка: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Назначить разработчика</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Выберите разработчика</label>
            <select
              value={selectedManagerId}
              onChange={e => setSelectedManagerId(parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Выберите разработчика --</option>
              {managers.map(m => (
                <option key={m.id} value={m.id}>{m.imya} ({m.email})</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleAssign}
              disabled={loading}
              className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Назначение...' : 'Назначить'}
            </button>
            <button onClick={onClose} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-200">
              Отмена
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}