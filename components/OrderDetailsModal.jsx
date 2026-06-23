import { useState, useEffect, useRef } from 'react';
import { api, getUserRole, getUserId, isAdmin } from '../api/api';
import { AssignManagerModal } from './AssignManagerModal';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

export function OrderDetailsModal({ order, onClose, onUpdate }) {
  const [activeTab, setActiveTab] = useState('info');
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [files, setFiles] = useState([]);
  const [versions, setVersions] = useState([]);
  const [newVersion, setNewVersion] = useState({ content: '', comment: '' });
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(order?.status || '');
  const [price, setPrice] = useState(order?.tsena || '');
  const [uslugi, setUslugi] = useState([]);
  const [assignedManager, setAssignedManager] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [acts, setActs] = useState([]);
  const [actsLoading, setActsLoading] = useState(false);
  const [creatingAct, setCreatingAct] = useState(false);
  const [selectedAct, setSelectedAct] = useState(null);
  const messagesEndRef = useRef(null);
  const userRole = getUserRole();
  const currentUserId = getUserId();
  const isAdminOnly = isAdmin();
  
  // Права доступа
  const canEdit = userRole === 'admin' || userRole === 'manager';
  const canUploadFiles = true;
  const canManageTZ = userRole === 'admin' || userRole === 'manager';
  const canCreateAct = userRole === 'admin' || userRole === 'manager';
  const canAssignManager = userRole === 'admin';

  if (!order) return null;

  useEffect(() => {
    if (order && order.id) {
      loadFullOrderData();
      loadMessages();
      loadFiles();
      loadVersions();
      loadActs();
    }
  }, [order]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadFullOrderData = async () => {
    try {
      let data;
      if (userRole === 'admin' || userRole === 'manager') {
        data = await api.getAdminZayavka(order.id);
      } else {
        data = await api.getZayavka(order.id);
      }
      setUslugi(data.uslugi || []);
      setAssignedManager(data.assigned_manager || null);
      setStatus(data.status);
      setPrice(data.tsena || '');
    } catch (err) {
      console.error('Ошибка загрузки данных заказа:', err);
    }
  };

  const loadMessages = async () => {
    try {
      const data = await api.getOrderMessages(order.id);
      setMessages(data || []);
    } catch (err) {
      console.error('Ошибка загрузки сообщений:', err);
    }
  };

  const loadFiles = async () => {
    try {
      const data = await api.getOrderFiles(order.id);
      setFiles(data || []);
    } catch (err) {
      console.error('Ошибка загрузки файлов:', err);
    }
  };

  const loadVersions = async () => {
    try {
      const data = await api.getTzVersions(order.id);
      setVersions(data || []);
    } catch (err) {
      console.error('Ошибка загрузки версий:', err);
    }
  };

  const loadActs = async () => {
  setActsLoading(true);
  try {
    let data;
    if (userRole === 'admin' || userRole === 'manager') {
      data = await api.getActs(order.id);
    } else {
      data = await api.getActsForUser(order.id);
    }
    console.log('Загруженные акты:', data); // Для отладки
    setActs(data || []);
  } catch (err) {
    console.error('Ошибка загрузки актов:', err);
  } finally {
    setActsLoading(false);
  }
};

  const createAct = async () => {
    setCreatingAct(true);
    try {
      await api.createAct(order.id);
      await loadActs();
      await loadMessages();
      alert('Акт успешно создан');
    } catch (err) {
      alert('Ошибка создания акта: ' + err.message);
    } finally {
      setCreatingAct(false);
    }
  };

  const updateActStatus = async (actId, newStatus) => {
    try {
      await api.updateActStatus(actId, newStatus);
      await loadActs();
      await loadMessages();
      alert('Статус акта обновлён');
    } catch (err) {
      alert('Ошибка: ' + err.message);
    }
  };

  const viewAct = async (actId) => {
    try {
      const data = await api.getAct(actId);
      setSelectedAct(data);
    } catch (err) {
      alert('Ошибка загрузки акта: ' + err.message);
    }
  };

  const deleteAct = async (actId) => {
    if (!confirm('Удалить акт?')) return;
    try {
      await api.deleteAct(actId);
      await loadActs();
      alert('Акт удален');
    } catch (err) {
      alert('Ошибка удаления: ' + err.message);
    }
  };

  const downloadActDocx = async (actId, actNumber) => {
    try {
      const data = await api.getAct(actId);
      const act = data.act;
      const zayavka = data.zayavka;
      const polzovatel = data.polzovatel;
      const items = data.items || [];
      const totalSum = data.total_sum || 0;

      const rows = [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '№', bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Наименование работ, услуг', bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Кол-во', bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Цена, BYN', bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Сумма, BYN', bold: true })] })] }),
          ],
        }),
        ...items.map((item, i) => new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: String(i + 1) })] }),
            new TableCell({ children: [new Paragraph({ text: item.usluga_name + (item.opisanie ? ' — ' + item.opisanie : '') })] }),
            new TableCell({ children: [new Paragraph({ text: String(item.quantity || 1) })] }),
            new TableCell({ children: [new Paragraph({ text: Number(item.price).toFixed(2) })] }),
            new TableCell({ children: [new Paragraph({ text: Number(item.total).toFixed(2) })] }),
          ],
        })),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Итого:', bold: true })] })], columnSpan: 4 }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: totalSum.toFixed(2) + ' BYN', bold: true })] })] }),
          ],
        }),
      ];

      const doc = new Document({
        sections: [{
          children: [
            new Paragraph({ text: act.act_number, heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
            new Paragraph({ text: 'Акт приема-передачи выполненных работ (оказанных услуг)', alignment: AlignmentType.CENTER }),
            new Paragraph({ text: `по Заказу № ${zayavka?.nomer || ''}`, alignment: AlignmentType.CENTER }),
            new Paragraph({ text: '' }),
            new Paragraph({ children: [new TextRun({ text: 'Исполнитель: ', bold: true }), new TextRun('ООО "САРП"')] }),
            new Paragraph({ children: [new TextRun({ text: 'Заказчик: ', bold: true }), new TextRun(`${polzovatel?.imya || ''} (${polzovatel?.email || ''})`) ] }),
            new Paragraph({ text: '' }),
            new Paragraph({ children: [new TextRun({ text: 'Перечень оказанных услуг:', bold: true })] }),
            new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }),
            new Paragraph({ text: '' }),
            new Paragraph({ children: [new TextRun({ text: `Всего оказано услуг на сумму: ${totalSum.toFixed(2)} рублей.`, bold: true })] }),
            new Paragraph({ text: '' }),
            new Paragraph({ text: 'Исполнитель: _________________                    Заказчик: _________________' }),
            new Paragraph({ text: '' }),
            new Paragraph({ text: 'Акт составлен в двух экземплярах: по одному для каждой стороны.', alignment: AlignmentType.CENTER }),
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `act_${actNumber}.docx`);
    } catch (err) {
      alert('Ошибка скачивания акта: ' + err.message);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    setLoading(true);
    try {
      await api.sendOrderMessage(order.id, { message: newMessage });
      setNewMessage('');
      await loadMessages();
      scrollToBottom();
    } catch (err) {
      alert('Ошибка отправки: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const result = await api.uploadOrderFile(order.id, file);
      await loadFiles();
      await api.sendOrderMessage(order.id, { 
        message: `📎 Загружен файл: ${file.name}`,
        file_id: result.id 
      });
      await loadMessages();
      alert('Файл загружен');
    } catch (err) {
      alert('Ошибка загрузки: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const createNewVersion = async () => {
    if (!newVersion.content.trim()) {
      alert('Введите содержание ТЗ');
      return;
    }
    setLoading(true);
    try {
      await api.createTzVersion(order.id, newVersion);
      setNewVersion({ content: '', comment: '' });
      await loadVersions();
      await api.sendOrderMessage(order.id, { 
        message: `📄 Создана новая версия ТЗ #${versions.length + 1}${newVersion.comment ? ': ' + newVersion.comment : ''}` 
      });
      await loadMessages();
      alert('Версия создана');
    } catch (err) {
      alert('Ошибка: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = (fileId, fileName) => {
    api.downloadFile(fileId);
  };

  const updateOrderStatus = async (newStatus) => {
    try {
      await api.updateStatus(order.id, newStatus);
      setStatus(newStatus);
      await api.sendOrderMessage(order.id, { 
        message: `🔄 Статус заказа изменён на: ${newStatus}` 
      });
      await loadMessages();
      alert('Статус обновлён');
    } catch (err) {
      alert('Ошибка: ' + err.message);
    }
  };

  const updateOrderPrice = async () => {
    try {
      await api.updateTsena(order.id, parseFloat(price));
      await api.sendOrderMessage(order.id, { 
        message: `💰 Цена заказа изменена на: ${price} BYN` 
      });
      await loadMessages();
      alert('Цена обновлена');
    } catch (err) {
      alert('Ошибка: ' + err.message);
    }
  };

  const handleManagerAssigned = async () => {
    await loadFullOrderData();
    await loadMessages();
  };

  const formatDate = (date) => {
    if (!date) return '—';
    const d = new Date(date);
    d.setHours(d.getHours() - 3);
    return d.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      'Новая': 'bg-yellow-100 text-yellow-800',
      'В обработке': 'bg-blue-100 text-blue-800',
      'Завершена': 'bg-green-100 text-green-800',
      'Отклонена': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getSrochnostColor = (srochnost) => {
    const colors = {
      'Срочно': 'bg-red-100 text-red-700',
      'Средняя срочность': 'bg-yellow-100 text-yellow-700',
      'Не срочно': 'bg-green-100 text-green-700'
    };
    return colors[srochnost] || 'bg-gray-100 text-gray-700';
  };

  const getActStatusColor = (status) => {
    const colors = {
      'черновик': 'bg-yellow-100 text-yellow-800',
      'подписан': 'bg-green-100 text-green-800',
      'отправлен': 'bg-blue-100 text-blue-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getActStatusName = (status) => {
    const names = {
      'черновик': 'Черновик',
      'подписан': 'Подписан',
      'отправлен': 'Отправлен'
    };
    return names[status] || status;
  };

  const totalPrice = uslugi.reduce((sum, u) => {
    let uslugaSum = u.tsena || 0;
    if (u.params) {
      uslugaSum += u.params.reduce((pSum, p) => pSum + (p.param_price || 0), 0);
    }
    return sum + uslugaSum;
  }, 0);

  const handleModalClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={handleModalClick}
      >
        {/* Заголовок */}
        <div className="flex justify-between items-center p-4 border-b bg-gray-50 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Заказ #{order.nomer}</h2>
            <p className="text-sm text-gray-500">
              Клиент: {order.polzovatel?.imya} - {order.polzovatel?.email}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Создан: {formatDate(order.data_podachi)}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 text-2xl w-8 h-8 flex items-center justify-center rounded hover:bg-gray-200"
          >
            ✕
          </button>
        </div>

        {/* Информация о заказе */}
        <div className="p-4 border-b bg-gray-50 flex gap-4 flex-wrap shrink-0">
          <div>
            <label className="text-xs text-gray-500 block">Статус</label>
            {canEdit ? (
              <select
                value={status}
                onChange={(e) => updateOrderStatus(e.target.value)}
                className="border rounded px-2 py-1 text-sm mt-1"
              >
                <option value="Новая">Новая</option>
                <option value="В обработке">В обработке</option>
                <option value="Завершена">Завершена</option>
                <option value="Отклонена">Отклонена</option>
              </select>
            ) : (
              <span className={`inline-block px-2 py-1 rounded text-xs mt-1 ${getStatusColor(status)}`}>
                {status}
              </span>
            )}
          </div>
          <div>
            <label className="text-xs text-gray-500 block">Цена</label>
            {canEdit ? (
              <div className="flex gap-1 mt-1">
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="border rounded px-2 py-1 text-sm w-32"
                />
                <button
                  onClick={updateOrderPrice}
                  className="bg-indigo-600 text-white px-2 py-1 rounded text-xs hover:bg-indigo-700"
                >
                  Сохранить
                </button>
              </div>
            ) : (
              <span className="text-sm font-semibold text-indigo-600 mt-1 block">
                {price ? `${Number(price).toLocaleString()} BYN` : '—'}
              </span>
            )}
          </div>
          <div>
            <label className="text-xs text-gray-500 block">Срочность</label>
            <span className={`inline-block px-2 py-1 rounded text-xs mt-1 ${getSrochnostColor(order.srochnost)}`}>
              {order.srochnost || 'Не указана'}
            </span>
          </div>
          <div>
            <label className="text-xs text-gray-500 block">Общая стоимость</label>
            <span className="text-sm font-bold text-indigo-600 mt-1 block">
              {totalPrice.toLocaleString()} BYN
            </span>
          </div>
          
          {canAssignManager && (
            <div className="border-l pl-3 ml-2">
              <label className="text-xs text-gray-500 block">Ответственный разработчик</label>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-medium">
                  {assignedManager ? assignedManager.imya : 'Не назначен'}
                </span>
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded hover:bg-purple-200"
                >
                  {assignedManager ? 'Сменить' : 'Назначить'}
                </button>
              </div>
            </div>
          )}
          
          {!canAssignManager && assignedManager && (
            <div className="border-l pl-3 ml-2">
              <label className="text-xs text-gray-500 block">Ответственный разработчик</label>
              <span className="text-sm font-medium mt-1 block">{assignedManager.imya}</span>
            </div>
          )}
        </div>

        {/* Вкладки */}
        <div className="flex border-b bg-gray-50 shrink-0 overflow-x-auto">
          <button onClick={() => setActiveTab('info')} className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition ${activeTab === 'info' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-600 hover:text-gray-800'}`}>📋 Информация</button>
          <button onClick={() => setActiveTab('chat')} className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition ${activeTab === 'chat' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-600 hover:text-gray-800'}`}>💬 Чат ({messages.length})</button>
          <button onClick={() => setActiveTab('files')} className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition ${activeTab === 'files' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-600 hover:text-gray-800'}`}>📎 Файлы ({files.length})</button>
          <button onClick={() => setActiveTab('tz')} className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition ${activeTab === 'tz' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-600 hover:text-gray-800'}`}>📄 Версии ТЗ ({versions.length})</button>
          <button onClick={() => setActiveTab('acts')} className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition ${activeTab === 'acts' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-600 hover:text-gray-800'}`}>📄 Акты ({acts.length})</button>
        </div>

        {/* Содержимое вкладок */}
        <div className="flex-1 overflow-auto p-4">
          {activeTab === 'info' && (
            <div className="space-y-6">
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3 text-gray-800">📝 Техническое задание</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-wrap">{order.tz || 'Техническое задание не указано'}</p>
                </div>
                <p className="text-xs text-gray-400 mt-2">Создано при оформлении заказа</p>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3 text-gray-800">🛠️ Выбранные услуги</h3>
                {uslugi.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg">Нет выбранных услуг</div>
                ) : (
                  <div className="space-y-4">
                    {uslugi.map(usluga => (
                      <div key={usluga.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-800">{usluga.naimenovanie}</h4>
                            {usluga.opisanie && <p className="text-sm text-gray-500 mt-1">{usluga.opisanie}</p>}
                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="text-xs text-indigo-600 bg-indigo-100 px-2 py-1 rounded-full">{usluga.kategoriya || 'Без категории'}</span>
                              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">{usluga.tsena?.toLocaleString()} BYN</span>
                            </div>
                            {usluga.params && usluga.params.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <h5 className="text-sm font-medium text-gray-700 mb-2">📋 Параметры:</h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {usluga.params.map((param, idx) => (
                                    <div key={idx} className="bg-white rounded p-2 text-sm">
                                      <span className="font-medium text-gray-600">Параметр {idx + 1}:</span>{' '}
                                      <span className="text-gray-800">{param.param_value}</span>
                                      {param.param_price > 0 && <span className="text-indigo-600 ml-1">(+{param.param_price.toLocaleString()} BYN)</span>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="border-t pt-4 mt-2 text-right">
                      <span className="text-base text-gray-600 mr-2">Итого:</span>
                      <span className="text-2xl font-bold text-indigo-600">{totalPrice.toLocaleString()} BYN</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto space-y-3 mb-4" style={{ maxHeight: '400px' }}>
                {messages.length === 0 ? <div className="text-center text-gray-400 py-8">💬 Нет сообщений</div> : messages.map(msg => {
                  const isCurrentUser = msg.sender_id === currentUserId;
                  return (
                    <div key={msg.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-lg p-3 ${isCurrentUser ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                        <p className="text-sm break-words">{msg.message}</p>
                        {msg.file_name && <button onClick={() => downloadFile(msg.file_id, msg.file_name)} className={`text-xs mt-2 underline ${isCurrentUser ? 'text-white' : 'text-indigo-600'}`}>📎 {msg.file_name}</button>}
                        <p className={`text-xs mt-1 opacity-70`}>{formatDate(msg.created_at)}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
              <div className="border-t pt-3 flex gap-2 shrink-0">
                <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendMessage()} placeholder="Введите сообщение..." className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" disabled={loading} />
                <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg flex items-center">📎<input type="file" onChange={handleFileUpload} className="hidden" accept=".png,.jpg,.jpeg,.psd,.fig,.pdf,.zip" /></label>
                <button onClick={sendMessage} disabled={!newMessage.trim() || loading} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">{loading ? '...' : 'Отправить'}</button>
              </div>
              {uploading && <p className="text-sm text-gray-500 mt-2 text-center">📤 Загрузка файла...</p>}
            </div>
          )}

          {activeTab === 'files' && (
            <div>
              <label className="block w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-indigo-500 mb-4">📁 Нажмите для загрузки файла<input type="file" onChange={handleFileUpload} className="hidden" /></label>
              {files.length === 0 ? <div className="text-center text-gray-400 py-8">📁 Нет файлов</div> : files.map(file => (
                <div key={file.id} className="border rounded-lg p-3 flex justify-between items-center">
                  <div><p className="font-medium">{file.file_name}</p><p className="text-xs text-gray-500">{formatDate(file.uploaded_at)}</p></div>
                  <button onClick={() => downloadFile(file.id, file.file_name)} className="text-indigo-600 hover:text-indigo-800">⬇️ Скачать</button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'tz' && (
            <div>
              {canManageTZ && (
                <div className="border rounded-lg p-4 bg-gray-50 mb-4">
                  <h3 className="font-semibold mb-2">Создать новую версию ТЗ</h3>
                  <textarea value={newVersion.content} onChange={e => setNewVersion({ ...newVersion, content: e.target.value })} rows={4} className="w-full border rounded-lg px-3 py-2 text-sm mb-2" placeholder="Введите техническое задание..." />
                  <input type="text" value={newVersion.comment} onChange={e => setNewVersion({ ...newVersion, comment: e.target.value })} placeholder="Комментарий к версии" className="w-full border rounded-lg px-3 py-2 text-sm mb-2" />
                  <button onClick={createNewVersion} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm">Сохранить версию</button>
                </div>
              )}
              {versions.length === 0 ? <div className="text-center text-gray-400 py-8">📄 Нет версий ТЗ</div> : versions.map(ver => (
                <div key={ver.id} className="border rounded-lg p-4 mb-3">
                  <div className="flex justify-between items-center"><h3 className="font-semibold text-indigo-600">Версия #{ver.version_number}</h3><p className="text-xs text-gray-500">{formatDate(ver.created_at)}</p></div>
                  {ver.comment && <p className="text-sm text-gray-500 mt-1">📝 {ver.comment}</p>}
                  <p className="text-gray-700 mt-2 whitespace-pre-wrap">{ver.content}</p>
                </div>
              ))}
            </div>
          )}

          {/* Вкладка Акты с возможностью изменения статуса */}
          {activeTab === 'acts' && (
            <div>
              {canCreateAct && (
                <button onClick={createAct} disabled={creatingAct} className="mb-4 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">
                  {creatingAct ? 'Создание...' : '+ Создать акт'}
                </button>
              )}
              {actsLoading ? (
                <div className="text-center py-8">Загрузка...</div>
              ) : acts.length === 0 ? (
                <div className="text-center py-8 text-gray-400">Нет созданных актов</div>
              ) : (
                <div className="space-y-3">
                  {acts.map(act => (
                    <div key={act.id} className="border rounded-lg p-4 hover:shadow-md transition">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-gray-800">{act.act_number}</h3>
                          <p className="text-sm text-gray-500">{formatDate(act.act_date)}</p>
                          {/* Выбор статуса - только для админа/менеджера */}
                          {canEdit && act.status !== 'отправлен' && (
                            <div className="mt-2">
                              <label className="text-xs text-gray-500 mr-2">Статус:</label>
                              <select
                                value={act.status}
                                onChange={(e) => updateActStatus(act.id, e.target.value)}
                                className="text-sm border border-gray-300 rounded px-2 py-1"
                              >
                                <option value="черновик">📝 Черновик</option>
                                <option value="подписан">✅ Подписан</option>
                                <option value="отправлен">📧 Отправлен</option>
                              </select>
                            </div>
                          )}
                          {(!canEdit || act.status === 'отправлен') && (
                            <span className={`inline-block px-2 py-1 rounded text-xs mt-2 ${getActStatusColor(act.status)}`}>
                              {getActStatusName(act.status)}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => viewAct(act.id)} className="text-indigo-600 hover:text-indigo-800 text-sm">📄 Просмотр</button>
                          {act.status === 'подписан' && (
                            <button onClick={() => downloadActDocx(act.id, act.act_number)} className="text-green-600 hover:text-green-800 text-sm">⬇️ Скачать DOCX</button>
                          )}
                          {canEdit && act.status === 'черновик' && (
                            <button onClick={() => deleteAct(act.id)} className="text-red-600 hover:text-red-800 text-sm">🗑️ Удалить</button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Модальное окно просмотра акта */}
      {selectedAct && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4" onClick={() => setSelectedAct(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h2 className="text-xl font-bold">Акт #{selectedAct.act?.act_number || selectedAct.act_number}</h2>
              <button onClick={() => setSelectedAct(null)} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
            </div>
            <div className="text-center mb-6">
              <div className="flex justify-between text-sm text-gray-500 mb-2"><div>Утверждаю: _________________</div><div>Дата: {selectedAct.act?.act_date ? new Date(selectedAct.act.act_date).toLocaleDateString('ru-RU') : ''}</div></div>
              <div className="text-lg font-bold">АКТ приема-передачи выполненных работ (оказанных услуг)</div>
              <div>по Заказу № {selectedAct.zayavka?.nomer || ''}</div>
              <div className="text-sm text-gray-600 mt-2">г. Минск, {selectedAct.act?.act_date ? new Date(selectedAct.act.act_date).toLocaleDateString('ru-RU') : ''}</div>
            </div>
            <div className="mb-3"><strong>Исполнитель:</strong> ООО "САРП"</div>
            <div className="mb-3"><strong>Заказчик:</strong> {selectedAct.polzovatel?.imya} ({selectedAct.polzovatel?.email})</div>
            {selectedAct.polzovatel?.messenger && <div className="mb-4"><strong>Мессенджер заказчика:</strong> {selectedAct.polzovatel?.messenger}</div>}
            <h3 className="font-semibold mt-4 mb-2">1. Перечень оказанных услуг:</h3>
            <table className="w-full border-collapse mb-4">
              <thead><tr className="bg-gray-100"><th className="border p-2 text-center w-12">№</th><th className="border p-2 text-left">Наименование</th><th className="border p-2 text-center w-20">Кол-во</th><th className="border p-2 text-right w-28">Цена, BYN</th><th className="border p-2 text-right w-32">Сумма, BYN</th></tr></thead>
              <tbody>
                {selectedAct.items?.map((item, idx) => (
                  <tr key={idx}><td className="border p-2 text-center">{idx + 1}</td><td className="border p-2">{item.usluga_name}</td><td className="border p-2 text-center">{item.quantity}</td><td className="border p-2 text-right">{item.price?.toLocaleString()}</td><td className="border p-2 text-right">{item.total?.toLocaleString()}</td></tr>
                ))}
                <tr className="bg-gray-50 font-bold"><td colSpan="4" className="border p-2 text-right">Итого:</td><td className="border p-2 text-right">{selectedAct.total_sum?.toLocaleString()} BYN</td></tr>
              </tbody>
            </table>
            <h3 className="font-semibold mt-4 mb-2">2. Детальная информация по услугам:</h3>
            <table className="w-full border-collapse mb-4">
              <thead><tr className="bg-gray-100"><th className="border p-2 text-center w-12">№</th><th className="border p-2 text-left">Наименование</th><th className="border p-2 text-right w-28">Цена, BYN</th><th className="border p-2 text-left">Параметры</th></tr></thead>
              <tbody>
                {selectedAct.uslugi?.map((usluga, idx) => (
                  <tr key={idx}><td className="border p-2 text-center">{idx + 1}</td><td className="border p-2">{usluga.name}</td><td className="border p-2 text-right">{usluga.price?.toLocaleString()}</td><td className="border p-2">{usluga.params || "—"}</td></tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3"><strong>Всего оказано услуг на сумму: {selectedAct.total_sum?.toLocaleString()} рублей.</strong></p>
            <div className="flex justify-between mt-8"><div className="w-2/5"><p><strong>Исполнитель:</strong></p><div className="mt-8 pt-2 border-t border-black w-4/5"></div><p className="mt-2">_________________ /__________/</p><p>М.П.</p></div><div className="w-2/5"><p><strong>Заказчик:</strong></p><div className="mt-8 pt-2 border-t border-black w-4/5"></div><p className="mt-2">_________________ /__________/</p></div></div>
            <div className="text-center text-xs text-gray-400 mt-6">Акт составлен в двух экземплярах: по одному для каждой стороны.</div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button onClick={() => api.downloadAct(selectedAct.act?.id || selectedAct.id)} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">⬇️ Скачать HTML</button>
              <button onClick={() => setSelectedAct(null)} className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-400">Закрыть</button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно назначения менеджера */}
      {showAssignModal && (
        <AssignManagerModal
          zayavkaId={order.id}
          currentManagerId={assignedManager?.id}
          onClose={() => setShowAssignModal(false)}
          onAssigned={handleManagerAssigned}
        />
      )}
    </div>
  );
}