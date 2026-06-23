import { useState } from 'react';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, AlignmentType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import { api } from '../api/api';

const STATUS_STYLE = {
  'Новая':    { bg: '#fef9c3', color: '#854d0e' },
  'В работе': { bg: '#dbeafe', color: '#1e40af' },
  'Завершена':{ bg: '#dcfce7', color: '#166534' },
  'Отклонена':{ bg: '#fee2e2', color: '#991b1b' },
};

export function PeriodOrdersReport() {
  const getDefaultFrom = () => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split('T')[0]; };
  const getDefaultTo   = () => new Date().toISOString().split('T')[0];

  const [dateFrom, setDateFrom]   = useState(getDefaultFrom());
  const [dateTo, setDateTo]       = useState(getDefaultTo());
  const [result, setResult]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const [dateError, setDateError] = useState('');

  const validate = (f, t) => {
    if (!f || !t) { setDateError('Укажите обе даты'); return false; }
    if (new Date(f) > new Date(t)) { setDateError('Дата «от» не может быть позже даты «до»'); return false; }
    setDateError(''); return true;
  };

  const generate = async () => {
    if (!validate(dateFrom, dateTo)) return;
    setLoading(true);
    try {
      const data = await api.getPeriodOrdersReport({ date_from: dateFrom, date_to: dateTo });
      setResult(data);
    } catch (err) {
      alert('Ошибка загрузки: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('ru-RU') : '—';

  const orders = result?.orders || [];
  const totalSum = result?.total_sum || 0;

  // Статистика по услугам
  const servicesCounts = {};
  orders.forEach(o => (o.uslugi || []).forEach(name => { servicesCounts[name] = (servicesCounts[name] || 0) + 1; }));

  const exportDocx = async () => {
    const bp = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
    const cb = { top: bp, bottom: bp, left: bp, right: bp };
    const hc = (text) => new TableCell({ borders: cb, shading: { fill: 'F3F4F6' }, children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 20 })] })] });
    const dc = (text) => new TableCell({ borders: cb, children: [new Paragraph({ children: [new TextRun({ text: String(text ?? '—'), size: 20 })] })] });

    const doc = new Document({ sections: [{ children: [
      new Paragraph({ text: 'Отчёт по заказам за период', heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, spacing: { after: 100 } }),
      new Paragraph({ children: [new TextRun({ text: `Период: ${fmtDate(dateFrom)} — ${fmtDate(dateTo)}`, size: 22, color: '555555' })], alignment: AlignmentType.CENTER, spacing: { after: 300 } }),

      new Paragraph({ text: 'Сводка', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
      new Table({ width: { size: 50, type: WidthType.PERCENTAGE }, rows: [
        new TableRow({ children: [hc('Показатель'), hc('Значение')] }),
        new TableRow({ children: [dc('Всего заказов'), dc(orders.length)] }),
        new TableRow({ children: [dc('Общая сумма'), dc(totalSum.toLocaleString('ru-RU') + ' BYN')] }),
      ]}),

      new Paragraph({ text: 'Заказы', heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 } }),
      new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
        new TableRow({ children: [hc('№'), hc('Номер'), hc('Клиент'), hc('Услуги'), hc('Статус'), hc('Дата'), hc('Сумма, BYN')] }),
        ...orders.map((o, i) => new TableRow({ children: [
          dc(i + 1), dc(o.nomer), dc(o.client_imya || '—'),
          dc((o.uslugi || []).join(', ') || '—'), dc(o.status),
          dc(fmtDate(o.data_podachi)), dc(o.tsena ? Number(o.tsena).toLocaleString('ru-RU') : '—'),
        ]})),
      ]}),

      new Paragraph({ text: 'Статистика по услугам', heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 } }),
      new Table({ width: { size: 60, type: WidthType.PERCENTAGE }, rows: [
        new TableRow({ children: [hc('Услуга'), hc('Заказов')] }),
        ...Object.entries(servicesCounts).sort((a,b) => b[1]-a[1]).map(([name, cnt]) =>
          new TableRow({ children: [dc(name), dc(cnt)] })
        ),
      ]}),

      new Paragraph({ spacing: { before: 300 }, children: [new TextRun({ text: `Итоговая сумма: ${totalSum.toLocaleString('ru-RU')} BYN`, bold: true, size: 26 })] }),
    ]}]});

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `period_orders_${dateFrom}_${dateTo}.docx`);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Отчёт по заказам за период</h1>
          <p className="text-sm text-gray-500 mt-1">Количество заказов, услуги и общая сумма за выбранный диапазон дат</p>
        </div>
        {result && orders.length > 0 && (
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
        orders.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400 shadow-sm">
            За выбранный период заказов не найдено
          </div>
        ) : (
          <div className="space-y-6">
            {/* Сводка */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { val: orders.length, label: 'Всего заказов', color: 'text-indigo-600' },
                { val: totalSum.toLocaleString('ru-RU') + ' BYN', label: 'Общая сумма', color: 'text-emerald-600' },
                { val: Object.keys(servicesCounts).length, label: 'Уникальных услуг', color: 'text-amber-500' },
              ].map(c => (
                <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm text-center">
                  <div className={`text-3xl font-bold ${c.color}`}>{c.val}</div>
                  <div className="text-sm text-gray-500 mt-1">{c.label}</div>
                </div>
              ))}
            </div>

            {/* Таблица заказов */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-700">Список заказов</h2>
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
                    {orders.map((o, i) => {
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
                  <tfoot className="bg-gray-50 border-t border-gray-200">
                    <tr>
                      <td colSpan={6} className="px-4 py-3 text-sm font-bold text-gray-700 text-right">Итого:</td>
                      <td className="px-4 py-3 font-bold text-emerald-600">{totalSum.toLocaleString('ru-RU')} BYN</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Статистика по услугам */}
            {Object.keys(servicesCounts).length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <h2 className="font-semibold text-gray-700 mb-4">Услуги в заказах</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Услуга</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Заказов</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {Object.entries(servicesCounts).sort((a,b) => b[1]-a[1]).map(([name, cnt]) => (
                      <tr key={name} className="hover:bg-gray-50">
                        <td className="py-2 px-3 text-gray-700">{name}</td>
                        <td className="py-2 px-3 text-right font-semibold text-gray-800">{cnt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}