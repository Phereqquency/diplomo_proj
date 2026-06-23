import { useState, useEffect } from 'react';
import { api } from '../api/api';

const STATUS = {
  'Новая':        { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   dot: 'bg-blue-500' },
  'В работе':  { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  dot: 'bg-amber-500' },
  'Завершена':    { bg: 'bg-emerald-50',text: 'text-emerald-700',border: 'border-emerald-200',dot: 'bg-emerald-500' },
  'Отклонена':    { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    dot: 'bg-red-500' },
};

const STATUSES = ['Новая', 'В работе', 'Завершена', 'Отклонена'];

function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS['Новая'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${s.bg} ${s.text} ${s.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
}

export default function MyOrdersPage() {
  const [zayavki, setZayavki] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({ status: '', date_from: '', date_to: '' });
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      setZayavki(await api.getMyZayavki(params) || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filters]);

  const filtered = zayavki.filter(z =>
    !search ||
    z.nomer.includes(search) ||
    z.polzovatel?.imya?.toLowerCase().includes(search.toLowerCase()) ||
    z.polzovatel?.email?.toLowerCase().includes(search.toLowerCase())
  );

  const counts = STATUSES.reduce((acc, s) => {
    acc[s] = zayavki.filter(z => z.status === s).length;
    return acc;
  }, {});

  return (
    <div className="flex gap-5 h-full">
      <div className="flex-1 min-w-0 flex flex-col gap-4">

        <div className="grid grid-cols-4 gap-3">
          {STATUSES.map(s => {
            const st = STATUS[s];
            return (
              <div key={s} className={`bg-white rounded-xl border p-4 text-left ${st.border}`}>
                <div className={`text-2xl font-bold ${st.text}`}>{counts[s]}</div>
                <div className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                  {s}
                </div>
              </div>
            );
          })}
        </div>

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
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Услуги</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Статус</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Цена</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Дата</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">ТЗ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(z => (
                    <tr key={z.id} onClick={() => setSelected(z)}
                      className={`cursor-pointer transition-colors ${selected?.id === z.id ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}>
                      <td className="px-5 py-4 font-mono text-xs font-bold text-gray-600">{z.nomer}</td>
                      <td className="px-5 py-4 text-gray-600 text-sm max-w-48 truncate">
                        {z.uslugi?.slice(0, 3).map(u => u.naimenovanie).join(', ')}
                        {z.uslugi && z.uslugi.length > 3 && ` +${z.uslugi.length - 3}`}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={z.status} />
                      </td>
                      <td className="px-5 py-4 font-semibold text-gray-900">
                        {z.tsena !== null && z.tsena !== undefined ? `$${Number(z.tsena).toLocaleString('en')}` : '-не установлена-'}
                      </td>
                      <td className="px-5 py-4 text-gray-400 text-xs">
                        {new Date(z.data_podachi).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="px-5 py-4 text-gray-400 text-xs max-w-32 truncate">
                        {z.tz || '-нет-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selected && (
        <div className="w-80 bg-white rounded-xl border border-gray-200 shadow-sm p-5 h-fit sticky top-5">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Детали заявки</h2>
          <div className="space-y-4 text-sm">
            <div><span className="text-gray-400">Номер</span><div className="font-mono font-bold text-gray-900">{selected.nomer}</div></div>
            <div><span className="text-gray-400">Статус</span><div className="mt-1"><StatusBadge status={selected.status} /></div></div>
            <div><span className="text-gray-400">Дата подачи</span><div className="text-gray-900">{new Date(selected.data_podachi).toLocaleString('ru-RU')}</div></div>
            {selected.data_resheniya && <div><span className="text-gray-400">Дата решения</span><div className="text-gray-900">{new Date(selected.data_resheniya).toLocaleString('ru-RU')}</div></div>}
            <div><span className="text-gray-400">Цена</span><div className={`text-lg font-bold ${selected.tsena !== null ? 'text-emerald-600' : 'text-gray-400'}`}>{selected.tsena !== null && selected.tsena !== undefined ? `$${Number(selected.tsena).toLocaleString('en')}` : 'Не установлена'}</div></div>
            {selected.polzovatel && (<div><span className="text-gray-400">Клиент</span><div className="text-gray-900">{selected.polzovatel.imya}</div><div className="text-gray-400 text-xs">{selected.polzovatel.email}</div></div>)}
            {selected.admin && (<div><span className="text-gray-400">Разработчик</span><div className="text-gray-900">{selected.admin.imya}</div></div>)}
            <div><span className="text-gray-400">Услуги</span><div className="mt-1 space-y-1">{selected.uslugi?.map(u => (<div key={u.id} className="text-gray-900 text-sm py-1 border-b border-gray-100 last:border-0">{u.naimenovanie} {u.tsena > 0 && <span className="text-gray-400">(${Number(u.tsena).toLocaleString('en')})</span>}</div>))}</div></div>
            {selected.tz && (<div><span className="text-gray-400">Техническое задание</span><div className="text-gray-900 text-sm mt-1 p-2 bg-gray-50 rounded-lg">{selected.tz}</div></div>)}
          </div>
        </div>
      )}
    </div>
  );
}