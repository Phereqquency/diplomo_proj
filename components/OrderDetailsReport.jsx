import { useState, useEffect } from 'react';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import { api } from '../api/api';

export function OrderDetailsReport() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getZayavki();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Ошибка загрузки заказов:', err);
      setError('Ошибка загрузки заказов: ' + err.message);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const loadOrderDetails = async (orderId) => {
    setSelectedOrderId(orderId);
    setError(null);
    try {
      const data = await api.getOrderDetailsReport(orderId);
      if (data && data.zayavka) {
        setOrderDetails(data);
      } else {
        setError('Некорректные данные заказа');
        setOrderDetails(null);
      }
    } catch (err) {
      console.error('Ошибка загрузки деталей заказа:', err);
      setError('Ошибка загрузки деталей заказа: ' + err.message);
      setOrderDetails(null);
    }
  };

  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleString('ru-RU', {
      timeZone: 'Europe/Minsk',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  // Вычисляем базовую сумму из услуг (до ручного изменения)
  const getCalculatedSum = (details) => {
    if (!details?.uslugi) return 0;
    return details.uslugi.reduce((sum, u) => {
      const paramsSum = (u.params || []).reduce((s, p) => s + (p.price || 0), 0);
      return sum + (u.price || 0) + paramsSum;
    }, 0);
  };

  const exportToWord = async () => {
    if (!orderDetails) return;

    const finalSum = orderDetails.total_sum || 0;
    const calculatedSum = getCalculatedSum(orderDetails);
    const isPriceModified = Math.abs(finalSum - calculatedSum) > 0.01;

    const children = [
      new Paragraph({
        text: 'Детализация заказа',
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
      new Paragraph({
        text: `Заказ № ${orderDetails.zayavka.nomer}`,
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
      }),

      new Paragraph({
        text: '1. Информация о заказе',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),
      new Table({
        rows: [
          new TableRow({ children: [
            new TableCell({ children: [new Paragraph({ text: 'Поле', bold: true })] }),
            new TableCell({ children: [new Paragraph({ text: 'Значение', bold: true })] }),
          ] }),
          new TableRow({ children: [
            new TableCell({ children: [new Paragraph({ text: 'Номер заказа' })] }),
            new TableCell({ children: [new Paragraph({ text: orderDetails.zayavka.nomer || '' })] }),
          ] }),
          new TableRow({ children: [
            new TableCell({ children: [new Paragraph({ text: 'Статус' })] }),
            new TableCell({ children: [new Paragraph({ text: orderDetails.zayavka.status || '' })] }),
          ] }),
          new TableRow({ children: [
            new TableCell({ children: [new Paragraph({ text: 'Срочность' })] }),
            new TableCell({ children: [new Paragraph({ text: orderDetails.zayavka.srochnost || 'Не указана' })] }),
          ] }),
          new TableRow({ children: [
            new TableCell({ children: [new Paragraph({ text: 'Дата создания' })] }),
            new TableCell({ children: [new Paragraph({ text: formatDate(orderDetails.zayavka.data_podachi) })] }),
          ] }),
          new TableRow({ children: [
            new TableCell({ children: [new Paragraph({ text: 'Ответственный разработчик' })] }),
            new TableCell({ children: [new Paragraph({ text: orderDetails.assigned_manager_name || 'Не назначен' })] }),
          ] }),
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
      }),

      new Paragraph({
        text: '2. Информация о клиенте',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),
      new Table({
        rows: [
          new TableRow({ children: [
            new TableCell({ children: [new Paragraph({ text: 'Поле', bold: true })] }),
            new TableCell({ children: [new Paragraph({ text: 'Значение', bold: true })] }),
          ] }),
          new TableRow({ children: [
            new TableCell({ children: [new Paragraph({ text: 'Имя' })] }),
            new TableCell({ children: [new Paragraph({ text: orderDetails.polzovatel?.imya || '' })] }),
          ] }),
          new TableRow({ children: [
            new TableCell({ children: [new Paragraph({ text: 'Email' })] }),
            new TableCell({ children: [new Paragraph({ text: orderDetails.polzovatel?.email || '' })] }),
          ] }),
          new TableRow({ children: [
            new TableCell({ children: [new Paragraph({ text: 'Мессенджер' })] }),
            new TableCell({ children: [new Paragraph({ text: orderDetails.polzovatel?.messenger || '—' })] }),
          ] }),
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
      }),

      new Paragraph({
        text: '3. Техническое задание',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),
      new Paragraph({
        text: orderDetails.zayavka.tz || 'Техническое задание не указано',
        spacing: { after: 200 },
      }),

      new Paragraph({
        text: '4. Перечень услуг',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),
    ];

    const servicesRows = [
      new TableRow({ children: [
        new TableCell({ children: [new Paragraph({ text: '№', bold: true })] }),
        new TableCell({ children: [new Paragraph({ text: 'Наименование', bold: true })] }),
        new TableCell({ children: [new Paragraph({ text: 'Базовая цена, BYN', bold: true })] }),
        new TableCell({ children: [new Paragraph({ text: 'Параметры', bold: true })] }),
      ] }),
    ];

    if (orderDetails.uslugi && orderDetails.uslugi.length > 0) {
      orderDetails.uslugi.forEach((usluga, idx) => {
        const paramsText = usluga.params && usluga.params.length > 0
          ? usluga.params.map(p => `${p.name}: ${p.value}${p.price > 0 ? ` (+${p.price} BYN)` : ''}`).join('\n')
          : '—';
        servicesRows.push(
          new TableRow({ children: [
            new TableCell({ children: [new Paragraph({ text: String(idx + 1) })] }),
            new TableCell({ children: [new Paragraph({ text: usluga.name || '' })] }),
            new TableCell({ children: [new Paragraph({ text: (usluga.price || 0).toLocaleString() })] }),
            new TableCell({ children: [new Paragraph({ text: paramsText })] }),
          ] })
        );
      });
    }

    children.push(
      new Table({ rows: servicesRows, width: { size: 100, type: WidthType.PERCENTAGE } })
    );

    // Итоговая цена — всегда согласованная (из z.tsena)
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Итоговая сумма: ${finalSum.toLocaleString()} BYN`,
            bold: true,
            size: 28,
          }),
        ],
        alignment: AlignmentType.RIGHT,
        spacing: { before: 200, after: isPriceModified ? 60 : 100 },
      })
    );

    // Если цена была изменена вручную — добавляем пояснение
    if (isPriceModified) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `(базовая стоимость услуг: ${calculatedSum.toLocaleString()} BYN — скорректирована администратором)`,
              italics: true,
              size: 20,
              color: '666666',
            }),
          ],
          alignment: AlignmentType.RIGHT,
          spacing: { after: 100 },
        })
      );
    }

    const doc = new Document({ sections: [{ children }] });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `detailing_order_${orderDetails.zayavka.nomer}.docx`);
  };

  const filteredOrders = orders.filter(order =>
    order.nomer?.toLowerCase().includes(search.toLowerCase()) ||
    order.polzovatel?.imya?.toLowerCase().includes(search.toLowerCase()) ||
    order.polzovatel?.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="text-gray-500 mt-4">Загрузка списка заказов...</p>
      </div>
    );
  }

  if (error && orders.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 text-lg">Ошибка</div>
        <p className="text-gray-500 mt-2">{error}</p>
        <button onClick={loadOrders} className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg">
          Повторить
        </button>
      </div>
    );
  }

  const finalSum = orderDetails ? (orderDetails.total_sum || 0) : 0;
  const calculatedSum = getCalculatedSum(orderDetails);
  const isPriceModified = orderDetails && Math.abs(finalSum - calculatedSum) > 0.01;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Детализация заказа по клиенту</h1>
          <p className="text-sm text-gray-500 mt-1">Подробная информация по выбранному заказу</p>
        </div>
        {orderDetails && (
          <button
            onClick={exportToWord}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700 flex items-center gap-2"
          >
            📥 Экспорт в Word
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Список заказов */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
            {filteredOrders.length === 0 ? (
              <div className="p-4 text-center text-gray-400">Заказы не найдены</div>
            ) : (
              filteredOrders.map(order => (
                <button
                  key={order.id}
                  onClick={() => loadOrderDetails(order.id)}
                  className={`w-full text-left p-4 hover:bg-gray-50 transition ${
                    selectedOrderId === order.id ? 'bg-indigo-50 border-l-4 border-indigo-600' : ''
                  }`}
                >
                  <div className="font-semibold">Заказ #{order.nomer}</div>
                  <div className="text-sm text-gray-500">{order.polzovatel?.imya}</div>
                  <div className="text-xs text-gray-400 mt-1">{order.status}</div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Детали выбранного заказа */}
        <div className="lg:col-span-2">
          {!orderDetails ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <p className="text-gray-400">Выберите заказ для просмотра деталей</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b bg-gray-50">
                <h2 className="text-lg font-bold">Заказ #{orderDetails.zayavka?.nomer}</h2>
                <p className="text-sm text-gray-500">Статус: {orderDetails.zayavka?.status}</p>
              </div>

              <div className="p-4 space-y-4">
                {/* Клиент */}
                <div className="bg-gray-50 p-3 rounded-lg space-y-1 text-sm">
                  <p><strong>Клиент:</strong> {orderDetails.polzovatel?.imya}</p>
                  <p><strong>Email:</strong> {orderDetails.polzovatel?.email}</p>
                  <p><strong>Срочность:</strong> {orderDetails.zayavka?.srochnost || 'Не указана'}</p>
                  <p><strong>Разработчик:</strong> {orderDetails.assigned_manager_name || 'Не назначен'}</p>

                  {/* Итоговая цена — всегда согласованная */}
                  <div className="pt-2 mt-2 border-t border-gray-200">
                    <p className="font-bold text-base">
                      Итоговая сумма:{' '}
                      <span className="text-indigo-600">{finalSum.toLocaleString()} BYN</span>
                    </p>
                    {isPriceModified && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Базовая стоимость услуг: {calculatedSum.toLocaleString()} BYN
                        {' '}— <span className="text-amber-600 font-medium">скорректирована администратором</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* ТЗ */}
                {orderDetails.zayavka?.tz && (
                  <div className="border rounded-lg p-3">
                    <p className="font-medium mb-1">📝 Техническое задание:</p>
                    <p className="text-sm text-gray-600">{orderDetails.zayavka.tz}</p>
                  </div>
                )}

                {/* Услуги */}
                {orderDetails.uslugi && orderDetails.uslugi.length > 0 && (
                  <div>
                    <p className="font-medium mb-2">🛠️ Услуги (базовые цены):</p>
                    <div className="space-y-2">
                      {orderDetails.uslugi.map((usluga, idx) => (
                        <div key={idx} className="border rounded-lg p-3 text-sm">
                          <p>
                            <strong>{usluga.name}</strong>
                            <span className="text-gray-500 ml-2">— {(usluga.price || 0).toLocaleString()} BYN</span>
                          </p>
                          {usluga.params && usluga.params.length > 0 && (
                            <div className="mt-1 pl-3 text-xs text-gray-500 space-y-0.5">
                              {usluga.params.map((p, pIdx) => (
                                <p key={pIdx}>• {p.name}: {p.value}{p.price > 0 ? ` (+${p.price} BYN)` : ''}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}