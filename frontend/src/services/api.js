const API_BASE = '/api';

function getHeaders(type = 'viewer') {
  const headers = { 'Content-Type': 'application/json' };
  const password = sessionStorage.getItem(type === 'admin' ? 'adminPassword' : 'viewerPassword');
  if (password) {
    headers[type === 'admin' ? 'x-admin-password' : 'x-viewer-password'] = password;
  }
  return headers;
}

export async function verifyPassword(password, type) {
  const res = await fetch(`${API_BASE}/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password, type }),
  });
  return res.json();
}

export async function logTime(viewerId) {
  const res = await fetch(`${API_BASE}/time/log`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ viewerId }),
  });
  return res.json();
}

export async function setUsername(viewerId, username) {
  const res = await fetch(`${API_BASE}/time/set-username`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ viewerId, username }),
  });
  return res.json();
}

export async function getViewer(viewerId) {
  const res = await fetch(`${API_BASE}/time/viewer/${viewerId}`, {
    headers: getHeaders(),
  });
  return res.json();
}

export async function searchTracks(query) {
  const res = await fetch(`${API_BASE}/requests/search?q=${encodeURIComponent(query)}`, {
    headers: getHeaders(),
  });
  return res.json();
}

export async function submitRequest(data) {
  const res = await fetch(`${API_BASE}/requests/submit`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getApprovedRequests() {
  const res = await fetch(`${API_BASE}/requests/approved`, {
    headers: getHeaders(),
  });
  return res.json();
}

// Admin APIs
export async function getAdminRequests(status) {
  const url = status 
    ? `${API_BASE}/admin/requests?status=${status}` 
    : `${API_BASE}/admin/requests`;
  const res = await fetch(url, { headers: getHeaders('admin') });
  return res.json();
}

export async function approveRequest(id) {
  const res = await fetch(`${API_BASE}/admin/requests/${id}/approve`, {
    method: 'POST',
    headers: getHeaders('admin'),
  });
  return res.json();
}

export async function rejectRequest(id) {
  const res = await fetch(`${API_BASE}/admin/requests/${id}/reject`, {
    method: 'POST',
    headers: getHeaders('admin'),
  });
  return res.json();
}

export async function getViewers() {
  const res = await fetch(`${API_BASE}/admin/viewers`, {
    headers: getHeaders('admin'),
  });
  return res.json();
}

export async function toggleRegular(id) {
  const res = await fetch(`${API_BASE}/admin/viewers/${id}/toggle-regular`, {
    method: 'POST',
    headers: getHeaders('admin'),
  });
  return res.json();
}

export async function clearOverlay() {
  const res = await fetch(`${API_BASE}/admin/overlay/clear`, {
    method: 'POST',
    headers: getHeaders('admin'),
  });
  return res.json();
}

