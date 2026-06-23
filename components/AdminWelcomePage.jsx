import { useState, useEffect } from 'react';
import { api } from '../api/api';

const genId = () => Math.random().toString(36).substr(2, 9);
const ICONS = ['✓', '⚡', '💰', '🛡️', '🎯', '⭐', '🚀', '💎', '🔥', '💡', '🏆', '🌟'];

export function AdminWelcomePageEditor() {
  const [blocks, setBlocks] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPage();
  }, []);

  const loadPage = async () => {
    try {
      console.log('Loading page...');
      const data = await api.getWelcomePage();
      console.log('Loaded page data:', data);
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
        id: b.id || genId(),
        props: b.props || {}
      }));
      console.log('Setting blocks:', loadedBlocks);
      setBlocks(loadedBlocks);
    } catch (err) {
      console.error('Load page error:', err);
      alert('Ошибка загрузки: ' + err.message);
    }
  };

  const savePage = async () => {
    setSaving(true);
    try {
      console.log('Saving blocks:', blocks);
      const response = await api.updateWelcomePage({ content: blocks });
      console.log('Save response:', response);
      alert('Страница успешно сохранена!');
      // Перезагружаем страницу для подтверждения
      await loadPage();
    } catch (err) {
      console.error('Save error:', err);
      alert('Ошибка сохранения: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const addBlock = (type) => {
    setBlocks(prev => [...prev, { id: genId(), type, props: getDefaultProps(type) }]);
  };

  const removeBlock = (index) => {
    setBlocks(prev => prev.filter((_, i) => i !== index));
  };

  const moveBlock = (fromIndex, toIndex) => {
    setBlocks(prev => {
      const newBlocks = [...prev];
      const [block] = newBlocks.splice(fromIndex, 1);
      newBlocks.splice(toIndex, 0, block);
      return newBlocks;
    });
  };

  const updateBlockProps = (index, key, value) => {
    setBlocks(prev => prev.map((block, i) =>
      i === index
        ? { ...block, props: { ...block.props, [key]: value } }
        : block
    ));
  };

  const updateFeatureItem = (blockIndex, itemIndex, key, value) => {
    setBlocks(prev => prev.map((block, i) => {
      if (i !== blockIndex) return block;
      const items = Array.isArray(block.props.items) ? block.props.items : [];
      const newItems = items.map((item, j) =>
        j === itemIndex ? { ...item, [key]: value } : item
      );
      return { ...block, props: { ...block.props, items: newItems } };
    }));
  };

  const addFeatureItem = (blockIndex) => {
    setBlocks(prev => prev.map((block, i) => {
      if (i !== blockIndex) return block;
      const items = Array.isArray(block.props.items) ? block.props.items : [];
      return { ...block, props: { ...block.props, items: [...items, { icon: '⭐', title: '', text: '' }] } };
    }));
  };

  const removeFeatureItem = (blockIndex, itemIndex) => {
    setBlocks(prev => prev.map((block, i) => {
      if (i !== blockIndex) return block;
      const items = Array.isArray(block.props.items) ? block.props.items : [];
      return { ...block, props: { ...block.props, items: items.filter((_, j) => j !== itemIndex) } };
    }));
  };

  const getDefaultProps = (type) => {
    switch (type) {
      case 'hero':
        return { title: 'Добро пожаловать', subtitle: 'Профессиональные услуги', image: '', text: '' };
      case 'features':
        return { title: 'Почему выбирают нас', items: [
          { icon: '✓', title: 'Качество', text: 'Гарантия качества' },
          { icon: '⏱', title: 'Скорость', text: 'Быстрое выполнение' },
          { icon: '💰', title: 'Цены', text: 'Доступные цены' }
        ]};
      case 'services':
        return { title: 'Наши услуги' };
      case 'text':
        return { content: '<p>Введите текст...</p>' };
      case 'html':
        return { html: '<!-- HTML код -->' };
      case 'cta':
        return { text: 'Заказать услугу', link: '/register' };
      case 'footer':
        return { text: '© 2025 САРП. Все права защищены.' };
      default:
        return {};
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold text-gray-800">Конструктор главной страницы</h1>
        <div className="flex gap-2">
          <button onClick={loadPage} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
            🔄 Обновить
          </button>
          <button onClick={savePage} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
            {saving ? 'Сохранение...' : '✅ Сохранить'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-600 mb-3">Добавить блок</h3>
        <div className="flex flex-wrap gap-2">
          {[
            { type: 'hero', label: 'Hero баннер', icon: '🖼️' },
            { type: 'features', label: 'Преимущества', icon: '⭐' },
            { type: 'services', label: 'Сетка услуг', icon: '🛠️' },
            { type: 'text', label: 'Текстовый блок', icon: '📝' },
            { type: 'html', label: 'HTML блок', icon: '💻' },
            { type: 'cta', label: 'Призыв к действию', icon: '🔔' },
            { type: 'footer', label: 'Подвал', icon: '📍' },
          ].map(btn => (
            <button
              key={btn.type}
              onClick={() => addBlock(btn.type)}
              className="px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-xs hover:bg-indigo-100 flex items-center gap-2"
            >
              <span>{btn.icon}</span> {btn.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {blocks.map((block, index) => (
          <div key={block.id || index} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-gray-500"># {index + 1}</span>
                <span className="font-medium text-gray-800">
                  {block.type === 'hero' && '🖼️ Hero баннер'}
                  {block.type === 'features' && '⭐ Преимущества'}
                  {block.type === 'services' && '🛠️ Сетка услуг'}
                  {block.type === 'text' && '📝 Текст'}
                  {block.type === 'html' && '💻 HTML'}
                  {block.type === 'cta' && '🔔 CTA'}
                  {block.type === 'footer' && '📍 Подвал'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => moveBlock(index, index - 1)}
                  disabled={index === 0}
                  className="px-2 py-1 text-gray-600 hover:bg-gray-200 rounded disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  onClick={() => moveBlock(index, index + 1)}
                  disabled={index === blocks.length - 1}
                  className="px-2 py-1 text-gray-600 hover:bg-gray-200 rounded disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  onClick={() => removeBlock(index)}
                  className="px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-4">
              {renderBlockEditor(block, index, updateBlockProps, addFeatureItem, removeFeatureItem, updateFeatureItem)}
            </div>
          </div>
        ))}
      </div>

      {blocks.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-xl text-gray-500">
          Добавьте первый блок для начала редактирования
        </div>
      )}
    </div>
  );
}

function renderBlockEditor(block, index, updateBlockProps, addFeatureItem, removeFeatureItem, updateFeatureItem) {
  const { type, props = {} } = block;

  switch (type) {
    case 'hero': {
      const { title = '', subtitle = '', image = '', text = '' } = props;
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Заголовок</label>
            <input
              value={title}
              onChange={e => updateBlockProps(index, 'title', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Подзаголовок</label>
            <input
              value={subtitle}
              onChange={e => updateBlockProps(index, 'subtitle', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL изображения (опционально)</label>
            <input
              value={image}
              onChange={e => updateBlockProps(index, 'image', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Дополнительный текст</label>
            <textarea
              value={text}
              onChange={e => updateBlockProps(index, 'text', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              rows={3}
            />
          </div>
        </div>
      );
    }

    case 'features': {
      const { title = '' } = props;
      const items = Array.isArray(props.items) ? props.items : [];
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Заголовок блока</label>
            <input
              value={title}
              onChange={e => updateBlockProps(index, 'title', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Элементы</label>
              <button onClick={() => addFeatureItem(index)} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200">
                + Добавить элемент
              </button>
            </div>
            <div className="space-y-3">
              {items.map((item, i) => (
                <div key={i} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-start gap-2 mb-2">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500">Иконка</label>
                      <select
                        value={item.icon || '⭐'}
                        onChange={e => updateFeatureItem(index, i, 'icon', e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      >
                        {ICONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-500">Заголовок</label>
                      <input
                        value={item.title || ''}
                        onChange={e => updateFeatureItem(index, i, 'title', e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <button
                      onClick={() => removeFeatureItem(index, i)}
                      className="mt-5 text-red-500 hover:text-red-700"
                    >
                      ✕
                    </button>
                  </div>
                  <label className="text-xs text-gray-500">Описание</label>
                  <input
                    value={item.text || ''}
                    onChange={e => updateFeatureItem(index, i, 'text', e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    case 'text': {
      const { content = '' } = props;
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">HTML/Текст</label>
          <textarea
            value={content}
            onChange={e => updateBlockProps(index, 'content', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
            rows={6}
          />
        </div>
      );
    }

    case 'html': {
      const { html = '' } = props;
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">HTML код</label>
          <textarea
            value={html}
            onChange={e => updateBlockProps(index, 'html', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
            rows={6}
          />
        </div>
      );
    }

    case 'cta': {
      const { text = '', link = '' } = props;
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Текст кнопки</label>
            <input
              value={text}
              onChange={e => updateBlockProps(index, 'text', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ссылка</label>
            <input
              value={link}
              onChange={e => updateBlockProps(index, 'link', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="/register или https://..."
            />
          </div>
        </div>
      );
    }

    case 'footer': {
      const { text = '' } = props;
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Текст подвала</label>
          <input
            value={text}
            onChange={e => updateBlockProps(index, 'text', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      );
    }

    case 'services': {
      const { title = '' } = props;
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Заголовок секции</label>
          <input
            value={title}
            onChange={e => updateBlockProps(index, 'title', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Сетка услуг подгружается автоматически из базы данных
          </p>
        </div>
      );
    }

    default:
      return <div className="text-gray-500">Неизвестный тип блока: {type}</div>;
  }
}
