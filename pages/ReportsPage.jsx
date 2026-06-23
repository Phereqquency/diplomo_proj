import { useState, useEffect } from 'react';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import { api } from '../api/api';

const StatCard = ({ title, value, color }) => (
  <div className={`bg-white rounded-xl border border-gray-200 p-5 shadow-sm`}>
    <div className="text-sm text-gray-500 mb-1">{title}</div>
    <div className={`text-3xl font-bold ${color}`}>{value}</div>
  </div>
);

export default function ReportsPage() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      console.log('Загрузка отчёта с параметрами:', params);
      const data = await api.getReport(params);
      console.log('Получены данные отчёта:', data);
      setReport(data);
    } catch (e) {
      console.error('Ошибка загрузки отчёта:', e);
      alert('Ошибка загрузки отчёта: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Загружаем отчёт при монтировании компонента
  useEffect(() => {
    load();
  }, []);

  const STATUS_COLORS = {
    'Новая': '#6366f1',
    'В обработке': '#f59e0b',
    'Завершена': '#10b981',
    'Отклонена': '#ef4444',
  };

  const maxPeriodCount = report?.by_period?.length
    ? Math.max(...report.by_period.map(p => p.count))
    : 1;

  const exportToDocx = async () => {
    if (!report) return;
    
    const children = [
      new Paragraph({
        text: "Отчёт по заявкам",
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `Период: ${dateFrom || 'начало'} - ${dateTo || 'текущая дата'}`, bold: true }),
        ],
        spacing: { after: 200 },
      }),
      new Paragraph({
        text: "Сводка",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),
    ];
    
    // Статистика
    children.push(
      new Table({
        rows: [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Показатель", bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Значение", bold: true })] })] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: "Всего заявок" })] }),
              new TableCell({ children: [new Paragraph({ text: String(report.total_zayavki || 0) })] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: "Новые" })] }),
              new TableCell({ children: [new Paragraph({ text: String(report.by_status?.['Новая'] || 0) })] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: "В обработке" })] }),
              new TableCell({ children: [new Paragraph({ text: String(report.by_status?.['В обработке'] || 0) })] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: "Завершены" })] }),
              new TableCell({ children: [new Paragraph({ text: String(report.by_status?.['Завершена'] || 0) })] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: "Отклонены" })] }),
              new TableCell({ children: [new Paragraph({ text: String(report.by_status?.['Отклонена'] || 0) })] }),
            ],
          }),
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
      })
    );
    
    // Топ услуг
    if (report.top_uslugi?.length > 0) {
      children.push(
        new Paragraph({
          text: "Топ услуг",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      );
      
      const topRows = [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "№", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Услуга", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Количество", bold: true })] })] }),
          ],
        }),
      ];
      
      report.top_uslugi.forEach((u, i) => {
        topRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: String(i + 1) })] }),
              new TableCell({ children: [new Paragraph({ text: u.naimenovanie })] }),
              new TableCell({ children: [new Paragraph({ text: String(u.count) })] }),
            ],
          })
        );
      });
      
      children.push(
        new Table({
          rows: topRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        })
      );
    }
    
    // По периодам
    if (report.by_period?.length > 0) {
      children.push(
        new Paragraph({
          text: "Заявки по месяцам",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      );
      
      const periodRows = [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Период", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Количество", bold: true })] })] }),
          ],
        }),
      ];
      
      report.by_period.forEach(p => {
        periodRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: p.period })] }),
              new TableCell({ children: [new Paragraph({ text: String(p.count) })] }),
            ],
          })
        );
      });
      
      children.push(
        new Table({
          rows: periodRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        })
      );
    }
    
    const doc = new Document({
      sections: [{ children }],
    });
    
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `otchet-${dateFrom || 'vse'}-${dateTo || 'vse'}.docx`);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-gray-800">Отчёты</h1>
        <div className="flex gap-3 items-center flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">с</span>
            <input 
              type="date" 
              value={dateFrom} 
              onChange={e => setDateFrom(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">по</span>
            <input 
              type="date" 
              value={dateTo} 
              onChange={e => setDateTo(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
            />
          </div>
          <button 
            onClick={load} 
            className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-indigo-700"
          >
            Применить
          </button>
          <button 
            onClick={exportToDocx} 
            disabled={!report || loading}
            className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            📥 DOCX
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 p-12">Загрузка...</div>
      ) : report ? (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title="Всего заявок" value={report.total_zayavki || 0} color="text-indigo-600" />
            <StatCard title="Новые" value={report.by_status?.['Новая'] || 0} color="text-blue-600" />
            <StatCard title="В обработке" value={report.by_status?.['В обработке'] || 0} color="text-yellow-600" />
            <StatCard title="Завершены" value={report.by_status?.['Завершена'] || 0} color="text-green-600" />
          </div>

          {report.expired_count > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <div className="font-medium text-red-800">Просроченные заявки</div>
                <div className="text-sm text-red-600">
                  {report.expired_count} заявок в обработке более 30 дней
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* По статусам */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h2 className="font-semibold text-gray-700 mb-4">По статусам</h2>
              {Object.keys(report.by_status || {}).length === 0 ? (
                <div className="text-gray-400 text-sm text-center py-4">Нет данных</div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(report.by_status).map(([status, count]) => (
                    <div key={status}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{status}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(count / report.total_zayavki) * 100}%`,
                            backgroundColor: STATUS_COLORS[status] || '#94a3b8'
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* По срочности */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h2 className="font-semibold text-gray-700 mb-4">По срочности</h2>
              {Object.keys(report.by_srochnost || {}).length === 0 ? (
                <div className="text-gray-400 text-sm text-center py-4">Нет данных</div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(report.by_srochnost).map(([srochnost, count]) => (
                    <div key={srochnost}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{srochnost}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(count / report.total_zayavki) * 100}%`,
                            backgroundColor: srochnost === 'Срочно' ? '#ef4444' : srochnost === 'Средняя срочность' ? '#f59e0b' : '#10b981'
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Топ услуг */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-700 mb-4">Топ-5 услуг</h2>
            {report.top_uslugi?.length ? (
              <div className="space-y-3">
                {report.top_uslugi.map((u, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600 truncate">{u.naimenovanie}</span>
                        <span className="font-medium shrink-0 ml-2">{u.count}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full">
                        <div className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${(u.count / (report.top_uslugi[0]?.count || 1)) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-400 text-sm text-center py-4">Нет данных</div>
            )}
          </div>

          {/* По периодам */}
          {report.by_period?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h2 className="font-semibold text-gray-700 mb-4">Заявки по месяцам</h2>
              <div className="flex items-end gap-2 h-40">
                {report.by_period.map((p, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs text-gray-500">{p.count}</span>
                    <div
                      className="w-full bg-indigo-500 rounded-t transition-all hover:bg-indigo-600"
                      style={{ height: `${(p.count / maxPeriodCount) * 100}%`, minHeight: '4px' }}
                    />
                    <span className="text-xs text-gray-400 truncate w-full text-center">{p.period}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center text-gray-400 p-12">Нет данных для отображения</div>
      )}
    </div>
  );
}