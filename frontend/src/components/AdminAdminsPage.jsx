import { useState, useEffect } from 'react';
import { api, getUserRole } from '../api/api';

export function AdminAdminsPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [newRole, setNewRole] = useState('user');
  const currentUserRole = getUserRole();

  // Проверка прав доступа
  if (currentUserRole !== 'admin') {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 text-lg">Доступ запрещен</div>
        <p className="text-gray-500 mt-2">Только администраторы могут управлять ролями пользователей</p>
      </div>
    );
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await api.getAdmins();
      setUsers(data);
    } catch (err) {
      alert('Ошибка загрузки: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleUpdate = async (id, newRoleValue) => {
    try {
      await api.updateAdminRole(id, newRoleValue);
      alert('Роль обновлена');
      loadUsers();
      setEditingId(null);
    } catch (err) {
      alert('Ошибка: ' + err.message);
    }
  };

const getRoleBadgeColor = (role) => {
  switch (role) {
    case 'admin':
      return 'bg-purple-100 text-purple-700';
    case 'manager':
    case 'developer':
      return 'bg-blue-100 text-blue-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

  const getRoleName = (role) => {
  switch (role) {
    case 'admin':
      return 'Администратор';
    case 'manager':
      return 'Разработчик';  // manager отображаем как Разработчик
    case 'developer':
      return 'Разработчик';
    default:
      return 'Пользователь';
  }
};

  if (loading) return <div className="text-center py-8">Загрузка...</div>;

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-800 mb-6">Управление ролями пользователей</h1>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Имя</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Email</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Текущая роль</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600">{user.id}</td>
                  <td className="px-4 py-3 text-sm text-gray-800">{user.imya}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${getRoleBadgeColor(user.role)}`}>
                      {getRoleName(user.role)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {editingId === user.id ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={newRole}
                          onChange={e => setNewRole(e.target.value)}
                          className="border border-gray-300 rounded px-2 py-1 text-sm"
                        >
                          <option value="user">Пользователь</option>
                          <option value="manager">Разработчик</option>
                          <option value="admin">Администратор</option>
                        </select>
                        <button
                          onClick={() => handleRoleUpdate(user.id, newRole)}
                          className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded hover:bg-gray-300"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(user.id);
                          setNewRole(user.role);
                        }}
                        className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1 rounded hover:bg-indigo-100"
                      >
                        Изменить роль
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">📌 Информация о ролях:</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li><span className="font-medium">👑 Администратор:</span> Полный доступ ко всем функциям системы</li>
          <li><span className="font-medium">📋 Разработчик:</span> Может просматривать и изменять только заявки</li>
          <li><span className="font-medium">👤 Пользователь:</span> Может только создавать и просматривать свои заявки</li>
        </ul>
      </div>
    </div>
  );
}