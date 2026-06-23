import { useEffect, useState, useRef } from 'react';
import { api } from '../api/api';

// ─── Хук анимации при скролле ────────────────────────────────────────────────
function useScrollReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return [ref, visible];
}

// ─── Block Renderer ───────────────────────────────────────────────────────────
function BlockRenderer({ block, index }) {
  const { type, props } = block;
  const [ref, visible] = useScrollReveal();

  switch (type) {
    case 'hero': {
      const { title, subtitle, image, text } = props;
      return (
        <section ref={ref} className="relative overflow-hidden py-28" style={{
          background: 'linear-gradient(135deg, #064e3b 0%, #065f46 40%, #047857 100%)',
          minHeight: '480px',
        }}>
          {/* Декоративные элементы */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full animate-blob" style={{ background: 'rgba(16,185,129,0.2)', filter: 'blur(40px)' }} />
            <div className="absolute -bottom-16 -left-16 w-80 h-80 rounded-full animate-blob" style={{ background: 'rgba(4,120,87,0.3)', filter: 'blur(50px)', animationDelay: '3s' }} />
            {/* Сетка точек */}
            <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.06 }}>
              <defs>
                <pattern id="dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                  <circle cx="4" cy="4" r="2" fill="white" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#dots)" />
            </svg>
          </div>

          {image && (
            <div className="absolute inset-0 opacity-15">
              <img src={image} alt="" className="w-full h-full object-cover" />
            </div>
          )}

          <div className="relative max-w-5xl mx-auto px-4 text-center">
            {/* Бейдж */}
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-6 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
              style={{ background: 'rgba(255,255,255,0.12)', color: '#6ee7b7', border: '1px solid rgba(110,231,183,0.3)', transitionDelay: '0.1s' }}>
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Система автоматизации рабочих процессов
            </div>

            <h1 className={`text-5xl md:text-6xl font-black text-white mb-6 leading-tight transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ fontFamily: "'Playfair Display', serif", transitionDelay: '0.2s', textShadow: '0 4px 32px rgba(0,0,0,0.2)' }}>
              {title || 'САРП'}
            </h1>

            {subtitle && (
              <p className={`text-xl md:text-2xl mb-4 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
                style={{ color: '#a7f3d0', transitionDelay: '0.3s', fontWeight: 600 }}>
                {subtitle}
              </p>
            )}
            {text && (
              <p className={`text-lg max-w-2xl mx-auto mb-10 leading-relaxed transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                style={{ color: 'rgba(255,255,255,0.75)', transitionDelay: '0.4s' }}>
                {text}
              </p>
            )}

            <div className={`flex flex-wrap gap-4 justify-center transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '0.5s' }}>
              <a href="/register" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-base transition-all"
                style={{ background: 'white', color: '#059669', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.15)'; }}>
                Начать работу →
              </a>
              <a href="#services" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-base transition-all"
                style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '2px solid rgba(255,255,255,0.2)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}>
                Посмотреть услуги
              </a>
            </div>
          </div>

          {/* Волна снизу */}
          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
              <path d="M0 80L48 66.7C96 53.3 192 26.7 288 21.3C384 16 480 32 576 37.3C672 42.7 768 37.3 864 32C960 26.7 1056 21.3 1152 26.7C1248 32 1344 48 1392 56L1440 64V80H1392C1344 80 1248 80 1152 80C1056 80 960 80 864 80C768 80 672 80 576 80C480 80 384 80 288 80C192 80 96 80 48 80H0Z" fill="#f4fdf8"/>
            </svg>
          </div>
        </section>
      );
    }

    case 'features': {
      const { title = '' } = props;
      const items = Array.isArray(props.items) ? props.items : [];
      return (
        <section ref={ref} className="py-20" style={{ background: '#f4fdf8' }}>
          <div className="max-w-5xl mx-auto px-4">
            {title && (
              <div className={`text-center mb-14 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                <h2 className="text-4xl font-black" style={{ fontFamily: "'Playfair Display', serif", color: '#1a2e1e' }}>{title}</h2>
                <div className="mt-4 mx-auto w-16 h-1 rounded-full" style={{ background: 'linear-gradient(90deg, #10b981, #059669)' }} />
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item, i) => (
                <div key={i} className={`bg-white p-7 rounded-2xl card-hover transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                  style={{ border: '2px solid #e8fdf0', boxShadow: '0 2px 12px rgba(16,185,129,0.06)', transitionDelay: `${i * 0.1}s` }}>
                  <div className="text-4xl mb-4 animate-float" style={{ display: 'inline-block', animationDelay: `${i * 0.5}s` }}>{item.icon || '⭐'}</div>
                  <h3 className="text-lg font-bold mb-2" style={{ color: '#1a2e1e', fontFamily: "'Playfair Display', serif" }}>{item.title || ''}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#4b7059' }}>{item.text || ''}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    }

    case 'services': {
      const { title = '' } = props;
      return (
        <section ref={ref} id="services" className="py-20" style={{ background: 'white' }}>
          <div className="max-w-5xl mx-auto px-4">
            {title && (
              <div className={`text-center mb-14 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                <h2 className="text-4xl font-black" style={{ fontFamily: "'Playfair Display', serif", color: '#1a2e1e' }}>{title}</h2>
                <div className="mt-4 mx-auto w-16 h-1 rounded-full" style={{ background: 'linear-gradient(90deg, #10b981, #059669)' }} />
              </div>
            )}
            <ServicesGrid />
          </div>
        </section>
      );
    }

    case 'cta': {
      const { text = '', link = '' } = props;
      return (
        <section ref={ref} className="py-20 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)' }}>
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 right-0 w-72 h-72 rounded-full animate-blob" style={{ background: 'rgba(16,185,129,0.15)', filter: 'blur(40px)' }} />
          </div>
          <div className={`max-w-3xl mx-auto px-4 text-center relative transition-all duration-700 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
            <h2 className="text-4xl font-black text-white mb-8" style={{ fontFamily: "'Playfair Display', serif" }}>
              {text || 'Готовы начать работу?'}
            </h2>
            <a href={link || '/register'}
              className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl font-bold text-base transition-all"
              style={{ background: 'white', color: '#059669', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}>
              Зарегистрироваться бесплатно →
            </a>
          </div>
        </section>
      );
    }

    case 'text': {
      const { content = '' } = props;
      return (
        <section ref={ref} className="py-16" style={{ background: 'white' }}>
          <div className={`max-w-4xl mx-auto px-4 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <div className="prose prose-lg max-w-none" style={{ color: '#1a2e1e' }} dangerouslySetInnerHTML={{ __html: content }} />
          </div>
        </section>
      );
    }

    case 'html': {
      const { html = '' } = props;
      return <section dangerouslySetInnerHTML={{ __html: html }} />;
    }

    case 'footer': {
      const { text = '' } = props;
      return (
        <footer style={{ background: '#0a2414', color: 'rgba(255,255,255,0.4)' }} className="py-10">
          <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.2)' }}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zm0 14l-10-5v6l10 5 10-5v-6l-10 5z" fill="#10b981"/></svg>
              </div>
              <span className="font-bold text-white text-lg" style={{ fontFamily: "'Playfair Display', serif" }}>САРП</span>
            </div>
            <p className="text-sm">{text || '© 2025 САРП. Все права защищены.'}</p>
          </div>
        </footer>
      );
    }

    default:
      return null;
  }
}

// ─── Сетка услуг ─────────────────────────────────────────────────────────────
function ServicesGrid() {
  const [uslugi, setUslugi] = useState([]);
  const [kategorii, setKategorii] = useState([]);
  const [selectedKat, setSelectedKat] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const params = selectedKat ? { kategoriya_id: selectedKat } : {};
      const [u, k] = await Promise.all([api.getUslugi(params), api.getKategorii()]);
      setUslugi(u);
      setKategorii(k);
      setLoading(false);
    };
    load();
  }, [selectedKat]);

  return (
    <>
      {/* Фильтры по категориям */}
      <div className="flex gap-2 flex-wrap mb-10 justify-center">
        {[{ id: '', naimenovanie: 'Все услуги' }, ...kategorii].map((k, i) => (
          <button
            key={k.id}
            onClick={() => setSelectedKat(k.id)}
            className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={{
              background: selectedKat === k.id ? 'linear-gradient(135deg, #10b981, #059669)' : 'white',
              color: selectedKat === k.id ? 'white' : '#4b7059',
              border: selectedKat === k.id ? 'none' : '2px solid #e8fdf0',
              boxShadow: selectedKat === k.id ? '0 4px 12px rgba(16,185,129,0.3)' : '0 1px 4px rgba(0,0,0,0.05)',
              transform: selectedKat === k.id ? 'scale(1.04)' : 'none',
            }}>
            {k.naimenovanie}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse" style={{ border: '2px solid #e8fdf0' }}>
              <div className="h-44" style={{ background: '#e8fdf0' }} />
              <div className="p-5 space-y-3">
                <div className="h-4 rounded-lg" style={{ background: '#e8fdf0', width: '70%' }} />
                <div className="h-3 rounded-lg" style={{ background: '#f0fdf8', width: '90%' }} />
                <div className="h-3 rounded-lg" style={{ background: '#f0fdf8', width: '60%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {uslugi.map((u, i) => (
            <div key={u.id} className="bg-white rounded-2xl overflow-hidden card-hover animate-fade-in-up"
              style={{ border: '2px solid #e8fdf0', boxShadow: '0 2px 12px rgba(16,185,129,0.06)', animationDelay: `${i * 0.07}s` }}>
              {u.kartinka ? (
                <div className="h-44 overflow-hidden">
                  <img src={u.kartinka} alt={u.naimenovanie} className="w-full h-full object-cover transition-transform duration-500 hover:scale-110" />
                </div>
              ) : (
                <div className="h-44 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f0fdf8, #dcfce7)' }}>
                  <div className="text-5xl">🛠️</div>
                </div>
              )}
              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-base font-bold leading-snug" style={{ color: '#1a2e1e', fontFamily: "'Playfair Display', serif" }}>{u.naimenovanie}</h3>
                  <span className="ml-2 text-xs font-bold px-2 py-1 rounded-lg whitespace-nowrap flex-shrink-0" style={{ background: '#dcfce7', color: '#166534' }}>
                    {u.kategoriya}
                  </span>
                </div>
                {u.opisanie && <p className="text-sm leading-relaxed mb-4" style={{ color: '#4b7059' }}>{u.opisanie}</p>}
                <div className="flex items-center justify-between pt-4" style={{ borderTop: '1px solid #e8fdf0' }}>
                  <span className="text-xl font-black text-gradient">{u.tsena?.toLocaleString()} BYN</span>
                  <a href="/register" className="btn-mint text-sm py-2 px-4">Заказать</a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ─── Главная страница ─────────────────────────────────────────────────────────
export function DynamicHomePage() {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        const data = await api.getWelcomePage();
        let loadedBlocks = [];
        if (data.content && typeof data.content === 'string') {
          try {
            const parsed = JSON.parse(data.content);
            loadedBlocks = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.blocks) ? parsed.blocks : []);
          } catch { loadedBlocks = []; }
        } else if (Array.isArray(data.content)) {
          loadedBlocks = data.content;
        }
        loadedBlocks = loadedBlocks.map(b => ({ ...b, id: b.id || Math.random().toString(36).substr(2, 9), props: b.props || {} }));
        setBlocks(loadedBlocks);
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPage();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-transparent animate-spin" style={{ borderTopColor: '#10b981' }} />
        <p style={{ color: '#4b7059', fontWeight: 600 }}>Загрузка страницы...</p>
      </div>
    </div>
  );

  if (blocks.length === 0) return (
    <div className="text-center py-32">
      <div className="text-5xl mb-4">🌿</div>
      <p style={{ color: '#4b7059', fontSize: '1.1rem' }}>Нет блоков для отображения</p>
    </div>
  );

  return (
    <div>
      {blocks.map((block, i) => (
        <BlockRenderer key={block.id || i} block={block} index={i} />
      ))}
    </div>
  );
}
