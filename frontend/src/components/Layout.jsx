import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { path: '/admin/zayavki', label: 'Заявки', icon: '📋' },
  { path: '/orders', label: 'Мои заявки', icon: '👤' },
  { path: '/admin/polzovateli', label: 'Клиенты', icon: '👥' },
  { path: '/admin/uslugi', label: 'Услуги', icon: '⚙️' },
  { path: '/admin/kategorii', label: 'Категории', icon: '🏷️' },
  { path: '/admin/reports', label: 'Отчёты', icon: '📊' },
  { path: '/admin/sotrudniki', label: 'Сотрудники', icon: '👤' },
];

export default function Layout({ children }) {
  const { admin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className={`${collapsed ? 'w-16' : 'w-56'} flex flex-col bg-gray-900 transition-all duration-200 shrink-0`}>
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-gray-800">
          <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-xs text-white shrink-0">S</div>
          {!collapsed && <span className="font-semibold text-white text-sm">IT-Компания</span>}
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {navItems.map(item => {
            const active = location.pathname.startsWith(item.path);
            return (
              <Link key={item.path} to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all
                  ${active
                    ? 'bg-emerald-500 text-white font-medium'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}>
                <span className="text-base shrink-0">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-800">
          {!collapsed && admin && (
            <div className="px-3 py-2.5 rounded-lg bg-gray-800 mb-2">
              <div className="text-xs font-semibold text-white truncate">{admin.imya}</div>
              <div className="text-xs text-gray-500 truncate mt-0.5">{admin.email}</div>
            </div>
          )}
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="flex items-center gap-3 w-full px-3 py-2 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded-lg text-sm transition-all"
          >
            <span className="shrink-0">🚪</span>
            {!collapsed && 'Выйти'}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-gray-200 px-5 flex items-center gap-3 shrink-0">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-gray-400">SARP</span>
            <span className="text-gray-300">/</span>
            <span className="text-gray-700 font-medium">
              {navItems.find(n => location.pathname.startsWith(n.path))?.label || 'Панель'}
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-5">
          {children}
        </main>
      </div>
    </div>
  );
}