import { useState, useEffect } from 'react';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import { api } from '../api/api';
import { PriceListReport } from './PriceListReport';
import { OrderDetailsReport } from './OrderDetailsReport';

export function AdminReports() {
  const [activeTab, setActiveTab] = useState('main');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({ date_from: '', date_to: '' });

  const getDefaultDateFrom = () => new Date().toISOString().split('T')[0];
  
  const getDefaultDateTo = () => {
    const date = new Date();
    date.setMonth(date.getMonth() + 6);
    return date.toISOString().split('T')[0];
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      const params = {};
      params.date_from = dateRange.date_from || getDefaultDateFrom();
      params.date_to = dateRange.date_to || getDefaultDateTo();
      
      const fromDate = new Date(params.date_from);
      const toDate = new Date(params.date_to);
      const maxToDate = new Date(fromDate);
      maxToDate.setMonth(maxToDate.getMonth() + 6);
      
      if (toDate > maxToDate) {
        alert('Период не может превышать 6 месяцев');
        setLoading(false);
        return;
      }
      
      const data = await api.getReport(params);
      setReport(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'main') {
      generateReport();
    }
  }, [activeTab, dateRange.date_from, dateRange.date_to]);

  const exportToWord = async () => {
    if (!report) return;
    
    const children = [
      new Paragraph({
        text: "Отчёт по заявкам",
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `Период: ${report.date_from || 'начало'} - ${report.date_to || 'текущая дата'}`, bold: true }),
        ],
        spacing: { after: 200 },
      }),
      new Paragraph({
        text: "Сводка",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),
    ];
    
    // Общая статистика
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
              new TableCell({ children: [new Paragraph({ text: "В работе" })] }),
              new TableCell({ children: [new Paragraph({ text: String(report.by_status?.['В работе'] || 0) })] }),
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
    
    // По срочности
    if (report.by_srochnost && Object.keys(report.by_srochnost).length > 0) {
      children.push(
        new Paragraph({
          text: "Распределение по срочности",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      );
      
      const srochnostRows = [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Срочность", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Количество", bold: true })] })] }),
          ],
        }),
      ];
      
      Object.entries(report.by_srochnost).forEach(([srochnost, count]) => {
        srochnostRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: srochnost })] }),
              new TableCell({ children: [new Paragraph({ text: String(count) })] }),
            ],
          })
        );
      });
      
      children.push(
        new Table({
          rows: srochnostRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        })
      );
    }
    
    // Топ услуг
    if (report.top_uslugi?.length > 0) {
      children.push(
        new Paragraph({
          text: "Топ популярных услуг",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      );
      
      const topRows = [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "№", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Услуга", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Количество заказов", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Общая сумма", bold: true })] })] }),
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
              new TableCell({ children: [new Paragraph({ text: `$${Number(u.total_sum || 0).toLocaleString('en')}` })] }),
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
          text: "Динамика заявок по месяцам",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      );
      
      const periodRows = [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Период", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Количество заявок", bold: true })] })] }),
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
    
    // Просроченные заявки
    if (report.expired_count > 0) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `⚠️ Просроченные заявки: ${report.expired_count} заявок в работе более 30 дней`, bold: true }),
          ],
          spacing: { before: 200, after: 100 },
        })
      );
    }
    
    const doc = new Document({
      sections: [{ children }],
    });
    
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `otchet_${report.date_from}_${report.date_to}.docx`);
  };

  const getStatusColor = (status) => {
    const colors = {
      'Новая': 'bg-yellow-100 text-yellow-800',
      'В работе': 'bg-blue-100 text-blue-800',
      'Завершена': 'bg-green-100 text-green-800',
      'Отклонена': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getSrochnostColor = (srochnost) => {
    const colors = {
      'Срочно': 'bg-red-100 text-red-700',
      'Средняя срочность': 'bg-yellow-100 text-yellow-700',
      'Не срочно': 'bg-green-100 text-green-700',
      'Не указана': 'bg-gray-100 text-gray-700'
    };
    return colors[srochnost] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold text-gray-800">Отчёты и аналитика</h1>
      </div>

      {/* Вкладки */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('main')}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === 'main' 
              ? 'border-b-2 border-indigo-600 text-indigo-600' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          📊 Основной отчёт
        </button>
        <button
          onClick={() => setActiveTab('price-list')}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === 'price-list' 
              ? 'border-b-2 border-indigo-600 text-indigo-600' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          💰 Прайс-лист
        </button>
        <button
          onClick={() => setActiveTab('order-details')}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === 'order-details' 
              ? 'border-b-2 border-indigo-600 text-indigo-600' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          📋 Детализация заказа
        </button>
      </div>

      {/* Основной отчёт */}
      {activeTab === 'main' && (
        <>
          <div className="flex justify-end mb-4">
            <button
              onClick={exportToWord}
              disabled={!report || loading}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
            >
              📥 Экспорт в Word
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Дата от</label>
                <input
                  type="date"
                  value={dateRange.date_from}
                  onChange={e => setDateRange({ ...dateRange, date_from: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">По умолчанию: сегодня</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Дата до</label>
                <input
                  type="date"
                  value={dateRange.date_to}
                  onChange={e => setDateRange({ ...dateRange, date_to: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">Не более 6 месяцев от даты "от"</p>
              </div>
              <div className="flex items-end">
                <button
                  onClick={generateReport}
                  disabled={loading}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? 'Загрузка...' : 'Сформировать отчёт'}
                </button>
              </div>
            </div>
            {report && (
              <div className="text-xs text-gray-500 text-center border-t pt-3 mt-2">
                Период: {report.date_from} — {report.date_to}
              </div>
            )}
          </div>

          {loading ? (
            <div className="text-center py-8">Загрузка...</div>
          ) : report ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold mb-4">Общая статистика</h2>
                  <div className="text-3xl font-bold text-indigo-600">{report.total_zayavki}</div>
                  <div className="text-sm text-gray-500">всего заявок</div>
                  {report.expired_count > 0 && (
                    <div className="mt-3 text-sm text-red-600">
                      ⚠️ {report.expired_count} заявок просрочено
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold mb-4">По статусам</h2>
                  <div className="space-y-2">
                    {Object.entries(report.by_status || {}).map(([status, count]) => (
                      <div key={status} className="flex justify-between items-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                          {status}
                        </span>
                        <span className="font-semibold">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold mb-4">По срочности</h2>
                  <div className="space-y-2">
                    {Object.entries(report.by_srochnost || {}).map(([srochnost, count]) => (
                      <div key={srochnost} className="flex justify-between items-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSrochnostColor(srochnost)}`}>
                          {srochnost}
                        </span>
                        <span className="font-semibold">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {report.by_period?.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold mb-4">Динамика по месяцам</h2>
                  <div className="space-y-2">
                    {report.by_period.map(p => (
                      <div key={p.period} className="flex justify-between items-center">
                        <span>{p.period}</span>
                        <span className="font-semibold">{p.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {report.top_uslugi?.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold mb-4">Топ услуг</h2>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">№</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Услуга</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Заказов</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Общая сумма</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {report.top_uslugi.map((u, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="py-3 px-3">
                            <span className="w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full inline-flex items-center justify-center text-xs font-bold">
                              {idx + 1}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-medium text-gray-800">{u.naimenovanie}</td>
                          <td className="py-3 px-3 text-right font-semibold text-gray-700">{u.count}</td>
                          <td className="py-3 px-3 text-right font-semibold text-emerald-600">
                            ${Number(u.total_sum || 0).toLocaleString('en')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">Нет данных</div>
          )}
        </>
      )}

      {/* Прайс-лист */}
      {activeTab === 'price-list' && <PriceListReport />}

      {/* Детализация заказа */}
      {activeTab === 'order-details' && <OrderDetailsReport />}
    </div>
  );
}