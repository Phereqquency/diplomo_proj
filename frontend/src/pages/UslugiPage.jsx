import { useState, useEffect, useRef } from 'react';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';

export default function PublicPage() {
  const { admin } = useAuth();
  const [uslugi, setUslugi] = useState([]);
  const [kategorii, setKategorii] = useState([]);
  const [selectedUslugi, setSelectedUslugi] = useState([]);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ imya: '', email: '', messenger: '' });
  const [tz, setTz] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]); // файлы для прикрепления
  const [success, setSuccess] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState(null);
  const [error, setError] = useState('');
  const [filterKat, setFilterKat] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!admin) return;
    api.getUslugi().then(setUslugi);
    api.getKategorii().then(setKategorii);
  }, [admin]);

  const filteredUslugi = filterKat
    ? uslugi.filter(u => u.kategoriya_id === parseInt(filterKat))
    : uslugi;

  const toggleUslugi = (id) =>
    setSelectedUslugi(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const handleAttachFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Проверяем дубликат по имени
    if (attachedFiles.find(f => f.name === file.name)) {
      alert('Файл с таким именем уже прикреплён');
      return;
    }
    setAttachedFiles(prev => [...prev, file]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (name) => {
    setAttachedFiles(prev => prev.filter(f => f.name !== name));
  };

  const getFileIcon = (name) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (['jpg','jpeg','png','gif','webp'].includes(ext)) return '🖼️';
    if (ext === 'pdf') return '📄';
    if (['doc','docx'].includes(ext)) return '📝';
    if (['psd','fig'].includes(ext)) return '🎨';
    if (['zip','rar','7z'].includes(ext)) return '📦';
    return '📎';
  };

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);
    try {
      const zayavka = await api.createZayavka({ uslugi_ids: selectedUslugi, tz });
      const orderId = zayavka.id;

      // Загружаем прикреплённые файлы и отправляем сообщения в чат
      for (const file of attachedFiles) {
        try {
          const fileResult = await api.uploadOrderFile(orderId, file);
          if (fileResult?.id) {
            await api.sendOrderMessage(orderId, {
              message: `📎 Файл к заявке: ${file.name}`,
              file_id: fileResult.id,
            });
          }
        } catch (uploadErr) {
          console.error('Ошибка загрузки файла:', file.name, uploadErr);
        }
      }

      setCreatedOrderId(orderId);
      setSuccess(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const totalBase = uslugi
    .filter(u => selectedUslugi.includes(u.id))
    .reduce((s, u) => s + (u.tsena || 0), 0);

  const resetForm = () => {
    setSuccess(false);
    setStep(1);
    setSelectedUslugi([]);
    setForm({ imya: '', email: '', messenger: '' });
    setTz('');
    setAttachedFiles([]);
    setCreatedOrderId(null);
  };

  if (success) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-10 w-full max-w-md text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <span className="text-3xl">✅</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Заявка отправлена!</h1>
        <p className="text-gray-400 text-sm mb-1">Мы свяжемся с вами в ближайшее время.</p>
        {attachedFiles.length > 0 && (
          <p className="text-emerald-600 text-sm mb-4">
            📎 {attachedFiles.length} файл(а) прикреплено и отображается в чате заявки
          </p>
        )}
        <div className="flex flex-col gap-3 mt-4">
          <button onClick={resetForm}
            className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-all">
            Подать ещё одну заявку
          </button>
          <a href="/orders"
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2.5 rounded-xl text-sm font-medium transition-all">
            Мои заявки
          </a>
        </div>
      </div>
    </div>
  );

  if (!admin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-10 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <span className="text-3xl">🔐</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Требуется авторизация</h1>
          <p className="text-gray-400 text-sm mb-6">Для подачи заявки необходимо войти в систему или зарегистрироваться.</p>
          <div className="flex flex-col gap-3">
            <a href="/login" className="block w-full bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-xl font-medium transition-all">Войти</a>
            <a href="/register" className="block w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-all">Зарегистрироваться</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">S</div>
            <span className="font-semibold text-gray-900 text-sm">IT-Компания</span>
          </div>
          {admin ? (
            <a href="/orders" className="text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors">Мои заявки →</a>
          ) : (
            <a href="/login" className="text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors">Войти как админ →</a>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-5 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">Подать заявку</h1>
          <p className="text-gray-400 text-sm mt-1">Выберите нужные услуги и оставьте контакты</p>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-2 mb-6">
          {[{ n: 1, label: 'Выбор услуг' }, { n: 2, label: 'Ваши данные' }].map(({ n, label }, i) => (
            <div key={n} className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all
                ${step >= n ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-500'}`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs
                  ${step >= n ? 'bg-white text-gray-900' : 'bg-gray-400 text-white'}`}>{n}</span>
                {label}
              </div>
              {i < 1 && <div className="w-8 h-px bg-gray-300" />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          {step === 1 && (
            <>
              <div className="flex gap-2 flex-wrap mb-5">
                <button onClick={() => setFilterKat('')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border
                    ${!filterKat ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
                  Все
                </button>
                {kategorii.map(k => (
                  <button key={k.id} onClick={() => setFilterKat(String(k.id))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border
                      ${filterKat === String(k.id) ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
                    {k.naimenovanie}
                  </button>
                ))}
              </div>

              <div className="space-y-2 mb-5">
                {filteredUslugi.map(u => {
                  const selected = selectedUslugi.includes(u.id);
                  return (
                    <div key={u.id} onClick={() => toggleUslugi(u.id)}
                      className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all
                        ${selected ? 'border-emerald-500 bg-emerald-50' : 'border-gray-100 hover:border-gray-300 bg-white'}`}>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all
                          ${selected ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'}`}>
                          {selected && <span className="text-white text-xs">✓</span>}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 text-sm">{u.naimenovanie}</div>
                          <div className="text-gray-400 text-xs mt-0.5">{u.kategoriya}</div>
                          {u.opisanie && <div className="text-gray-400 text-xs mt-1 truncate">{u.opisanie}</div>}
                        </div>
                      </div>
                      {u.tsena > 0 && (
                        <div className="shrink-0 ml-4 text-right">
                          <div className="text-emerald-600 font-bold text-sm">${Number(u.tsena).toLocaleString('en')}</div>
                          <div className="text-gray-400 text-xs">от</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {totalBase > 0 && (
                <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-4">
                  <span className="text-gray-600 text-sm">Базовая стоимость</span>
                  <span className="font-bold text-gray-900">${totalBase.toLocaleString('en')}</span>
                </div>
              )}

              <button onClick={() => setStep(2)} disabled={selectedUslugi.length === 0}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-xl font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed text-sm">
                Далее ({selectedUslugi.length} выбрано) →
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="font-semibold text-gray-900 mb-5">Контактные данные</h2>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm mb-4 flex items-center gap-2">
                  <span>⚠</span> {error}
                </div>
              )}

              <div className="space-y-4">
                {[
                  { key: 'imya', label: 'Имя', placeholder: 'Ivan Ivanov', required: true },
                  { key: 'email', label: 'Email', placeholder: 'ivan@mail.com', type: 'email', required: true },
                  { key: 'messenger', label: 'Messenger', placeholder: 'Telegram: @username' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {f.label} {f.required && <span className="text-red-400">*</span>}
                    </label>
                    <input type={f.type || 'text'} value={form[f.key]}
                      onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                      placeholder={f.placeholder} />
                  </div>
                ))}

                {/* Техническое задание */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Техническое задание</label>
                  <textarea value={tz} onChange={e => setTz(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm resize-none"
                    rows={4} placeholder="Опишите задачу подробно..." />
                </div>

                {/* ── Прикрепление файлов ── */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    📎 Прикрепить файлы
                    <span className="text-gray-400 font-normal ml-1">(они появятся в чате заявки)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer bg-gray-50 border border-dashed border-gray-300 rounded-xl px-4 py-3 hover:border-emerald-400 hover:bg-emerald-50 transition-all text-sm text-gray-500 w-full">
                    <span className="text-lg">📁</span>
                    <span>Выбрать файл</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleAttachFile}
                      className="hidden"
                      accept=".png,.jpg,.jpeg,.psd,.fig,.pdf,.zip,.doc,.docx,.txt,.xlsx,.xls"
                    />
                  </label>

                  {/* Список прикреплённых файлов */}
                  {attachedFiles.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {attachedFiles.map(f => (
                        <div key={f.name} className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span>{getFileIcon(f.name)}</span>
                            <span className="text-sm text-gray-700 truncate">{f.name}</span>
                            <span className="text-xs text-gray-400 shrink-0">({Math.round(f.size / 1024)} KB)</span>
                          </div>
                          <button onClick={() => removeFile(f.name)}
                            className="text-red-400 hover:text-red-600 ml-2 shrink-0 text-lg leading-none">×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(1)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl text-sm font-medium hover:bg-gray-200 transition-all">
                  ← Назад
                </button>
                <button onClick={handleSubmit} disabled={!form.imya || !form.email || submitting}
                  className="flex-1 bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-30">
                  {submitting ? 'Отправка...' : 'Отправить заявку'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
