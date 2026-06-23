import { useState, useEffect } from 'react';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import { api } from '../api/api';
import { PriceListReport } from './PriceListReport';
import { OrderDetailsReport } from './OrderDetailsReport';
import { PeriodOrdersReport } from './PeriodOrdersReport';
import { StatusOrdersReport } from './StatusOrdersReport';

// ─── Круговая диаграмма (SVG) ────────────────────────────────────────────────
function PieChart({ data, colors }) {
  if (!data || data.length === 0) return null;
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  let cumAngle = -Math.PI / 2;
  const cx = 100, cy = 100, r = 80;

  const slices = data.map((d, i) => {
    const angle = (d.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(cumAngle);
    const y1 = cy + r * Math.sin(cumAngle);
    cumAngle += angle;
    const x2 = cx + r * Math.cos(cumAngle);
    const y2 = cy + r * Math.sin(cumAngle);
    const large = angle > Math.PI ? 1 : 0;
    const midAngle = cumAngle - angle / 2;
    return {
      path: `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`,
      color: colors[i % colors.length],
      label: d.label,
      value: d.value,
      pct: ((d.value / total) * 100).toFixed(1),
      midAngle,
    };
  });

  return (
    <div className="flex flex-col md:flex-row items-center gap-6">
      <svg viewBox="0 0 200 200" className="w-48 h-48 shrink-0">
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} stroke="#fff" strokeWidth="1.5">
            <title>{s.label}: {s.value} ({s.pct}%)</title>
          </path>
        ))}
      </svg>
      <div className="space-y-1.5 text-sm">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-gray-700 truncate max-w-[180px]">{s.label}</span>
            <span className="font-semibold text-gray-900 ml-auto pl-2">{s.value}</span>
            <span className="text-gray-400 text-xs">({s.pct}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const PIE_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16'];

export function AdminReports() {
  const [activeTab, setActiveTab] = useState('main');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({ date_from: '', date_to: '' });
  const [dateError, setDateError] = useState('');

  // ─── Валидация дат ────────────────────────────────────────────────────────
  const validateDates = (from, to) => {
    if (!from && !to) { setDateError(''); return true; }
    if (from && to) {
      const f = new Date(from);
      const t = new Date(to);
      if (f > t) { setDateError('Дата «от» не может быть позже даты «до»'); return false; }
      const maxTo = new Date(f);
      maxTo.setFullYear(maxTo.getFullYear() + 1);
      if (t > maxTo) { setDateError('Период не может превышать 1 год'); return false; }
    }
    setDateError('');
    return true;
  };

  const handleDateFrom = (val) => {
    setDateRange(prev => {
      const next = { ...prev, date_from: val };
      validateDates(val, next.date_to);
      return next;
    });
  };

  const handleDateTo = (val) => {
    setDateRange(prev => {
      const next = { ...prev, date_to: val };
      validateDates(next.date_from, val);
      return next;
    });
  };

  const getDefaultDateFrom = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  };
  const getDefaultDateTo = () => new Date().toISOString().split('T')[0];

  const generateReport = async () => {
    const from = dateRange.date_from || getDefaultDateFrom();
    const to   = dateRange.date_to   || getDefaultDateTo();
    if (!validateDates(from, to)) return;

    setLoading(true);
    try {
      const data = await api.getReport({ date_from: from, date_to: to });
      setReport(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'main') generateReport();
  }, [activeTab]);

  // ─── Экспорт в Word ───────────────────────────────────────────────────────
  const exportToWord = async () => {
    if (!report) return;

    const makeRow = (cells) => new TableRow({
      children: cells.map(text => new TableCell({ children: [new Paragraph({ text: String(text) })] })),
    });
    const makeHeaderRow = (cells) => new TableRow({
      children: cells.map(text => new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })],
      })),
    });

    const children = [
      new Paragraph({ text: 'Отчёт по заявкам', heading: HeadingLevel.HEADING_1, spacing: { after: 200 } }),
      new Paragraph({
        children: [new TextRun({ text: `Период: ${report.date_from || '—'} — ${report.date_to || '—'}`, bold: true })],
        spacing: { after: 200 },
      }),
      new Paragraph({ text: 'Общая статистика', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
      new Table({
        rows: [
          makeHeaderRow(['Показатель', 'Значение']),
          makeRow(['Всего заявок', report.total_zayavki || 0]),
          makeRow(['Новая', report.by_status?.['Новая'] || 0]),
          makeRow(['В работе', report.by_status?.['В работе'] || 0]),
          makeRow(['Завершена', report.by_status?.['Завершена'] || 0]),
          makeRow(['Отклонена', report.by_status?.['Отклонена'] || 0]),
          ...(report.expired_count > 0 ? [makeRow(['Просрочено (>30 дней)', report.expired_count])] : []),
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
      }),
    ];

    if (report.by_srochnost && Object.keys(report.by_srochnost).length > 0) {
      children.push(
        new Paragraph({ text: 'По срочности', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
        new Table({
          rows: [
            makeHeaderRow(['Срочность', 'Количество']),
            ...Object.entries(report.by_srochnost).map(([k, v]) => makeRow([k, v])),
          ],
          width: { size: 100, type: WidthType.PERCENTAGE },
        })
      );
    }

    if (report.top_uslugi?.length > 0) {
      children.push(
        new Paragraph({ text: 'Топ услуг', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
        new Table({
          rows: [
            makeHeaderRow(['№', 'Услуга', 'Кол-во заказов', 'Общая сумма']),
            ...report.top_uslugi.map((u, i) => makeRow([i + 1, u.naimenovanie, u.count, `$${Number(u.total_sum || 0).toLocaleString('en')}`])),
          ],
          width: { size: 100, type: WidthType.PERCENTAGE },
        })
      );
    }

    if (report.by_period?.length > 0) {
      children.push(
        new Paragraph({ text: 'Динамика по месяцам', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
        new Table({
          rows: [
            makeHeaderRow(['Период', 'Кол-во заявок']),
            ...report.by_period.map(p => makeRow([p.period, p.count])),
          ],
          width: { size: 100, type: WidthType.PERCENTAGE },
        })
      );
    }

    const doc = new Document({ sections: [{ children }] });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `otchet_${report.date_from}_${report.date_to}.docx`);
  };

  const getStatusColor = (status) => {
    const colors = {
      'Новая': 'bg-yellow-100 text-yellow-800',
      'В работе': 'bg-blue-100 text-blue-800',
      'В обработке': 'bg-blue-100 text-blue-800',
      'Завершена': 'bg-green-100 text-green-800',
      'Отклонена': 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getSrochnostColor = (s) => {
    const colors = {
      'Срочно': 'bg-red-100 text-red-700',
      'Средняя срочность': 'bg-yellow-100 text-yellow-700',
      'Не срочно': 'bg-green-100 text-green-700',
      'Не указана': 'bg-gray-100 text-gray-700',
    };
    return colors[s] || 'bg-gray-100 text-gray-700';
  };

  // Данные для круговой диаграммы топ услуг
  const topUslugiPie = report?.top_uslugi?.map(u => ({ label: u.naimenovanie, value: Number(u.count) })) || [];
  // Данные для диаграммы статусов
  const statusPie = report?.by_status
    ? Object.entries(report.by_status).map(([label, value]) => ({ label, value: Number(value) }))
    : [];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold text-gray-800">Отчёты и аналитика</h1>
      </div>

      {/* Вкладки */}
      <div className="flex border-b border-gray-200 mb-6">
        {[
          { key: 'main', label: '📊 Основной отчёт' },
          { key: 'period-orders', label: '📅 Отчёт по заказам за период' },
          { key: 'status-orders', label: '🔖 Отчёт по статусам заказов' },
          { key: 'price-list', label: '💰 Прайс-лист' },
          { key: 'order-details', label: '📋 Детализация заказа' },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition ${activeTab === t.key
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-gray-600 hover:text-gray-800'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── Основной отчёт ──────────────────────────────────────────────── */}
      {activeTab === 'main' && (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={exportToWord} disabled={!report || loading}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2">
              📥 Экспорт в Word
            </button>
          </div>

          {/* Фильтр дат */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Дата от</label>
                <input type="date" value={dateRange.date_from}
                  onChange={e => handleDateFrom(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                <p className="text-xs text-gray-400 mt-1">По умолчанию: месяц назад</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Дата до</label>
                <input type="date" value={dateRange.date_to}
                  onChange={e => handleDateTo(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                <p className="text-xs text-gray-400 mt-1">По умолчанию: сегодня</p>
              </div>
              <div className="flex items-end">
                <button onClick={generateReport} disabled={loading || !!dateError}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">
                  {loading ? 'Загрузка...' : 'Сформировать отчёт'}
                </button>
              </div>
            </div>
            {dateError && (
              <p className="text-sm text-red-600 mt-1">⚠️ {dateError}</p>
            )}
            {report && !dateError && (
              <div className="text-xs text-gray-500 text-center border-t pt-3 mt-2">
                Период: {report.date_from} — {report.date_to}
              </div>
            )}
          </div>

          {loading ? (
            <div className="text-center py-8">Загрузка...</div>
          ) : report ? (
            <div className="space-y-6">

              {/* ── Карточки статистики ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Всего заявок</p>
                  <p className="text-3xl font-bold text-indigo-600">{report.total_zayavki || 0}</p>
                  {report.expired_count > 0 && (
                    <p className="mt-2 text-sm text-red-600">⚠️ {report.expired_count} просрочено</p>
                  )}
                </div>
                {Object.entries(report.by_status || {}).map(([status, count]) => (
                  <div key={status} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>{status}</span>
                    </p>
                    <p className="text-3xl font-bold text-gray-800">{count}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {report.total_zayavki > 0 ? ((Number(count) / report.total_zayavki) * 100).toFixed(1) : 0}% от общего
                    </p>
                  </div>
                ))}
              </div>

              {/* ── Диаграммы ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Статусы — круговая */}
                {statusPie.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold mb-4">Распределение по статусам</h2>
                    <PieChart data={statusPie} colors={['#f59e0b','#6366f1','#10b981','#ef4444']} />
                  </div>
                )}

                {/* Срочность */}
                {Object.keys(report.by_srochnost || {}).length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold mb-4">По срочности</h2>
                    <PieChart
                      data={Object.entries(report.by_srochnost).map(([label, value]) => ({ label, value: Number(value) }))}
                      colors={['#ef4444','#f59e0b','#10b981','#6b7280']}
                    />
                  </div>
                )}
              </div>

              {/* ── Топ услуг — круговая диаграмма ── */}
              {topUslugiPie.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold mb-4">Топ услуг (диаграмма)</h2>
                  <PieChart data={topUslugiPie} colors={PIE_COLORS} />
                  {/* Таблица под диаграммой */}
                  <div className="mt-6 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">№</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Услуга</th>
                          <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase">Заказов</th>
                          <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase">Общая сумма</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {report.top_uslugi.map((u, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-3 py-2">
                              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                                style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}>
                                {idx + 1}
                              </span>
                            </td>
                            <td className="px-3 py-2 font-medium">{u.naimenovanie}</td>
                            <td className="px-3 py-2 text-right font-semibold">{u.count}</td>
                            <td className="px-3 py-2 text-right font-semibold text-emerald-600">
                              ${Number(u.total_sum || 0).toLocaleString('en')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── Динамика по месяцам ── */}
              {report.by_period?.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold mb-4">Динамика по месяцам</h2>
                  {/* Бар-чарт */}
                  <div className="space-y-2">
                    {(() => {
                      const maxVal = Math.max(...report.by_period.map(p => p.count), 1);
                      return report.by_period.map(p => (
                        <div key={p.period} className="flex items-center gap-3">
                          <span className="w-20 text-xs text-gray-600 shrink-0 text-right">{p.period}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full flex items-center pl-2 transition-all"
                              style={{ width: `${(p.count / maxVal) * 100}%`, minWidth: '20px' }}>
                            </div>
                          </div>
                          <span className="w-8 text-sm font-semibold text-gray-800 shrink-0">{p.count}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">Нет данных</div>
          )}
        </>
      )}

      {activeTab === 'price-list' && <PriceListReport />}
      {activeTab === 'order-details' && <OrderDetailsReport />}
      {activeTab === 'period-orders' && <PeriodOrdersReport />}
      {activeTab === 'status-orders' && <StatusOrdersReport />}
    </div>
  );
}