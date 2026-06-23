import { useState, useEffect } from 'react';
import { api } from '../api/api';

const ROLE_LABELS = {
  admin: 'Администратор',
  manager: 'Разработчик',
  user: 'Пользователь'
};

const ROLE_COLORS = {
  admin: 'bg-red-100 text-red-700 border-red-200',
  manager: 'bg-blue-100 text-blue-700 border-blue-200',
  user: 'bg-gray-100 text-gray-700 border-gray-200'
};

export default function SotrudnikiPage() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [selectedRole, setSelectedRole] = useState('');

  const loadAdmins = async () => {
    setLoading(true);
    try {
      const data = await api.getAdmins();
      setAdmins(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAdmins(); }, []);

  const handleRoleChange = async (id) => {
    if (!selectedRole) return;
    try {
      await api.updateAdminRole(id, selectedRole);
      await loadAdmins();
      setEditingId(null);
      setSelectedRole('');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-800">Сотрудники и роли</h1>
        <button 
          onClick={loadAdmins}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Обновить
        </button>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 p-12">Загрузка...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Имя</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Роль</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {admins.map(admin => (
                <tr key={admin.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{admin.imya}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{admin.email}</td>
                  <td className="px-6 py-4">
                    {editingId === admin.id ? (
                      <select
                        value={selectedRole}
                        onChange={e => setSelectedRole(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">Выберите роль</option>
                        {Object.entries(ROLE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${ROLE_COLORS[admin.rolya] || ROLE_COLORS.user}`}>
                        {ROLE_LABELS[admin.rolya] || 'Пользователь'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {editingId === admin.id ? (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleRoleChange(admin.id)}
                          className="text-sm text-emerald-600 hover:text-emerald-800 font-medium"
                        >
                          Сохранить
                        </button>
                        <button
                          onClick={() => { setEditingId(null); setSelectedRole(''); }}
                          className="text-sm text-gray-500 hover:text-gray-700"
                        >
                          Отмена
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingId(admin.id); setSelectedRole(admin.rolya || 'user'); }}
                        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        Изменить роль
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {admins.length === 0 && (
            <div className="text-center text-gray-400 py-12">Нет сотрудников</div>
          )}
        </div>
      )}

      <div className="mt-6 bg-gray-50 rounded-xl p-4 border border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Доступные роли:</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            <span className="font-medium">Администратор</span> - полный доступ ко всем функциям
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
            <span className="font-medium">Разработчик</span> - управление заявками и клиентами
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-gray-500"></span>
            <span className="font-medium">Пользователь</span> - базовый доступ
          </div>
        </div>
      </div>
    </div>
  );
}