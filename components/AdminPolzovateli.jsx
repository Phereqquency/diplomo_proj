import { useState, useEffect } from 'react';
import { api } from '../api/api';

export function AdminPolzovateli() {
  const [list, setList] = useState([]);
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ imya: '', email: '', messenger: '', pozhelaniya: '' });
  const [blockReason, setBlockReason] = useState('');
  const [showBlockModal, setShowBlockModal] = useState(null);

  const load = async () => {
    const params = search ? { search } : {};
    const data = await api.getPolzovateli(params);
    setList(data);
  };

  useEffect(() => { load(); }, [search]);

  const handleDelete = async (id) => {
    if (!confirm('Удалить пользователя?')) return;
    await api.deletePolzovatel(id);
    load();
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setEditForm({
      imya: user.imya,
      email: user.email,
      messenger: user.messenger || '',
      pozhelaniya: user.pozhelaniya || ''
    });
  };

  const handleUpdate = async () => {
    try {
      await api.updatePolzovatel(editingUser.id, editForm);
      setEditingUser(null);
      load();
    } catch (err) {
      alert('Ошибка: ' + err.message);
    }
  };

  const handleBlock = async (id, reason) => {
    try {
      await api.blockUser(id, reason);
      alert('Пользователь заблокирован');
      load();
      setShowBlockModal(null);
      setBlockReason('');
    } catch (err) {
      alert('Ошибка: ' + err.message);
    }
  };

  const handleUnblock = async (id) => {
    if (!confirm('Разблокировать пользователя?')) return;
    try {
      await api.unblockUser(id);
      alert('Пользователь разблокирован');
      load();
    } catch (err) {
      alert('Ошибка: ' + err.message);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold text-gray-800">Пользователи</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-100">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по имени или email..."
            className="w-full md:w-96 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Имя</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Мессенджер</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Пожелания</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Статус</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {list.map(p => (
                <tr key={p.id} className={`hover:bg-gray-50 ${p.is_blocked ? 'bg-red-50' : ''}`}>
                  <td className="px-6 py-4 text-sm text-gray-600">{p.id}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{p.imya}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{p.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{p.messenger || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{p.pozhelaniya || '—'}</td>
                  <td className="px-6 py-4">
                    {p.is_blocked ? (
                      <span className="inline-flex px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">
                        🔒 Заблокирован
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                        ✅ Активен
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => handleEdit(p)}
                        className="text-indigo-600 hover:text-indigo-800 text-sm"
                      >
                        Редактировать
                      </button>
                      {p.is_blocked ? (
                        <button
                          onClick={() => handleUnblock(p.id)}
                          className="text-green-600 hover:text-green-800 text-sm"
                        >
                          Разблокировать
                        </button>
                      ) : (
                        <button
                          onClick={() => setShowBlockModal(p)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Заблокировать
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="text-gray-600 hover:text-gray-800 text-sm"
                      >
                        Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Модальное окно редактирования */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Редактировать пользователя</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Имя</label>
                <input
                  value={editForm.imya}
                  onChange={e => setEditForm({ ...editForm, imya: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Мессенджер</label>
                <input
                  value={editForm.messenger}
                  onChange={e => setEditForm({ ...editForm, messenger: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Telegram, WhatsApp..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Пожелания</label>
                <textarea
                  value={editForm.pozhelaniya}
                  onChange={e => setEditForm({ ...editForm, pozhelaniya: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={handleUpdate} className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm hover:bg-indigo-700">
                Сохранить
              </button>
              <button onClick={() => setEditingUser(null)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-200">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно для блокировки */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-2">Блокировка пользователя</h2>
            <p className="text-sm text-gray-600 mb-4">
              Вы уверены, что хотите заблокировать пользователя <strong>{showBlockModal.imya}</strong>?
            </p>
            <textarea
              value={blockReason}
              onChange={e => setBlockReason(e.target.value)}
              placeholder="Причина блокировки (необязательно)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4"
              rows={3}
            />
            <div className="flex gap-3">
              <button
                onClick={() => handleBlock(showBlockModal.id, blockReason)}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700"
              >
                Заблокировать
              </button>
              <button
                onClick={() => {
                  setShowBlockModal(null);
                  setBlockReason('');
                }}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}