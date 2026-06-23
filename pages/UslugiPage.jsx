import { useState, useEffect } from 'react';
import { api } from '../api/api';
import { AdminUslugiParams } from './AdminUslugiParams';

export function UslugiPage() {
  const [list, setList] = useState([]);
  const [kategorii, setKategorii] = useState([]);
  const [filterKat, setFilterKat] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [showParamsModal, setShowParamsModal] = useState(false);
  const [selectedUsluga, setSelectedUsluga] = useState(null);
  const [form, setForm] = useState({ naimenovanie: '', opisanie: '', kartinka: '', kategoriya_id: '', tsena: 0 });

  const load = async () => {
    const params = filterKat ? { kategoriya_id: filterKat } : {};
    const [u, k] = await Promise.all([api.getUslugi(params), api.getKategorii()]);
    setList(u);
    setKategorii(k);
    if (!form.kategoriya_id && k.length) setForm(f => ({ ...f, kategoriya_id: k[0].id }));
  };

  useEffect(() => { load(); }, [filterKat]);

  const openEdit = (item) => {
    setEditItem(item);
    setForm({ 
      naimenovanie: item.naimenovanie, 
      opisanie: item.opisanie || '', 
      kartinka: item.kartinka || '', 
      kategoriya_id: item.kategoriya_id,
      tsena: item.tsena || 0
    });
    setShowForm(true);
  };

  const openCreate = () => {
    setEditItem(null);
    setForm({ naimenovanie: '', opisanie: '', kartinka: '', kategoriya_id: kategorii[0]?.id || '', tsena: 0 });
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      const data = { 
        ...form, 
        kategoriya_id: parseInt(form.kategoriya_id),
        tsena: parseFloat(form.tsena)
      };
      if (editItem) await api.updateUslugi(editItem.id, data);
      else await api.createUslugi(data);
      setShowForm(false);
      load();
    } catch (e) { alert(e.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить услугу?')) return;
    await api.deleteUslugi(id);
    load();
  };

  const openParams = (usluga) => {
    setSelectedUsluga(usluga);
    setShowParamsModal(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold text-gray-800">Услуги</h1>
        <button onClick={openCreate} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">
          + Добавить услугу
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-100">
          <select value={filterKat} onChange={e => setFilterKat(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">Все категории</option>
            {kategorii.map(k => <option key={k.id} value={k.id}>{k.naimenovanie}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          {list.map(u => (
            <div key={u.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
              {u.kartinka && (
                <img src={u.kartinka} alt={u.naimenovanie} className="w-full h-32 object-cover rounded-lg mb-3"
                  onError={e => e.target.style.display = 'none'} />
              )}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-medium text-gray-800">{u.naimenovanie}</h3>
                  <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{u.kategoriya}</span>
                  <p className="text-sm font-bold text-indigo-600 mt-1">{u.tsena?.toLocaleString()} BYN</p>
                  {u.opisanie && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{u.opisanie}</p>}
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => openEdit(u)} className="flex-1 text-xs bg-gray-50 text-gray-600 py-1.5 rounded hover:bg-gray-100">
                  Изменить
                </button>
                <button onClick={() => handleDelete(u.id)} className="flex-1 text-xs bg-red-50 text-red-600 py-1.5 rounded hover:bg-red-100">
                  Удалить
                </button>
                <button onClick={() => openParams(u)} className="flex-1 text-xs bg-purple-50 text-purple-600 py-1.5 rounded hover:bg-purple-100">
                  ⚙️ Параметры
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">{editItem ? 'Редактировать услугу' : 'Новая услуга'}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Наименование</label>
                <input value={form.naimenovanie} onChange={e => setForm({ ...form, naimenovanie: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Категория</label>
                <select value={form.kategoriya_id} onChange={e => setForm({ ...form, kategoriya_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {kategorii.map(k => <option key={k.id} value={k.id}>{k.naimenovanie}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Цена (BYN)</label>
                <input type="number" value={form.tsena} onChange={e => setForm({ ...form, tsena: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
                <textarea value={form.opisanie} onChange={e => setForm({ ...form, opisanie: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" rows={3} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL картинки</label>
                <input value={form.kartinka} onChange={e => setForm({ ...form, kartinka: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="https://..." />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={handleSave} className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm hover:bg-indigo-700">Сохранить</button>
              <button onClick={() => setShowForm(false)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-200">Отмена</button>
            </div>
          </div>
        </div>
      )}

      {showParamsModal && selectedUsluga && (
        <AdminUslugiParams 
          uslugaId={selectedUsluga.id}
          uslugaName={selectedUsluga.naimenovanie}
          onClose={() => {
            setShowParamsModal(false);
            setSelectedUsluga(null);
            load();
          }}
        />
      )}
    </div>
  );
}

export function KategoriiPage() {
  const [list, setList] = useState([]);
  const [name, setName] = useState('');

  const load = async () => setList(await api.getKategorii());
  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!name.trim()) return;
    await api.createKategoriya({ naimenovanie: name });
    setName('');
    load();
  };

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-800 mb-6">Категории услуг</h1>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-lg">
        <div className="flex gap-3 mb-6">
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="Название новой категории"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onKeyDown={e => e.key === 'Enter' && handleAdd()} />
          <button onClick={handleAdd} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">
            Добавить
          </button>
        </div>
        <div className="space-y-2">
          {list.map(k => (
            <div key={k.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-700">{k.naimenovanie}</span>
              <span className="text-xs text-gray-400">#{k.id}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}