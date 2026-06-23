import { useState, useEffect } from 'react';
import { api } from '../api/api';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

export function PriceListReport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState({});

  useEffect(() => {
    loadPriceList();
  }, []);

  const loadPriceList = async () => {
    setLoading(true);
    try {
      const response = await api.getPriceListReport();
      setData(response);
      // По умолчанию раскрываем все категории
      const expanded = {};
      response.categories?.forEach(cat => {
        expanded[cat.id] = true;
      });
      setExpandedCategories(expanded);
    } catch (err) {
      console.error('Ошибка загрузки прайс-листа:', err);
      alert('Ошибка загрузки прайс-листа: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  const exportToWord = async () => {
    if (!data) return;

    const children = [
      new Paragraph({
        text: "Прайс-лист на услуги",
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `Дата формирования: ${data.generated_at}`, bold: true }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
      }),
    ];

    for (const category of data.categories) {
      // Заголовок категории
      children.push(
        new Paragraph({
          text: category.name,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      );

      // Таблица услуг в категории
      const tableRows = [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "№", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Наименование услуги", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Описание", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Цена, BYN", bold: true })] })] }),
          ],
        }),
      ];

      category.uslugi.forEach((usluga, idx) => {
        tableRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: String(idx + 1) })] }),
              new TableCell({ children: [new Paragraph({ text: usluga.name })] }),
              new TableCell({ children: [new Paragraph({ text: usluga.description || "—" })] }),
              new TableCell({ children: [new Paragraph({ text: usluga.price.toLocaleString() })] }),
            ],
          })
        );

        // Параметры услуги
        if (usluga.params && usluga.params.length > 0) {
          const paramText = usluga.params.map(p => 
            `${p.name}${p.is_required ? " (обяз.)" : ""}${p.price > 0 ? ` — ${p.price.toLocaleString()} BYN` : ""}`
          ).join("\n");
          
          tableRows.push(
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: "" })] }),
                new TableCell({ 
                  children: [new Paragraph({ 
                    children: [new TextRun({ text: "Параметры:", italics: true, bold: true })],
                  })],
                }),
                new TableCell({ 
                  children: [new Paragraph({ text: paramText })],
                }),
                new TableCell({ children: [new Paragraph({ text: "" })] }),
              ],
            })
          );
        }
      });

      children.push(
        new Table({
          rows: tableRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        })
      );
    }

    // Итоговая информация
    children.push(
      new Paragraph({
        text: `Итого услуг в каталоге: ${data.total_uslugi}`,
        spacing: { before: 200, after: 100 },
        bold: true,
      })
    );

    const doc = new Document({
      sections: [{ children }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `prays-list_${new Date().toISOString().split('T')[0]}.docx`);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="text-gray-500 mt-4">Загрузка прайс-листа...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Прайс-лист</h1>
          <p className="text-sm text-gray-500 mt-1">Актуальные цены на услуги и параметры</p>
        </div>
        <button
          onClick={exportToWord}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700 flex items-center gap-2"
        >
          📥 Экспорт в Word
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">
              Всего услуг: <strong>{data?.total_uslugi || 0}</strong>
            </span>
            <span className="text-sm text-gray-500">
              Обновлено: {data?.generated_at || new Date().toLocaleString()}
            </span>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {data?.categories?.map(category => (
            <div key={category.id} className="p-4">
              <button
                onClick={() => toggleCategory(category.id)}
                className="w-full text-left flex justify-between items-center hover:bg-gray-50 p-2 rounded-lg transition"
              >
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <span className="text-2xl">{expandedCategories[category.id] ? '📂' : '📁'}</span>
                  {category.name}
                </h2>
                <span className="text-gray-400">{expandedCategories[category.id] ? '▼' : '▶'}</span>
              </button>

              {expandedCategories[category.id] && (
                <div className="mt-4 space-y-4 ml-6">
                  {category.uslugi.length === 0 ? (
                    <p className="text-gray-400 text-sm">Нет услуг в этой категории</p>
                  ) : (
                    category.uslugi.map(usluga => (
                      <div key={usluga.id} className="border rounded-lg p-4 hover:shadow-md transition">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-800 text-lg">{usluga.name}</h3>
                            {usluga.description && (
                              <p className="text-sm text-gray-500 mt-1">{usluga.description}</p>
                            )}
                            <div className="mt-2 flex flex-wrap gap-3">
                              <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
                                💰 {usluga.price.toLocaleString()} BYN
                              </span>
                            </div>
                            
                            {/* Параметры услуги */}
                            {usluga.params && usluga.params.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-100">
                                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                                  ⚙️ Параметры:
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {usluga.params.map(param => (
                                    <div key={param.id} className="bg-gray-50 rounded p-2 text-sm">
                                      <span className="font-medium">{param.name}</span>
                                      {param.is_required && <span className="text-red-500 ml-1 text-xs">*</span>}
                                      <span className="text-gray-500 ml-2">({param.type})</span>
                                      {param.price > 0 && (
                                        <span className="text-indigo-600 ml-2">+{param.price.toLocaleString()} BYN</span>
                                      )}
                                      {param.options && (
                                        <div className="text-xs text-gray-400 mt-1">
                                          Варианты: {param.options.split('|').join(', ')}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {data?.categories?.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border">
          <p className="text-gray-400">Нет данных для отображения</p>
        </div>
      )}
    </div>
  );
}