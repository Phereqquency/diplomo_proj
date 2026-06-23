import { useState, useEffect } from 'react';
import { api } from '../api/api';

export function AdminUslugiParams({ uslugaId, uslugaName, onClose }) {
  const [params, setParams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingParam, setEditingParam] = useState(null);
  const [form, setForm] = useState({
    param_name: '',
    param_type: 'text',
    param_options: '',
    is_required: false,
    sort_order: 0,
    price: 0
  });

  useEffect(() => {
    if (uslugaId) {
      loadParams();
    }
  }, [uslugaId]);

  const loadParams = async () => {
    setLoading(true);
    try {
      const data = await api.getUslugiParams(uslugaId);
      setParams(data || []);
    } catch (err) {
      console.error('Ошибка загрузки параметров:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.param_name.trim()) {
      alert('Введите название параметра');
      return;
    }
    try {
      await api.createUslugiParam({
        usluga_id: uslugaId,
        param_name: form.param_name,
        param_type: form.param_type,
        param_options: form.param_options,
        is_required: form.is_required,
        sort_order: form.sort_order,
        price: form.price
      });
      setForm({ param_name: '', param_type: 'text', param_options: '', is_required: false, sort_order: 0, price: 0 });
      loadParams();
    } catch (err) {
      alert('Ошибка: ' + err.message);
    }
  };

  const handleUpdate = async () => {
    try {
      await api.updateUslugiParam(editingParam.id, editingParam);
      setEditingParam(null);
      loadParams();
    } catch (err) {
      alert('Ошибка: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить параметр?')) return;
    try {
      await api.deleteUslugiParam(id);
      loadParams();
    } catch (err) {
      alert('Ошибка: ' + err.message);
    }
  };

  const getTypeName = (type) => {
    switch (type) {
      case 'text': return 'Текстовое поле';
      case 'textarea': return 'Большое текстовое поле';
      case 'select': return 'Выпадающий список';
      case 'radio': return 'Радио-кнопки';
      default: return type;
    }
  };

  const handleModalContentClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={handleModalContentClick}
      >
        <div className="flex justify-between items-center p-4 border-b bg-gray-50 shrink-0">
          <h2 className="text-xl font-bold">Параметры услуги: {uslugaName}</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 text-2xl w-8 h-8 flex items-center justify-center rounded hover:bg-gray-200"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {/* Форма добавления параметра */}
          <div className="border rounded-lg p-4 mb-6 bg-gray-50">
            <h3 className="font-semibold mb-3">Добавить параметр</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Название параметра</label>
                <input
                  type="text"
                  value={form.param_name}
                  onChange={e => setForm({ ...form, param_name: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="Например: Цвет, Стиль, Размер"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Тип поля</label>
                <select
                  value={form.param_type}
                  onChange={e => setForm({ ...form, param_type: e.target.value, param_options: '' })}
                  className="w-full border rounded px-3 py-2 text-sm"
                >
                  <option value="text">Текстовое поле</option>
                  <option value="textarea">Большое текстовое поле</option>
                  <option value="select">Выпадающий список</option>
                  <option value="radio">Радио-кнопки</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Порядок сортировки</label>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Цена (BYN)</label>
                <input
                  type="number"
                  value={form.price}
                  onChange={e => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="0"
                />
              </div>
              {(form.param_type === 'select' || form.param_type === 'radio') && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    Варианты (через |)
                  </label>
                  <input
                    type="text"
                    value={form.param_options}
                    onChange={e => setForm({ ...form, param_options: e.target.value })}
                    className="w-full border rounded px-3 py-2 text-sm"
                    placeholder="Красный|Синий|Зеленый"
                  />
                  <p className="text-xs text-gray-400 mt-1">Пример: Вариант1|Вариант2|Вариант3</p>
                </div>
              )}
              <div className="col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_required}
                    onChange={e => setForm({ ...form, is_required: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Обязательный параметр</span>
                </label>
              </div>
            </div>
            <button
              onClick={handleCreate}
              className="mt-3 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700"
            >
              + Добавить параметр
            </button>
          </div>

          {/* Список параметров */}
          <h3 className="font-semibold mb-3">Существующие параметры ({params.length})</h3>
          {loading ? (
            <div className="text-center py-8">Загрузка...</div>
          ) : params.length === 0 ? (
            <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg">
              📋 Нет параметров для этой услуги
            </div>
          ) : (
            <div className="space-y-3">
              {params.map(p => (
                <div key={p.id} className="border rounded-lg p-4 bg-white hover:shadow-sm transition">
                  {editingParam?.id === p.id ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editingParam.param_name}
                        onChange={e => setEditingParam({ ...editingParam, param_name: e.target.value })}
                        className="w-full border rounded px-3 py-2 text-sm"
                      />
                      <div className="grid grid-cols-3 gap-3">
                        <select
                          value={editingParam.param_type}
                          onChange={e => setEditingParam({ ...editingParam, param_type: e.target.value })}
                          className="border rounded px-3 py-2 text-sm"
                        >
                          <option value="text">Текстовое поле</option>
                          <option value="textarea">Большое текстовое поле</option>
                          <option value="select">Выпадающий список</option>
                          <option value="radio">Радио-кнопки</option>
                        </select>
                        <input
                          type="number"
                          value={editingParam.sort_order}
                          onChange={e => setEditingParam({ ...editingParam, sort_order: parseInt(e.target.value) || 0 })}
                          className="border rounded px-3 py-2 text-sm"
                          placeholder="Порядок"
                        />
                        <input
                          type="number"
                          value={editingParam.price}
                          onChange={e => setEditingParam({ ...editingParam, price: parseFloat(e.target.value) || 0 })}
                          className="border rounded px-3 py-2 text-sm"
                          placeholder="Цена"
                        />
                      </div>
                      {(editingParam.param_type === 'select' || editingParam.param_type === 'radio') && (
                        <input
                          type="text"
                          value={editingParam.param_options || ''}
                          onChange={e => setEditingParam({ ...editingParam, param_options: e.target.value })}
                          className="w-full border rounded px-3 py-2 text-sm"
                          placeholder="Варианты (через |)"
                        />
                      )}
                      <div className="flex justify-between items-center">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={editingParam.is_required}
                            onChange={e => setEditingParam({ ...editingParam, is_required: e.target.checked })}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">Обязательный</span>
                        </label>
                        <div className="flex gap-2">
                          <button onClick={handleUpdate} className="bg-green-600 text-white px-3 py-1 rounded text-sm">Сохранить</button>
                          <button onClick={() => setEditingParam(null)} className="bg-gray-300 px-3 py-1 rounded text-sm">Отмена</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-gray-800">{p.param_name}</div>
                        <div className="text-sm text-gray-500 mt-1">
                          Тип: {getTypeName(p.param_type)}
                          {p.is_required && <span className="ml-2 text-red-500 inline-flex items-center gap-1">🔴 Обязательный</span>}
                          {p.price > 0 && <span className="ml-2 text-green-600">💰 {p.price.toLocaleString()} BYN</span>}
                        </div>
                        {p.param_options && (
                          <div className="text-xs text-gray-400 mt-1">
                            Варианты: {p.param_options.split('|').join(', ')}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setEditingParam({ ...p })} className="text-indigo-600 hover:text-indigo-800 text-sm">✏️ Изменить</button>
                        <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:text-red-800 text-sm">🗑️ Удалить</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}