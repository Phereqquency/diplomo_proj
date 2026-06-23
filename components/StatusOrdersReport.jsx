import { useState } from 'react';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, AlignmentType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import { api } from '../api/api';

const STATUSES = ['Новая', 'В работе', 'Завершена', 'Отклонена'];
const STATUS_STYLE = {
  'Новая':    { bg: '#fef9c3', color: '#854d0e', dot: '#f59e0b', icon: '🆕' },
  'В работе': { bg: '#dbeafe', color: '#1e40af', dot: '#3b82f6', icon: '⚙️' },
  'Завершена':{ bg: '#dcfce7', color: '#166534', dot: '#22c55e', icon: '✅' },
  'Отклонена':{ bg: '#fee2e2', color: '#991b1b', dot: '#ef4444', icon: '❌' },
};

export function StatusOrdersReport() {
  const getDefaultFrom = () => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split('T')[0]; };
  const getDefaultTo   = () => new Date().toISOString().split('T')[0];

  const [dateFrom, setDateFrom]       = useState(getDefaultFrom());
  const [dateTo, setDateTo]           = useState(getDefaultTo());
  const [result, setResult]           = useState(null);
  const [loading, setLoading]         = useState(false);
  const [activeStatus, setActiveStatus] = useState(null);
  const [dateError, setDateError]     = useState('');

  const validate = (f, t) => {
    if (!f || !t) { setDateError('Укажите обе даты'); return false; }
    if (new Date(f) > new Date(t)) { setDateError('Дата «от» не может быть позже даты «до»'); return false; }
    setDateError(''); return true;
  };

  const generate = async () => {
    if (!validate(dateFrom, dateTo)) return;
    setLoading(true);
    try {
      const data = await api.getStatusOrdersReport({ date_from: dateFrom, date_to: dateTo });
      setResult(data);
      setActiveStatus(null);
    } catch (err) {
      alert('Ошибка загрузки: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('ru-RU') : '—';

  const allOrders = result?.orders || [];
  const byStatus  = result?.by_status || {};
  const visibleOrders = activeStatus ? (byStatus[activeStatus] || []) : allOrders;

  const exportDocx = async () => {
    const bp = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
    const cb = { top: bp, bottom: bp, left: bp, right: bp };
    const hc = (text) => new TableCell({ borders: cb, shading: { fill: 'F3F4F6' }, children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 20 })] })] });
    const dc = (text) => new TableCell({ borders: cb, children: [new Paragraph({ children: [new TextRun({ text: String(text ?? '—'), size: 20 })] })] });

    const children = [
      new Paragraph({ text: 'Отчёт по статусам заказов', heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, spacing: { after: 100 } }),
      new Paragraph({ children: [new TextRun({ text: `Период: ${fmtDate(dateFrom)} — ${fmtDate(dateTo)}`, size: 22, color: '555555' })], alignment: AlignmentType.CENTER, spacing: { after: 300 } }),

      new Paragraph({ text: 'Сводная таблица', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
      new Table({ width: { size: 60, type: WidthType.PERCENTAGE }, rows: [
        new TableRow({ children: [hc('Статус'), hc('Кол-во'), hc('%')] }),
        ...STATUSES.map(s => {
          const cnt = (byStatus[s] || []).length;
          const pct = allOrders.length > 0 ? ((cnt / allOrders.length) * 100).toFixed(1) : '0.0';
          return new TableRow({ children: [dc(s), dc(cnt), dc(pct + '%')] });
        }),
        new TableRow({ children: [hc('Всего'), hc(String(allOrders.length)), hc('100%')] }),
      ]}),
    ];

    for (const status of STATUSES) {
      const list = byStatus[status] || [];
      if (list.length === 0) continue;
      children.push(
        new Paragraph({ text: `${status} (${list.length})`, heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 } }),
        new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
          new TableRow({ children: [hc('№'), hc('Номер'), hc('Клиент'), hc('Услуги'), hc('Дата'), hc('Сумма, BYN')] }),
          ...list.map((o, i) => new TableRow({ children: [
            dc(i + 1), dc(o.nomer), dc(o.client_imya || '—'),
            dc((o.uslugi || []).join(', ') || '—'),
            dc(fmtDate(o.data_podachi)), dc(o.tsena ? Number(o.tsena).toLocaleString('ru-RU') : '—'),
          ]})),
        ]})
      );
    }

    const doc = new Document({ sections: [{ children }] });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `status_orders_${dateFrom}_${dateTo}.docx`);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Отчёт по статусам заказов</h1>
          <p className="text-sm text-gray-500 mt-1">Распределение заказов: новые, в работе, выполненные, отклонённые</p>
        </div>
        {result && allOrders.length > 0 && (
          <button onClick={exportDocx} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700 flex items-center gap-2">
            📥 Экспорт в Word
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Дата от</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Дата до</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <button onClick={generate} disabled={loading}
            className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
            {loading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Загрузка...</> : '📊 Сформировать'}
          </button>
        </div>
        {dateError && <p className="text-red-500 text-xs mt-2">{dateError}</p>}
      </div>

      {result && (
        allOrders.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400 shadow-sm">
            За выбранный период заказов не найдено
          </div>
        ) : (
          <div className="space-y-6">
            {/* Карточки статусов */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {STATUSES.map(s => {
                const cnt = (byStatus[s] || []).length;
                const pct = allOrders.length > 0 ? ((cnt / allOrders.length) * 100).toFixed(1) : '0.0';
                const st  = STATUS_STYLE[s];
                const isActive = activeStatus === s;
                return (
                  <button key={s} onClick={() => setActiveStatus(isActive ? null : s)}
                    className="rounded-xl border-2 p-4 text-left transition-all hover:shadow-md"
                    style={{ background: isActive ? st.bg : 'white', borderColor: isActive ? st.dot : '#e5e7eb', boxShadow: isActive ? `0 0 0 3px ${st.dot}33` : undefined }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg">{st.icon}</span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{pct}%</span>
                    </div>
                    <div className="text-2xl font-bold" style={{ color: st.color }}>{cnt}</div>
                    <div className="text-sm font-medium text-gray-600 mt-0.5">{s}</div>
                  </button>
                );
              })}
            </div>

            {/* Прогресс-бар */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <h2 className="font-semibold text-gray-700">Распределение ({allOrders.length} заказов)</h2>
                {activeStatus && <button onClick={() => setActiveStatus(null)} className="text-xs text-indigo-500 hover:underline">Показать все</button>}
              </div>
              <div className="flex h-6 rounded-full overflow-hidden gap-0.5">
                {STATUSES.map(s => {
                  const cnt = (byStatus[s] || []).length;
                  const pct = allOrders.length > 0 ? (cnt / allOrders.length) * 100 : 0;
                  if (pct === 0) return null;
                  return <div key={s} title={`${s}: ${cnt}`}
                    className="transition-all hover:opacity-80 cursor-pointer"
                    style={{ width: `${pct}%`, background: STATUS_STYLE[s].dot }}
                    onClick={() => setActiveStatus(activeStatus === s ? null : s)} />;
                })}
              </div>
              <div className="flex flex-wrap gap-4 mt-3">
                {STATUSES.map(s => (
                  <div key={s} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: STATUS_STYLE[s].dot }} />
                    {s}: {(byStatus[s] || []).length}
                  </div>
                ))}
              </div>
            </div>

            {/* Таблица */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-700">
                  {activeStatus ? `${STATUS_STYLE[activeStatus].icon} ${activeStatus} (${visibleOrders.length})` : `Все заказы (${allOrders.length})`}
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {['№','Заказ','Клиент','Услуги','Статус','Дата','Сумма'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {visibleOrders.map((o, i) => {
                      const st = STATUS_STYLE[o.status] || { bg: '#f3f4f6', color: '#374151' };
                      return (
                        <tr key={o.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                          <td className="px-4 py-3 font-medium text-gray-800">{o.nomer}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-700">{o.client_imya || '—'}</div>
                            <div className="text-xs text-gray-400">{o.client_email}</div>
                          </td>
                          <td className="px-4 py-3 max-w-xs">
                            <div className="flex flex-wrap gap-1">
                              {(o.uslugi || []).length > 0
                                ? (o.uslugi || []).map((u, ui) => <span key={ui} className="bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded-full">{u}</span>)
                                : <span className="text-gray-400 text-xs">—</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ background: st.bg, color: st.color }}>{o.status}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fmtDate(o.data_podachi)}</td>
                          <td className="px-4 py-3 font-semibold text-emerald-600 whitespace-nowrap">
                            {o.tsena ? Number(o.tsena).toLocaleString('ru-RU') + ' BYN' : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}