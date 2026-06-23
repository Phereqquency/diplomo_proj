import { useState, useEffect, useRef } from 'react';
import { api, getUserId, getUserRole } from '../api/api';

export function UserOrderDetailsModal({ order, onClose }) {
  const [activeTab, setActiveTab] = useState('chat');
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [files, setFiles] = useState([]);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [creatingVersion, setCreatingVersion] = useState(false);
  const [newVersion, setNewVersion] = useState({ content: '', comment: '' });
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const currentUserId = getUserId();
  const userRole = getUserRole();

  useEffect(() => {
    if (order) {
      loadMessages();
      loadFiles();
      loadVersions();
    }
  }, [order]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const loadMessages = async () => {
    try {
      const data = await api.getOrderMessages(order.id);
      console.log('Messages loaded:', data);
      setMessages(data || []);
    } catch (err) {
      console.error('Ошибка загрузки сообщений:', err);
      setMessages([]);
    }
  };

  const loadFiles = async () => {
    try {
      const data = await api.getOrderFiles(order.id);
      setFiles(data || []);
    } catch (err) {
      console.error('Ошибка загрузки файлов:', err);
      setFiles([]);
    }
  };

  const loadVersions = async () => {
    try {
      const data = await api.getTzVersions(order.id);
      setVersions(data || []);
    } catch (err) {
      console.error('Ошибка загрузки версий ТЗ:', err);
      setVersions([]);
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
      const fileResult = await api.uploadOrderFile(order.id, file);
      console.log('File upload result:', fileResult);
      
      if (!fileResult || !fileResult.id) {
        throw new Error('Не удалось получить ID файла');
      }
      
      await loadFiles();
      await api.sendOrderMessage(order.id, { 
        message: `Файл: ${file.name}`,
        file_id: fileResult.id 
      });
      await loadMessages();
      scrollToBottom();
      alert('Файл загружен и отправлен в чат');
    } catch (err) {
      console.error('Ошибка:', err);
      alert('Ошибка загрузки: ' + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const createNewVersion = async () => {
    if (!newVersion.content.trim()) {
      alert('Введите содержание ТЗ');
      return;
    }
    setCreatingVersion(true);
    try {
      await api.createTzVersion(order.id, newVersion);
      setNewVersion({ content: '', comment: '' });
      await loadVersions();
      await api.sendOrderMessage(order.id, { 
        message: `📄 Создана новая версия ТЗ #${versions.length + 1}${newVersion.comment ? ': ' + newVersion.comment : ''}` 
      });
      await loadMessages();
      alert('Новая версия создана');
    } catch (err) {
      alert('Ошибка: ' + err.message);
    } finally {
      setCreatingVersion(false);
    }
  };

  const downloadFile = (fileId, fileName) => {
    api.downloadFile(fileId, fileName);
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleString('ru-RU', {
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
      'Не срочно': 'bg-green-100 text-green-700'
    };
    return colors[srochnost] || 'bg-gray-100 text-gray-700';
  };

  const getFilePreview = (fileName) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return '🖼️';
    if (['pdf'].includes(ext)) return '📄';
    if (['doc', 'docx'].includes(ext)) return '📝';
    if (['psd', 'fig'].includes(ext)) return '🎨';
    if (['zip', 'rar', '7z'].includes(ext)) return '📦';
    return '📎';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-4 border-b bg-gray-50 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Заказ #{order.nomer}</h2>
            <p className="text-sm text-gray-500">Создан: {formatDate(order.data_podachi)}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
        </div>

        <div className="p-4 border-b bg-gray-50 flex gap-4 flex-wrap shrink-0">
          <div>
            <label className="text-xs text-gray-500 block">Статус</label>
            <span className={`inline-block px-2 py-1 rounded text-xs mt-1 ${getStatusColor(order.status)}`}>
              {order.status}
            </span>
          </div>
          <div>
            <label className="text-xs text-gray-500 block">Цена</label>
            <span className="text-sm font-semibold text-indigo-600 mt-1 block">
              {order.tsena ? `${Number(order.tsena).toLocaleString()} BYN` : '—'}
            </span>
          </div>
          <div>
            <label className="text-xs text-gray-500 block">Срочность</label>
            <span className={`inline-block px-2 py-1 rounded text-xs mt-1 ${getSrochnostColor(order.srochnost)}`}>
              {order.srochnost || 'Не указана'}
            </span>
          </div>
        </div>

        <div className="flex border-b bg-gray-50 shrink-0">
          <button onClick={() => setActiveTab('chat')} className={`px-4 py-2 text-sm font-medium transition ${activeTab === 'chat' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-600 hover:text-gray-800'}`}>💬 Чат ({messages.length})</button>
          <button onClick={() => setActiveTab('files')} className={`px-4 py-2 text-sm font-medium transition ${activeTab === 'files' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-600 hover:text-gray-800'}`}>📎 Файлы ({files.length})</button>
          <button onClick={() => setActiveTab('tz')} className={`px-4 py-2 text-sm font-medium transition ${activeTab === 'tz' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-600 hover:text-gray-800'}`}>📄 Версии ТЗ ({versions.length})</button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {activeTab === 'chat' && (
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-[300px] max-h-[400px]">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">💬 Нет сообщений. Начните обсуждение!</div>
                ) : (
                  messages.map(msg => {
                    const isCurrentUser = msg.sender_id === currentUserId;
                    const hasFile = msg.file_id && msg.file_id > 0;
                    return (
                      <div key={msg.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] rounded-lg p-3 ${isCurrentUser ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                          <p className="text-sm break-words">{msg.message}</p>
                          {hasFile && (
                            <div className="mt-2 pt-2 border-t border-opacity-20 border-gray-300">
                              <button onClick={() => downloadFile(msg.file_id, 'file')} className={`flex items-center gap-2 text-xs hover:underline ${isCurrentUser ? 'text-white' : 'text-indigo-600'}`}>
                                <span className="text-lg">📎</span>
                                <span>Скачать файл</span>
                                <span>⬇️</span>
                              </button>
                            </div>
                          )}
                          <p className={`text-xs mt-1 opacity-70`}>{formatDate(msg.created_at)}</p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
              
              <div className="border-t pt-3 flex gap-2 shrink-0">
                <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendMessage()} placeholder="Введите сообщение..." className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" disabled={loading} />
                <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg transition flex items-center gap-1">
                  📎
                  <input ref={fileInputRef} type="file" onChange={handleFileUpload} className="hidden" accept=".png,.jpg,.jpeg,.psd,.fig,.pdf,.zip,.doc,.docx" />
                </label>
                <button onClick={sendMessage} disabled={(!newMessage.trim() && !uploading) || loading} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 transition">{loading ? '...' : uploading ? '📤' : 'Отправить'}</button>
              </div>
              {uploading && <p className="text-xs text-gray-500 text-center mt-1">Загрузка файла...</p>}
            </div>
          )}

          {activeTab === 'files' && (
            <div className="space-y-3">
              <div className="mb-4">
                <label className="block w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-indigo-500 transition">
                  <span className="text-gray-500">📁 Нажмите или перетащите файл для загрузки</span>
                  <input type="file" onChange={handleFileUpload} className="hidden" accept=".png,.jpg,.jpeg,.psd,.fig,.pdf,.zip,.doc,.docx" />
                </label>
              </div>
              {files.length === 0 ? (
                <div className="text-center text-gray-400 py-8">📁 Нет загруженных файлов</div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {files.map(file => (
                    <div key={file.id} className="border rounded-lg p-3 hover:shadow-md transition">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{getFilePreview(file.file_name)}</span>
                            <p className="font-medium text-sm truncate">{file.file_name}</p>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{formatDate(file.uploaded_at)}<br />{Math.round(file.file_size / 1024)} KB</p>
                        </div>
                        <button onClick={() => downloadFile(file.id, file.file_name)} className="text-indigo-600 hover:text-indigo-800 text-sm ml-2">⬇️ Скачать</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'tz' && (
            <div className="space-y-4">
              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="font-semibold mb-2">Создать новую версию ТЗ</h3>
                <textarea value={newVersion.content} onChange={e => setNewVersion({ ...newVersion, content: e.target.value })} rows={5} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Введите техническое задание..." />
                <input type="text" value={newVersion.comment} onChange={e => setNewVersion({ ...newVersion, comment: e.target.value })} placeholder="Комментарий к версии (опционально)" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <button onClick={createNewVersion} disabled={creatingVersion || !newVersion.content.trim()} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 transition">{creatingVersion ? 'Сохранение...' : 'Сохранить версию'}</button>
              </div>
              {versions.length === 0 ? (
                <div className="text-center text-gray-400 py-8">📄 Нет версий технического задания</div>
              ) : (
                versions.map(ver => (
                  <div key={ver.id} className="border rounded-lg p-4 hover:shadow-md transition">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-semibold text-indigo-600">Версия #{ver.version_number}</h3>
                      <p className="text-xs text-gray-500">{formatDate(ver.created_at)}</p>
                    </div>
                    {ver.comment && <p className="text-sm text-gray-500 mb-2 bg-gray-50 p-2 rounded">📝 {ver.comment}</p>}
                    <p className="text-gray-700 whitespace-pre-wrap text-sm">{ver.content}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}