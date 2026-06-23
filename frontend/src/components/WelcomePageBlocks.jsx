import { useEffect, useState } from 'react';
import { api } from '../api/api';

// Block Renderer component
function BlockRenderer({ block }) {
  const { type, props, id } = block;
  console.log('Render block:', type, props);

  switch (type) {
    case 'hero': {
      const { title, subtitle, image, text } = props;
      return (
        <section className="relative bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 text-white py-20 overflow-hidden">
          {image && (
            <div className="absolute inset-0 opacity-30">
              <img src={image} alt="Hero" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="relative max-w-7xl mx-auto px-4 text-center">
            <h1 className="text-5xl font-bold mb-4 drop-shadow-lg">{title}</h1>
            {subtitle && <p className="text-xl text-indigo-200 mb-6">{subtitle}</p>}
            {text && <p className="text-lg max-w-2xl mx-auto mb-8 text-indigo-100">{text}</p>}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-50 to-transparent"></div>
        </section>
      );
    }

    case 'features': {
      const { title = '' } = props;
      const items = Array.isArray(props.items) ? props.items : [];
      return (
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4">
            {title && <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">{title}</h2>}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {items.map((item, i) => (
                <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
                  <div className="text-4xl mb-4">{item.icon || '⭐'}</div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">{item.title || ''}</h3>
                  <p className="text-gray-600">{item.text || ''}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    }

    case 'text': {
      const { content = '' } = props;
      return (
        <section className="py-12 bg-white">
          <div className="max-w-4xl mx-auto px-4">
            <div className="prose prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: content }} />
          </div>
        </section>
      );
    }

    case 'html': {
      const { html = '' } = props;
      return (
        <section className="py-0" dangerouslySetInnerHTML={{ __html: html }} />
      );
    }

    case 'cta': {
      const { text = '', link = '' } = props;
      return (
        <section className="py-16 bg-indigo-600">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-white mb-6">{text || 'Готовы начать?'}</h2>
            <a
              href={link || '/register'}
              className="inline-block bg-white text-indigo-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition shadow-lg"
            >
              Зарегистрироваться
            </a>
          </div>
        </section>
      );
    }

    case 'footer': {
      const { text = '' } = props;
      return (
        <footer className="bg-gray-900 text-gray-400 py-8">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <p>{text || '© 2025 САРП'}</p>
          </div>
        </footer>
      );
    }

    case 'services': {
      const { title = '' } = props;
      return (
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4">
            {title && <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">{title}</h2>}
            <ServicesGrid />
          </div>
        </section>
      );
    }

    default:
      return null;
  }
}

// Services Grid component
function ServicesGrid() {
  const [uslugi, setUslugi] = useState([]);
  const [kategorii, setKategorii] = useState([]);
  const [selectedKat, setSelectedKat] = useState('');

  useEffect(() => {
    const load = async () => {
      const params = selectedKat ? { kategoriya_id: selectedKat } : {};
      const [u, k] = await Promise.all([api.getUslugi(params), api.getKategorii()]);
      setUslugi(u);
      setKategorii(k);
    };
    load();
  }, [selectedKat]);

  return (
    <>
      <div className="flex gap-2 flex-wrap mb-8 justify-center">
        <button
          onClick={() => setSelectedKat('')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            !selectedKat ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          Все услуги
        </button>
        {kategorii.map(k => (
          <button
            key={k.id}
            onClick={() => setSelectedKat(k.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              selectedKat === k.id ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            {k.naimenovanie}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {uslugi.map(u => (
          <div key={u.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition">
            {u.kartinka && (
              <img src={u.kartinka} alt={u.naimenovanie} className="w-full h-48 object-cover" />
            )}
            <div className="p-5">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-800">{u.naimenovanie}</h3>
                <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">{u.kategoriya}</span>
              </div>
              {u.opisanie && <p className="text-gray-600 text-sm mb-4">{u.opisanie}</p>}
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-indigo-600">{u.tsena.toLocaleString()} BYN</span>
                <a href="/register" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">
                  Заказать
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// Main Dynamic HomePage component
export function DynamicHomePage() {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        console.log('Fetching welcome page...');
        const data = await api.getWelcomePage();
        console.log('Fetched page data:', data);
        let loadedBlocks = [];
        if (data.content && typeof data.content === 'string') {
          try {
            const parsed = JSON.parse(data.content);
            if (Array.isArray(parsed)) {
              loadedBlocks = parsed;
            } else if (Array.isArray(parsed.blocks)) {
              loadedBlocks = parsed.blocks;
            } else {
              console.warn('Unexpected content format:', parsed);
              loadedBlocks = [];
            }
          } catch (e) {
            console.error('Failed to parse content:', e, 'raw:', data.content);
            loadedBlocks = [];
          }
        } else if (Array.isArray(data.content)) {
          loadedBlocks = data.content;
        }
        // Ensure all blocks have IDs
        loadedBlocks = loadedBlocks.map(b => ({
          ...b,
          id: b.id || Math.random().toString(36).substr(2, 9),
          props: b.props || {}
        }));
        console.log('Setting blocks:', loadedBlocks);
        setBlocks(loadedBlocks);
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPage();
  }, []);

  if (loading) return <div className="text-center py-12">Загрузка...</div>;
  if (error) return <div className="text-center py-12 text-red-600">Ошибка: {error}</div>;
  if (blocks.length === 0) return <div className="text-center py-12 text-gray-500">Нет блоков для отображения</div>;

  console.log('Rendering blocks:', blocks);
  return (
    <div>
      {blocks.map((block) => (
        <BlockRenderer key={block.id || Math.random()} block={block} />
      ))}
    </div>
  );
}
