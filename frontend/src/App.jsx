import { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { api, getUserRole, isAdmin, getUserId } from '../../api/api';
import { UslugiPage, KategoriiPage } from '../../components/AdminPages';
import { AdminZayavki } from '../../components/AdminZayavki';
import { AdminPolzovateli } from '../../components/AdminPolzovateli';
import { AdminReports } from '../../components/AdminReports';
import { DynamicHomePage } from '../../components/WelcomePageBlocks';
import { AdminWelcomePageEditor } from '../../components/AdminWelcomePage';
import { AdminAdminsPage } from '../../components/AdminAdminsPage';
import { OrderDetailsModal } from '../../components/OrderDetailsModal';

// ─── Страница регистрации ────────────────────────────────────────────────────
function RegisterPage() {
  const [form, setForm] = useState({ imya: '', email: '', password: '', phone: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.register(form);
      alert('Регистрация успешна! Теперь войдите в систему.');
      navigate('/login');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #f0fdf8 0%, #dcfce7 50%, #f0fdf8 100%)' }}>
      {/* Декоративные блобы */}
      <div className="absolute top-20 left-10 w-64 h-64 animate-blob animate-float" style={{ background: 'rgba(16,185,129,0.12)', filter: 'blur(40px)', borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%' }} />
      <div className="absolute bottom-20 right-10 w-80 h-80 animate-blob delay-400 animate-float delay-300" style={{ background: 'rgba(16,185,129,0.08)', filter: 'blur(50px)', borderRadius: '30% 60% 70% 40% / 50% 60% 30% 60%', animationDelay: '2s' }} />

      <div className="max-w-md w-full glass rounded-2xl shadow-xl p-8 animate-scale-in relative z-10" style={{ border: '2px solid rgba(187,247,208,0.7)' }}>
        {/* Логотип */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zm0 14l-10-5v6l10 5 10-5v-6l-10 5z" fill="white"/></svg>
          </div>
          <h2 className="text-3xl font-bold text-gradient" style={{ fontFamily: "'Playfair Display', serif" }}>Регистрация</h2>
          <p className="text-sm mt-1" style={{ color: '#4b7059' }}>Создайте аккаунт в системе</p>
        </div>

        {error && (
          <div className="rounded-xl p-3 mb-4 text-sm animate-fade-in" style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label: 'Имя', key: 'imya', type: 'text', placeholder: 'Ваше имя' },
            { label: 'Email', key: 'email', type: 'email', placeholder: 'email@example.com' },
            { label: 'Телефон', key: 'phone', type: 'tel', placeholder: '+375 XX XXX-XX-XX' },
            { label: 'Пароль', key: 'password', type: 'password', placeholder: '••••••••' },
          ].map((field, i) => (
            <div key={field.key} className={`animate-fade-in-up delay-${(i+1)*100}`}>
              <label className="block text-sm font-semibold mb-1" style={{ color: '#15803d' }}>{field.label}</label>
              <input
                type={field.type}
                required={field.key !== 'phone'}
                value={form[field.key]}
                onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                placeholder={field.placeholder}
                className="input-mint"
              />
            </div>
          ))}

          <button type="submit" className="btn-mint w-full mt-2 animate-fade-in-up delay-500">
            Зарегистрироваться
          </button>
        </form>

        <p className="text-center text-sm mt-6" style={{ color: '#4b7059' }}>
          Уже есть аккаунт?{' '}
          <Link to="/login" className="font-bold" style={{ color: '#10b981' }}>
            Войти →
          </Link>
        </p>
      </div>
    </div>
  );
}

// ─── Страница входа ──────────────────────────────────────────────────────────
function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = await api.login(form);
      localStorage.setItem('token', data.token);
      const role = getUserRole();
      if (role === 'admin' || role === 'manager') navigate('/admin');
      else navigate('/cabinet');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #f0fdf8 0%, #dcfce7 50%, #f0fdf8 100%)' }}>
      <div className="absolute top-20 right-20 w-72 h-72 animate-blob animate-float" style={{ background: 'rgba(16,185,129,0.1)', filter: 'blur(40px)', borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%' }} />

      <div className="max-w-md w-full glass rounded-2xl shadow-xl p-8 animate-scale-in relative z-10" style={{ border: '2px solid rgba(187,247,208,0.7)' }}>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14l-4-4 1.41-1.41L10 13.17l6.59-6.59L18 8l-8 8z" fill="white"/></svg>
          </div>
          <h2 className="text-3xl font-bold text-gradient" style={{ fontFamily: "'Playfair Display', serif" }}>Вход в систему</h2>
          <p className="text-sm mt-1" style={{ color: '#4b7059' }}>Войдите в свой аккаунт</p>
        </div>

        {error && (
          <div className="rounded-xl p-3 mb-4 text-sm animate-fade-in" style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="animate-fade-in-up delay-100">
            <label className="block text-sm font-semibold mb-1" style={{ color: '#15803d' }}>Email</label>
            <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" className="input-mint" />
          </div>
          <div className="animate-fade-in-up delay-200">
            <label className="block text-sm font-semibold mb-1" style={{ color: '#15803d' }}>Пароль</label>
            <input type="password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" className="input-mint" />
          </div>
          <button type="submit" className="btn-mint w-full animate-fade-in-up delay-300">
            Войти
          </button>
        </form>

        <p className="text-center text-sm mt-6" style={{ color: '#4b7059' }}>
          Нет аккаунта?{' '}
          <Link to="/register" className="font-bold" style={{ color: '#10b981' }}>
            Зарегистрироваться →
          </Link>
        </p>
      </div>
    </div>
  );
}

// ─── Личный кабинет ──────────────────────────────────────────────────────────
function UserCabinet() {
  const [activeTab, setActiveTab] = useState('orders');
  const [zayavki, setZayavki] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [userData, setUserData] = useState(null);
  const [editForm, setEditForm] = useState({ imya: '', email: '', messenger: '', pozhelaniya: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadZayavki(); loadUserData(); }, []);

  const loadZayavki = async () => {
    try { const data = await api.getMyZayavki(); setZayavki(data || []); }
    catch (err) { console.error(err); setZayavki([]); }
    finally { setLoading(false); }
  };

  const loadUserData = async () => {
    try {
      const data = await api.getMyProfile();
      setUserData(data);
      setEditForm({ imya: data.imya || '', email: data.email || '', messenger: data.messenger || '', pozhelaniya: data.pozhelaniya || '' });
    } catch (err) { console.error(err); }
  };

  const handleUpdateProfile = async () => {
    setSaving(true);
    try { await api.updateMyProfile(editForm); alert('Данные обновлены'); loadUserData(); }
    catch (err) { alert('Ошибка: ' + err.message); }
    finally { setSaving(false); }
  };

  const getStatusInfo = (status) => ({
    'Новая': { bg: '#fef9c3', color: '#854d0e', dot: '#f59e0b' },
    'В работе': { bg: '#dbeafe', color: '#1e40af', dot: '#3b82f6' },
    'Завершена': { bg: '#dcfce7', color: '#166534', dot: '#22c55e' },
    'Отклонена': { bg: '#fee2e2', color: '#991b1b', dot: '#ef4444' },
  }[status] || { bg: '#f3f4f6', color: '#374151', dot: '#9ca3af' });

  if (loading) return (
    <div className="flex items-center justify-center min-h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-transparent animate-spin" style={{ borderTopColor: '#10b981' }} />
        <span style={{ color: '#4b7059' }}>Загрузка...</span>
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-8 animate-fade-in-up">
        <div>
          <h1 className="text-3xl font-bold text-gradient" style={{ fontFamily: "'Playfair Display', serif" }}>Личный кабинет</h1>
          {userData && <p className="mt-1 text-sm" style={{ color: '#4b7059' }}>Добро пожаловать, <strong>{userData.imya}</strong></p>}
        </div>
        <Link to="/create-order" className="btn-mint">
          + Новый заказ
        </Link>
      </div>

      {/* Табы */}
      <div className="flex gap-2 mb-6 animate-fade-in-up delay-100">
        {[
          { id: 'orders', label: '📋 Мои заказы', count: zayavki.length },
          { id: 'profile', label: '👤 Профиль', count: null },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
            style={{
              background: activeTab === tab.id ? 'linear-gradient(135deg, #10b981, #059669)' : 'white',
              color: activeTab === tab.id ? 'white' : '#4b7059',
              boxShadow: activeTab === tab.id ? '0 4px 12px rgba(16,185,129,0.3)' : '0 1px 4px rgba(0,0,0,0.06)',
              border: activeTab === tab.id ? 'none' : '2px solid #bbf7d0',
            }}
          >
            {tab.label}
            {tab.count !== null && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: activeTab === tab.id ? 'rgba(255,255,255,0.25)' : '#dcfce7', color: activeTab === tab.id ? 'white' : '#166534' }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Заказы */}
      {activeTab === 'orders' && (
        <div className="animate-fade-in">
          {zayavki.length === 0 ? (
            <div className="text-center py-16 rounded-2xl" style={{ background: 'white', border: '2px dashed #bbf7d0' }}>
              <div className="text-6xl mb-4">📭</div>
              <p className="text-lg font-semibold" style={{ color: '#4b7059' }}>У вас пока нет заказов</p>
              <Link to="/create-order" className="inline-block mt-4" style={{ color: '#10b981', fontWeight: 700 }}>Создать первый заказ →</Link>
            </div>
          ) : (
            <div className="space-y-4">
              {zayavki.map((z, i) => {
                const si = getStatusInfo(z.status);
                return (
                  <div key={z.id} className={`bg-white rounded-2xl p-6 card-hover animate-fade-in-up delay-${Math.min(i * 100, 500)}`} style={{ border: '2px solid #e8fdf0', boxShadow: '0 2px 8px rgba(16,185,129,0.06)' }}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-bold" style={{ color: '#1a2e1e' }}>Заказ #{z.nomer}</h3>
                        <p className="text-sm mt-1" style={{ color: '#4b7059' }}>
                          {new Date(z.data_podachi).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: si.bg, color: si.color }}>
                        <div className="w-2 h-2 rounded-full" style={{ background: si.dot }} />
                        {z.status}
                      </div>
                    </div>
                    {z.tsena && (
                      <div className="mt-3 text-xl font-bold text-gradient">{z.tsena.toLocaleString()} BYN</div>
                    )}
                    <div className="mt-4 pt-4 flex gap-2" style={{ borderTop: '1px solid #dcfce7' }}>
                      <button onClick={() => { setSelectedOrder(z); setShowDetails(true); }} className="btn-mint text-sm py-2 px-4">
                        💬 Детали и чат
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Профиль */}
      {activeTab === 'profile' && userData && (
        <div className="bg-white rounded-2xl p-8 animate-scale-in max-w-lg" style={{ border: '2px solid #e8fdf0', boxShadow: '0 2px 8px rgba(16,185,129,0.06)' }}>
          <h2 className="text-xl font-bold mb-6" style={{ color: '#1a2e1e', fontFamily: "'Playfair Display', serif" }}>Личные данные</h2>
          <div className="space-y-4">
            {[
              { label: 'Имя', key: 'imya', type: 'text' },
              { label: 'Email', key: 'email', type: 'email' },
              { label: 'Мессенджер', key: 'messenger', type: 'text', placeholder: 'Telegram, WhatsApp...' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-sm font-semibold mb-1" style={{ color: '#15803d' }}>{f.label}</label>
                <input type={f.type} value={editForm[f.key]} onChange={e => setEditForm({ ...editForm, [f.key]: e.target.value })} placeholder={f.placeholder} className="input-mint" />
              </div>
            ))}
            <div>
              <label className="block text-sm font-semibold mb-1" style={{ color: '#15803d' }}>Пожелания</label>
              <textarea value={editForm.pozhelaniya} onChange={e => setEditForm({ ...editForm, pozhelaniya: e.target.value })} rows={3} className="input-mint" style={{ resize: 'vertical' }} />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={handleUpdateProfile} disabled={saving} className="btn-mint" style={{ opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button onClick={loadUserData} className="btn-ghost">Отменить</button>
            </div>
          </div>
        </div>
      )}

      {showDetails && selectedOrder && (
        <OrderDetailsModal order={selectedOrder} onClose={() => { setShowDetails(false); setSelectedOrder(null); loadZayavki(); }} />
      )}
    </div>
  );
}

// ─── Создание заказа ─────────────────────────────────────────────────────────
function CreateOrderPage() {
  const [uslugi, setUslugi] = useState([]);
  const [selected, setSelected] = useState([]);
  const [tz, setTz] = useState('');
  const [srochnost, setSrochnost] = useState('Средняя срочность');
  const [loading, setLoading] = useState(false);
  const [uslugiParams, setUslugiParams] = useState({});
  const [paramsValues, setParamsValues] = useState({});
  const [attachedFiles, setAttachedFiles] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => { loadUslugi(); }, []);

  const loadUslugi = async () => {
    try {
      const data = await api.getUslugi();
      const safeData = data || [];
      setUslugi(safeData);
      for (const u of safeData) {
        try {
          const params = await api.getUslugiParams(u.id);
          setUslugiParams(prev => ({ ...prev, [u.id]: params || [] }));
        } catch { setUslugiParams(prev => ({ ...prev, [u.id]: [] })); }
      }
    } catch (err) { console.error(err); setUslugi([]); }
  };

  const toggleUsluga = (id) => {
    if (selected.includes(id)) {
      setSelected(selected.filter(s => s !== id));
      setParamsValues(prev => { const n = { ...prev }; delete n[id]; return n; });
    } else {
      setSelected([...selected, id]);
    }
  };

  const handleParamChange = (uid, pid, val) => {
    setParamsValues(prev => ({ ...prev, [uid]: { ...(prev[uid] || {}), [pid]: val } }));
  };

  const handleAttachFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (attachedFiles.find(f => f.name === file.name)) {
      alert('Файл с таким именем уже прикреплён');
      return;
    }
    setAttachedFiles(prev => [...prev, file]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (name) => setAttachedFiles(prev => prev.filter(f => f.name !== name));

  const getFileIcon = (name) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (['jpg','jpeg','png','gif','webp'].includes(ext)) return '🖼️';
    if (ext === 'pdf') return '📄';
    if (['doc','docx'].includes(ext)) return '📝';
    if (['psd','fig'].includes(ext)) return '🎨';
    if (['zip','rar','7z'].includes(ext)) return '📦';
    return '📎';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selected.length === 0) { alert('Выберите хотя бы одну услугу'); return; }
    setLoading(true);
    try {
      const zayavka = await api.createZayavka({ uslugi_ids: selected, tz, srochnost, params: paramsValues });
      const orderId = zayavka.id;
      // Загружаем прикреплённые файлы в чат заявки
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
      alert('Заказ успешно создан!');
      window.location.href = '/cabinet';
    } catch (err) { alert('Ошибка: ' + err.message); }
    finally { setLoading(false); }
  };

  const srochnostOptions = [
    { value: 'Срочно', label: '🚀 Срочно', color: '#fee2e2', border: '#fca5a5' },
    { value: 'Средняя срочность', label: '⚡ Средняя срочность', color: '#fef9c3', border: '#fde047' },
    { value: 'Не срочно', label: '📅 Не срочно', color: '#dcfce7', border: '#86efac' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-8 animate-fade-in-up">
        <h1 className="text-3xl font-bold text-gradient" style={{ fontFamily: "'Playfair Display', serif" }}>Новый заказ</h1>
        <p style={{ color: '#4b7059' }} className="mt-1">Выберите услуги и заполните детали</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Услуги */}
        <div className="bg-white rounded-2xl p-6 animate-fade-in-up delay-100" style={{ border: '2px solid #e8fdf0', boxShadow: '0 2px 8px rgba(16,185,129,0.06)' }}>
          <h2 className="text-xl font-bold mb-5" style={{ fontFamily: "'Playfair Display', serif", color: '#1a2e1e' }}>Выберите услуги</h2>
          <div className="space-y-3">
            {uslugi.map(u => {
              const isSel = selected.includes(u.id);
              const params = uslugiParams[u.id] || [];
              return (
                <div key={u.id} className="rounded-xl transition-all overflow-hidden" style={{ border: isSel ? '2px solid #10b981' : '2px solid #e8fdf0', background: isSel ? '#f0fdf8' : 'white' }}>
                  <div className="p-4 cursor-pointer flex items-start gap-3" onClick={() => toggleUsluga(u.id)}>
                    <div className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition-all" style={{ background: isSel ? '#10b981' : '#e8fdf0' }}>
                      {isSel && <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold" style={{ color: '#1a2e1e' }}>{u.naimenovanie}</div>
                          {u.opisanie && <div className="text-sm mt-1" style={{ color: '#4b7059' }}>{u.opisanie}</div>}
                        </div>
                        <div className="ml-4 text-lg font-bold text-gradient whitespace-nowrap">{u.tsena?.toLocaleString()} BYN</div>
                      </div>
                    </div>
                  </div>
                  {isSel && params.length > 0 && (
                    <div className="px-4 pb-4 animate-fade-in">
                      <div className="rounded-xl p-4" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid #bbf7d0' }}>
                        <p className="text-sm font-bold mb-3" style={{ color: '#166534' }}>📋 Параметры услуги</p>
                        <div className="space-y-3">
                          {params.map(param => (
                            <div key={param.id}>
                              <label className="block text-sm font-semibold mb-1" style={{ color: '#15803d' }}>
                                {param.param_name}{param.is_required && <span className="text-red-500 ml-1">*</span>}
                              </label>
                              {param.param_type === 'textarea' ? (
                                <textarea value={paramsValues[u.id]?.[param.id] || ''} onChange={e => handleParamChange(u.id, param.id, e.target.value)} className="input-mint" rows={3} />
                              ) : param.param_type === 'select' ? (
                                <select value={paramsValues[u.id]?.[param.id] || ''} onChange={e => handleParamChange(u.id, param.id, e.target.value)} className="input-mint">
                                  <option value="">Выберите...</option>
                                  {(param.param_options || '').split('|').map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                              ) : (
                                <input type="text" value={paramsValues[u.id]?.[param.id] || ''} onChange={e => handleParamChange(u.id, param.id, e.target.value)} className="input-mint" placeholder={param.param_name} />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Срочность */}
        <div className="bg-white rounded-2xl p-6 animate-fade-in-up delay-200" style={{ border: '2px solid #e8fdf0', boxShadow: '0 2px 8px rgba(16,185,129,0.06)' }}>
          <h2 className="text-xl font-bold mb-4" style={{ fontFamily: "'Playfair Display', serif", color: '#1a2e1e' }}>Срочность</h2>
          <div className="flex flex-wrap gap-3">
            {srochnostOptions.map(opt => (
              <button key={opt.value} type="button" onClick={() => setSrochnost(opt.value)}
                className="px-5 py-3 rounded-xl font-bold text-sm transition-all"
                style={{
                  background: srochnost === opt.value ? opt.color : 'white',
                  border: srochnost === opt.value ? `2px solid ${opt.border}` : '2px solid #e8fdf0',
                  color: '#1a2e1e',
                  boxShadow: srochnost === opt.value ? `0 4px 12px rgba(0,0,0,0.08)` : 'none',
                }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* ТЗ */}
        <div className="bg-white rounded-2xl p-6 animate-fade-in-up delay-300" style={{ border: '2px solid #e8fdf0', boxShadow: '0 2px 8px rgba(16,185,129,0.06)' }}>
          <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif", color: '#1a2e1e' }}>Техническое задание</h2>
          <p className="text-sm mb-4" style={{ color: '#4b7059' }}>Опишите ваши требования подробно</p>
          <textarea value={tz} onChange={e => setTz(e.target.value)} rows={6} className="input-mint" placeholder="Опишите ваши пожелания, требования, особенности проекта..." />

          {/* Прикрепление файлов */}
          <div className="mt-5">
            <p className="text-sm font-bold mb-2" style={{ color: '#1a2e1e' }}>
              📎 Прикрепить файлы
              <span className="font-normal ml-1" style={{ color: '#4b7059' }}>(файлы появятся в чате заявки)</span>
            </p>
            <label
              className="flex items-center gap-2 cursor-pointer rounded-xl px-4 py-3 transition-all text-sm w-full"
              style={{ border: '2px dashed #10b981', background: '#f0fdf8', color: '#166534' }}
            >
              <span className="text-lg">📁</span>
              <span>Выбрать файл для прикрепления</span>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleAttachFile}
                className="hidden"
                accept=".png,.jpg,.jpeg,.psd,.fig,.pdf,.zip,.doc,.docx,.txt,.xlsx,.xls"
              />
            </label>

            {attachedFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                {attachedFiles.map(f => (
                  <div key={f.name} className="flex items-center justify-between rounded-xl px-3 py-2"
                    style={{ background: '#f0fdf8', border: '1px solid #bbf7d0' }}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span>{getFileIcon(f.name)}</span>
                      <span className="text-sm font-medium truncate" style={{ color: '#1a2e1e' }}>{f.name}</span>
                      <span className="text-xs shrink-0" style={{ color: '#4b7059' }}>
                        ({Math.round(f.size / 1024)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(f.name)}
                      className="ml-2 text-xl leading-none shrink-0"
                      style={{ color: '#ef4444' }}
                    >×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 animate-fade-in-up delay-400">
          <button type="submit" disabled={loading} className="btn-mint" style={{ opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Создание...' : '✓ Оформить заказ'}
          </button>
          <Link to="/cabinet" className="btn-ghost flex items-center">Отмена</Link>
        </div>
      </form>
    </div>
  );
}

// ─── Админ панель ─────────────────────────────────────────────────────────────
function AdminPanel() {
  const [activeTab, setActiveTab] = useState('zayavki');
  const userRole = getUserRole();
  const isAdminOnly = isAdmin();

  const managerMenu = [{ id: 'zayavki', name: 'Заявки', icon: '📋' }];
  const adminMenu = [
    { id: 'zayavki', name: 'Управление заявками', icon: '📋' },
    { id: 'uslugi', name: 'Управление услугами', icon: '🛠️' },
    { id: 'kategorii', name: 'Управление категориями', icon: '📁' },
    { id: 'polzovateli', name: 'Управление пользователями', icon: '👥' },
    { id: 'admins', name: 'Управление ролями', icon: '👑' },
    { id: 'welcome', name: 'Конструктор главной страницы', icon: '🎨' },
    { id: 'reports', name: 'Отчёты', icon: '📊' },
  ];
  const menuItems = isAdminOnly ? adminMenu : managerMenu;

  return (
    <div className="flex h-screen" style={{ background: '#f4fdf8' }}>
      {/* Сайдбар */}
      <aside className="w-60 flex flex-col" style={{ background: 'linear-gradient(180deg, #064e3b 0%, #065f46 100%)', boxShadow: '4px 0 20px rgba(0,0,0,0.15)' }}>
        <div className="px-6 py-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zm0 14l-10-5v6l10 5 10-5v-6l-10 5z" fill="white"/></svg>
            </div>
            <div>
              <div className="font-bold text-white text-sm">{isAdminOnly ? 'Админ панель' : 'Панель разработчика'}</div>
              {!isAdminOnly && <div className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Разработчик</div>}
            </div>
          </div>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          {menuItems.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="w-full text-left px-5 py-3 flex items-center gap-3 text-sm transition-all font-semibold"
              style={{
                color: activeTab === tab.id ? '#10b981' : 'rgba(255,255,255,0.65)',
                background: activeTab === tab.id ? 'rgba(16,185,129,0.15)' : 'transparent',
                borderRight: activeTab === tab.id ? '3px solid #10b981' : '3px solid transparent',
              }}
            >
              <span className="text-lg">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </nav>

        <div className="px-5 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <Link to="/" className="flex items-center gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M10 19l-7-7m0 0l7-7m-7 7h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            На сайт
          </Link>
        </div>
      </aside>

      {/* Контент */}
      <main className="flex-1 overflow-auto" style={{ background: '#f4fdf8' }}>
        <div className="p-8">
          {activeTab === 'zayavki' && <AdminZayavki />}
          {isAdminOnly && (
            <>
              {activeTab === 'uslugi' && <UslugiPage />}
              {activeTab === 'kategorii' && <KategoriiPage />}
              {activeTab === 'polzovateli' && <AdminPolzovateli />}
              {activeTab === 'admins' && <AdminAdminsPage />}
              {activeTab === 'welcome' && <AdminWelcomePageEditor />}
              {activeTab === 'reports' && <AdminReports />}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

// ─── Шапка сайта ─────────────────────────────────────────────────────────────
function Header() {
  const [role, setRole] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => { setRole(getUserRole()); }, [location]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = () => { localStorage.removeItem('token'); setRole(null); navigate('/'); };
  const isAdminPage = location.pathname.startsWith('/admin');
  if (isAdminPage) return null;

  const getRoleName = () => {
    if (role === 'admin') return 'Администратор';
    if (role === 'manager') return 'Разработчик';
    return 'Пользователь';
  };

  return (
    <header className="sticky top-0 z-50 transition-all duration-300" style={{
      background: scrolled ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.85)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderBottom: scrolled ? '1px solid #bbf7d0' : '1px solid rgba(187,247,208,0.4)',
      boxShadow: scrolled ? '0 4px 20px rgba(16,185,129,0.08)' : 'none',
    }}>
      <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zm0 14l-10-5v6l10 5 10-5v-6l-10 5z" fill="white"/></svg>
          </div>
          <span className="text-2xl font-black text-gradient" style={{ fontFamily: "'Playfair Display', serif", letterSpacing: '-0.5px' }}>САРП</span>
        </Link>

        <nav className="flex items-center gap-2">
          <Link to="/" className="px-4 py-2 rounded-xl text-sm font-semibold transition-all" style={{ color: '#4b7059' }}
            onMouseEnter={e => e.target.style.background = '#f0fdf8'}
            onMouseLeave={e => e.target.style.background = 'transparent'}>
            Главная
          </Link>

          {!role ? (
            <>
              <Link to="/login" className="px-4 py-2 rounded-xl text-sm font-semibold transition-all" style={{ color: '#4b7059' }}
                onMouseEnter={e => e.target.style.background = '#f0fdf8'}
                onMouseLeave={e => e.target.style.background = 'transparent'}>
                Войти
              </Link>
              <Link to="/register" className="btn-mint text-sm py-2 px-5">Регистрация</Link>
            </>
          ) : (role === 'admin' || role === 'manager') ? (
            <>
              <Link to="/admin" className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ color: '#4b7059' }}
                onMouseEnter={e => e.target.style.background = '#f0fdf8'}
                onMouseLeave={e => e.target.style.background = 'transparent'}>
                Панель управления
              </Link>
              <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: '#dcfce7', color: '#166534' }}>{getRoleName()}</span>
              <button onClick={handleLogout} className="text-sm font-semibold px-3 py-2 rounded-xl" style={{ color: '#ef4444' }}
                onMouseEnter={e => e.target.style.background = '#fee2e2'}
                onMouseLeave={e => e.target.style.background = 'transparent'}>
                Выйти
              </button>
            </>
          ) : (
            <>
              <Link to="/cabinet" className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ color: '#4b7059' }}
                onMouseEnter={e => e.target.style.background = '#f0fdf8'}
                onMouseLeave={e => e.target.style.background = 'transparent'}>
                Кабинет
              </Link>
              <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: '#dcfce7', color: '#166534' }}>👤 {getRoleName()}</span>
              <button onClick={handleLogout} className="text-sm font-semibold px-3 py-2 rounded-xl" style={{ color: '#ef4444' }}
                onMouseEnter={e => e.target.style.background = '#fee2e2'}
                onMouseLeave={e => e.target.style.background = 'transparent'}>
                Выйти
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<DynamicHomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/cabinet" element={<UserCabinet />} />
        <Route path="/create-order" element={<CreateOrderPage />} />
        <Route path="/admin/*" element={<AdminPanel />} />
      </Routes>
    </BrowserRouter>
  );
}