const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const getToken = () => localStorage.getItem('token');

const request = async (url, options = {}) => {
  const token = getToken();
  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Ошибка сервера' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
};

export const api = {
  // ============================================
  // Auth
  // ============================================
  login: (data) => request('/api/login', { method: 'POST', body: JSON.stringify(data) }),
  register: (data) => request('/api/register', { method: 'POST', body: JSON.stringify(data) }),

  // ============================================
  // Admins (только для админов)
  // ============================================
  getAdmins: () => request('/api/admin/admins'),
  updateAdminRole: (id, role) => request(`/api/admin/admins/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),
  blockUser: (id, reason) => request(`/api/admin/admins/${id}/block`, { 
    method: 'POST', 
    body: JSON.stringify({ reason: reason }) 
}),
unblockUser: (id) => request(`/api/admin/admins/${id}/unblock`, { method: 'POST' }),
deleteKategoriya: (id) => request(`/api/admin/kategorii/${id}`, { method: 'DELETE' }),

  // ============================================
  // Managers (только для админов)
  // ============================================
  getManagers: () => request('/api/admin/managers'),
  assignManagerToZayavka: (zayavkaId, managerId) => 
    request(`/api/admin/zayavki/${zayavkaId}/assign-manager`, { 
      method: 'POST', 
      body: JSON.stringify({ manager_id: managerId }) 
    }),


    // Acts
// Acts
getActsForUser: (zayavkaId) => request(`/api/zayavki/${zayavkaId}/acts`),
getActs: (zayavkaId) => request(`/api/admin/zayavki/${zayavkaId}/acts`),
createAct: (zayavkaId) => request(`/api/admin/zayavki/${zayavkaId}/acts`, { method: 'POST' }),
getAct: (actId) => request(`/api/acts/${actId}`),
deleteAct: (actId) => request(`/api/acts/${actId}`, { method: 'DELETE' }),
updateActStatus: (actId, status) => request(`/api/admin/acts/${actId}/status`, { 
  method: 'PUT', 
  body: JSON.stringify({ status: status }) 
}),
downloadAct: (actId) => {
    const token = localStorage.getItem('token');
    // Открываем в новом окне с токеном в URL
    window.open(`http://localhost:8080/api/acts/${actId}/download?token=${token}`, '_blank');
    
},
  // ============================================
  // Users (только для админов)
  // ============================================
  getPolzovateli: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/admin/polzovateli${query ? `?${query}` : ''}`);
  },
  getPolzovatel: (id) => request(`/api/admin/polzovateli/${id}`),
  updatePolzovatel: (id, data) => request(`/api/admin/polzovateli/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePolzovatel: (id) => request(`/api/admin/polzovateli/${id}`, { method: 'DELETE' }),

  // ============================================
  // My Profile (для пользователя)
  // ============================================
  getMyProfile: () => request('/api/my/profile'),
  updateMyProfile: (data) => request('/api/my/profile', { method: 'PUT', body: JSON.stringify(data) }),

  // ============================================
  // Uslugi (доступно всем, создание/изменение - только админам)
  // ============================================
  getUslugi: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/uslugi${query ? `?${query}` : ''}`);
  },
  createUslugi: (data) => request('/api/admin/uslugi', { method: 'POST', body: JSON.stringify(data) }),
  updateUslugi: (id, data) => request(`/api/admin/uslugi/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUslugi: (id) => request(`/api/admin/uslugi/${id}`, { method: 'DELETE' }),

  // ============================================
  // Uslugi Params (параметры услуг)
  // ============================================
  getUslugiParams: (uslugaId) => {
    console.log('📡 getUslugiParams вызван для ID:', uslugaId);
    return request(`/api/uslugi/${uslugaId}/params`);
  },
  createUslugiParam: (data) => request('/api/admin/uslugi-params', { method: 'POST', body: JSON.stringify(data) }),
  updateUslugiParam: (id, data) => request(`/api/admin/uslugi-params/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUslugiParam: (id) => request(`/api/admin/uslugi-params/${id}`, { method: 'DELETE' }),

  // ============================================
  // Kategorii
  // ============================================
  getKategorii: () => request('/api/kategorii'),
  createKategoriya: (data) => request('/api/admin/kategorii', { method: 'POST', body: JSON.stringify(data) }),

  // ============================================
  // Zayavki (доступно админам и менеджерам)
  // ============================================
  getZayavki: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/admin/zayavki${query ? `?${query}` : ''}`);
  },
  getZayavka: (id) => request(`/api/zayavki/${id}`),  // Для пользователя
  getAdminZayavka: (id) => request(`/api/admin/zayavki/${id}`), // Для админа
  updateStatus: (id, status) => request(`/api/admin/zayavki/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  updateTsena: (id, tsena) => request(`/api/admin/zayavki/${id}/tsena`, { method: 'PUT', body: JSON.stringify({ tsena }) }),
  deleteZayavka: (id) => request(`/api/admin/zayavki/${id}`, { method: 'DELETE' }),

  // ============================================
  // My Zayavki (для обычных пользователей)
  // ============================================
  createZayavka: (data) => request('/api/zayavki', { method: 'POST', body: JSON.stringify(data) }),
  getMyZayavki: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/my/zayavki${query ? `?${query}` : ''}`);
  },

  // ============================================
  // Reports (только для админов)
  // ============================================
  getReport: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/admin/reports${query ? `?${query}` : ''}`);
  },
  // Reports
getReport: (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request(`/api/admin/reports${query ? `?${query}` : ''}`);
},
getPriceListReport: () => request('/api/admin/reports/price-list'),  // Добавить
getOrderDetailsReport: (orderId) => request(`/api/admin/reports/order-details/${orderId}`),

  // ============================================
  // Welcome Page (чтение - всем, запись - только админам)
  // ============================================
  getWelcomePage: () => request('/api/welcome'),
  updateWelcomePage: (data) => request('/api/admin/welcome', { method: 'PUT', body: JSON.stringify(data) }),

  // ============================================
  // Order Files & Chat (для работы с заказами)
  // ============================================
  
  // Версии ТЗ
  getTzVersions: (zayavkaId) => request(`/api/zayavki/${zayavkaId}/versions`),
  createTzVersion: (zayavkaId, data) => request(`/api/zayavki/${zayavkaId}/versions`, { 
    method: 'POST', 
    body: JSON.stringify(data) 
  }),
  
  // Файлы
  getOrderFiles: (zayavkaId) => request(`/api/zayavki/${zayavkaId}/files`),
  uploadOrderFile: async (zayavkaId, file) => {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_URL}/api/zayavki/${zayavkaId}/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Ошибка загрузки файла');
    }
    return response.json();
  },
  downloadFile: (fileId) => {
    const token = getToken();
    window.open(`${API_URL}/api/download/${fileId}?token=${token}`, '_blank');
  },
  
  // Чат
  getOrderMessages: (zayavkaId) => request(`/api/zayavki/${zayavkaId}/messages`),
  sendOrderMessage: (zayavkaId, data) => request(`/api/zayavki/${zayavkaId}/messages`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
};

// ============================================
// Функции для работы с ролями
// ============================================

export function getUserRole() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return decoded.role || 'user';
  } catch (err) {
    console.error('Ошибка декодирования токена:', err);
    return null;
  }
}

export function getUserId() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return decoded.admin_id || decoded.user_id || null;
  } catch (err) {
    console.error('Ошибка декодирования токена:', err);
    return null;
  }
}

export function isAdmin() {
  const role = getUserRole();
  return role === 'admin';
}

export function isManager() {
  const role = getUserRole();
  return role === 'manager';
}

export function canManageZayavki() {
  const role = getUserRole();
  return role === 'admin' || role === 'manager';
}