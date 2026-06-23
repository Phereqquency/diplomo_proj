import { useState, useEffect } from 'react';
import { api } from '../api/api';

const STATUS = {
  'Новая':        { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   dot: 'bg-blue-500' },
  'В обработке':  { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  dot: 'bg-amber-500' },
  'Завершена':    { bg: 'bg-emerald-50',text: 'text-emerald-700',border: 'border-emerald-200',dot: 'bg-emerald-500' },
  'Отклонена':    { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    dot: 'bg-red-500' },
};

const STATUSES = ['Новая', 'В обработке', 'Завершена', 'Отклонена'];

function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS['Новая'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${s.bg} ${s.text} ${s.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
}

function TsenaEditor({ zayavka, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(zayavka.tsena || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateTsena(zayavka.id, parseFloat(value));
      onUpdate(parseFloat(value));
      setEditing(false);
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  if (!editing) return (
    <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
      <span className={`font-semibold text-sm ${zayavka.tsena ? 'text-gray-900' : 'text-gray-400'}`}>
        {zayavka.tsena ? `$${Number(zayavka.tsena).toLocaleString('en')}` : 'Не установлена'}
      </span>
      <button
        onClick={() => { setValue(zayavka.tsena || ''); setEditing(true); }}
        className="text-xs text-emerald-600 hover:text-emerald-800 font-medium"
      >
        {zayavka.tsena ? 'Изменить' : '+ Установить'}
      </button>
    </div>
  );

  return (
    <div className="flex gap-2">
      <input type="number" value={value} onChange={e => setValue(e.target.value)}
        className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
        placeholder="Сумма в долларах" autoFocus />
      <button onClick={handleSave} disabled={saving}
        className="bg-emerald-500 text-white px-3 py-2 rounded-xl text-xs hover:bg-emerald-600 disabled:opacity-50 font-medium">✓</button>
      <button onClick={() => setEditing(false)}
        className="bg-gray-100 text-gray-500 px-3 py-2 rounded-xl text-xs hover:bg-gray-200">✕</button>
    </div>
  );
}

export default function ZayavkiPage() {
  const [zayavki, setZayavki] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({ status: '', date_from: '', date_to: '' });
  const [updating, setUpdating] = useState(false);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      // Используем getMyZayavki для пользовательского доступа
      setZayavki(await api.getMyZayavki(params));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filters]);

  const handleStatusChange = async (id, status) => {
    setUpdating(true);
    try {
      await api.updateStatus(id, status);
      await load();
      if (selected?.id === id) setSelected(await api.getZayavka(id));
    } catch (e) { alert(e.message); }
    finally { setUpdating(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить заявку?')) return;
    await api.deleteZayavka(id);
    setSelected(null);
    load();
  };

  const filtered = zayavki.filter(z =>
    !search ||
    z.nomer.includes(search) ||
    z.polzovatel?.imya?.toLowerCase().includes(search.toLowerCase()) ||
    z.polzovatel?.email?.toLowerCase().includes(search.toLowerCase())
  );

  // Summary counts
  const counts = STATUSES.reduce((acc, s) => {
    acc[s] = zayavki.filter(z => z.status === s).length;
    return acc;
  }, {});

  return (
    <div className="flex gap-5 h-full">
      <div className="flex-1 min-w-0 flex flex-col gap-4">

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-3">
          {STATUSES.map(s => {
            const st = STATUS[s];
            return (
              <button key={s}
                onClick={() => setFilters(f => ({ ...f, status: f.status === s ? '' : s }))}
                className={`bg-white rounded-xl border p-4 text-left transition-all hover:shadow-md ${filters.status === s ? `${st.border} ring-2 ring-offset-1` : 'border-gray-200'}`}>
                <div className={`text-2xl font-bold ${st.text}`}>{counts[s]}</div>
                <div className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                  {s}
                </div>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap gap-2 shadow-sm">
          <div className="relative flex-1 min-w-48">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" placeholder="Поиск по заявкам..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="">Все статусы</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input type="date" value={filters.date_from}
            onChange={e => setFilters({ ...filters, date_from: e.target.value })}
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          <input type="date" value={filters.date_to}
            onChange={e => setFilters({ ...filters, date_to: e.target.value })}
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          <button onClick={load}
            className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all">
            Обновить
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex-1 overflow-hidden">
          {loading ? (
            <div className="p-16 text-center text-gray-400 text-sm">Загрузка...</div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center">
              <div className="text-5xl mb-3">📭</div>
              <div className="text-gray-500 text-sm font-medium">Заявки не найдены</div>
              <div className="text-gray-400 text-xs mt-1">Попробуйте изменить фильтры</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Номер</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Клиент</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Услуги</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Статус</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Цена</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Дата</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(z => (
                    <tr key={z.id} onClick={() => setSelected(z)}
                      className={`cursor-pointer transition-colors ${selected?.id === z.id ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}>
                      <td className="px-5 py-4 font-mono text-xs font-bold text-gray-600">{z.nomer}</td>
                      <td className="px-5 py-4">
                        <div className="font-medium text-gray-900 text-sm">{z.polzovatel?.imya}</div>
                        <div className="text-gray-400 text-xs mt-0.5">{z.polzovatel?.email}</div>
                      </td>
                      <td className="px-5 py-4 text-gray-500 text-xs max-w-36 truncate">
                        {z.uslugi?.slice(0, 2).map(u => u.naimenovanie).join(', ')}
                        {z.uslugi?.length > 2 && <span className="text-gray-400"> +{z.uslugi.length - 2}</span>}
                      </td>
                      <td className="px-5 py-4"><StatusBadge status={z.status} /></td>
                      <td className="px-5 py-4 text-gray-700 text-sm font-semibold">
                        {z.tsena ? `$${Number(z.tsena).toLocaleString('en')}` : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-4 text-gray-400 text-xs">
                        {new Date(z.data_podachi).toLocaleDateString('ru')}
                      </td>
                      <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                        <select value={z.status} onChange={e => handleStatusChange(z.id, e.target.value)}
                          disabled={updating}
                          className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer">
                          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400 flex items-center justify-between">
            <span>Показано: <span className="font-semibold text-gray-600">{filtered.length}</span> заявок</span>
            {filters.status && (
              <button onClick={() => setFilters(f => ({ ...f, status: '' }))}
                className="text-emerald-600 hover:text-emerald-800 font-medium">
                Сбросить фильтр ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="w-72 shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden sticky top-0">
            <div className="bg-gray-900 px-5 py-4 flex items-center justify-between">
              <div>
                <div className="font-mono text-xs text-gray-400">{selected.nomer}</div>
                <div className="text-white font-semibold text-sm mt-0.5">{selected.polzovatel?.imya}</div>
              </div>
              <button onClick={() => setSelected(null)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-all text-xs">✕</button>
            </div>

            <div className="p-4 space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-xs">Статус</span>
                <StatusBadge status={selected.status} />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-xs">Дата подачи</span>
                <span className="text-gray-700 text-xs font-medium">{new Date(selected.data_podachi).toLocaleDateString('ru')}</span>
              </div>

              {selected.data_resheniya && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-xs">Дата решения</span>
                  <span className="text-gray-700 text-xs font-medium">{new Date(selected.data_resheniya).toLocaleDateString('ru')}</span>
                </div>
              )}

              <hr className="border-gray-100" />

              <div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Контакты</div>
                <div className="space-y-1">
                  <div className="text-gray-700 text-xs">{selected.polzovatel?.email}</div>
                  {selected.polzovatel?.messenger && (
                    <div className="text-gray-500 text-xs">{selected.polzovatel.messenger}</div>
                  )}
                </div>
              </div>

              {selected.polzovatel?.pozhelaniya && (
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Пожелания</div>
                  <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-800 leading-relaxed">
                    {selected.polzovatel.pozhelaniya}
                  </div>
                </div>
              )}

              {selected.tz && (
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Техническое задание</div>
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800 leading-relaxed whitespace-pre-wrap">
                    {selected.tz}
                  </div>
                </div>
              )}

              {selected.uslugi?.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Услуги</div>
                  <div className="space-y-1.5">
                    {selected.uslugi.map(u => (
                      <div key={u.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                        <div>
                          <div className="text-gray-700 text-xs font-medium">{u.naimenovanie}</div>
                          <div className="text-gray-400 text-xs">{u.kategoriya}</div>
                        </div>
                        <div className="text-emerald-600 text-xs font-bold shrink-0 ml-2">
                          {u.tsena ? `$${Number(u.tsena).toLocaleString('en')}` : '—'}
                        </div>
                      </div>
                    ))}
                    <div className="text-right text-xs text-gray-400 pr-1">
                      База: <span className="font-bold text-gray-700">
                        ${selected.uslugi.reduce((s, u) => s + (u.tsena || 0), 0).toLocaleString('en')}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Итоговая цена</div>
                <TsenaEditor zayavka={selected} onUpdate={(tsena) => { setSelected({ ...selected, tsena }); load(); }} />
              </div>

              <div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Сменить статус</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {STATUSES.filter(s => s !== selected.status).map(s => {
                    const st = STATUS[s];
                    return (
                      <button key={s} onClick={() => handleStatusChange(selected.id, s)} disabled={updating}
                        className={`py-2 rounded-lg text-xs font-medium border transition-all hover:opacity-80 ${st.bg} ${st.text} ${st.border}`}>
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button onClick={() => handleDelete(selected.id)}
                className="w-full py-2 border border-red-200 text-red-500 rounded-lg text-xs font-medium hover:bg-red-50 transition-all">
                Удалить заявку
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}