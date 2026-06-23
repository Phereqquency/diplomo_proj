import { useState, useEffect } from 'react';
import { api } from '../api/api';

export default function PolzovateliPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ imya: '', email: '', messenger: '', pozhelaniya: '' });

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getPolzovateli(search ? { search } : {});
      setList(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openEdit = (item) => {
    setEditItem(item);
    setForm({ imya: item.imya, email: item.email, messenger: item.messenger, pozhelaniya: item.pozhelaniya });
    setShowForm(true);
  };

  const openCreate = () => {
    setEditItem(null);
    setForm({ imya: '', email: '', messenger: '', pozhelaniya: '' });
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      if (editItem) {
        await api.updatePolzovatel(editItem.id, form);
      } else {
        await api.createPolzovatel(form);
      }
      setShowForm(false);
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить клиента?')) return;
    try {
      await api.deletePolzovatel(id);
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold text-gray-800">Клиенты</h1>
        <button onClick={openCreate} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">
          + Добавить клиента
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-100 flex gap-3">
          <input
            type="text"
            placeholder="Поиск по имени или email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load()}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button onClick={load} className="bg-gray-100 px-4 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-200">
            Найти
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400">Загрузка...</div>
        ) : list.length === 0 ? (
          <div className="p-12 text-center text-gray-400">Клиенты не найдены</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-600 font-medium">Имя</th>
                  <th className="px-4 py-3 text-left text-gray-600 font-medium">Email</th>
                  <th className="px-4 py-3 text-left text-gray-600 font-medium">Мессенджер</th>
                  <th className="px-4 py-3 text-left text-gray-600 font-medium">Пожелания</th>
                  <th className="px-4 py-3 text-left text-gray-600 font-medium">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {list.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{p.imya}</td>
                    <td className="px-4 py-3 text-gray-600">{p.email}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{p.messenger || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{p.pozhelaniya || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(p)} className="text-indigo-600 hover:text-indigo-800 text-xs">Изменить</button>
                        <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700 text-xs">Удалить</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">{editItem ? 'Редактировать клиента' : 'Новый клиент'}</h2>
            <div className="space-y-3">
              {['imya', 'email', 'messenger', 'pozhelaniya'].map(field => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                    {field === 'imya' ? 'Имя' : field === 'email' ? 'Email' : field === 'messenger' ? 'Мессенджер' : 'Пожелания'}
                  </label>
                  {field === 'pozhelaniya' ? (
                    <textarea
                      value={form[field]}
                      onChange={e => setForm({ ...form, [field]: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      rows={3}
                    />
                  ) : (
                    <input
                      type={field === 'email' ? 'email' : 'text'}
                      value={form[field]}
                      onChange={e => setForm({ ...form, [field]: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={handleSave} className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm hover:bg-indigo-700">
                Сохранить
              </button>
              <button onClick={() => setShowForm(false)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-200">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
