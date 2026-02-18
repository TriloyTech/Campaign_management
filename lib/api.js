let _activeOrgId = null;
let _userRole = null;

export function setApiContext(orgId, role) {
  _activeOrgId = orgId;
  _userRole = role;
}

export function getApiContext() {
  return { orgId: _activeOrgId, role: _userRole };
}

export async function apiFetch(method, path, data) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  let finalPath = path;
  // For super_admin, auto-append organizationId
  if (_userRole === 'super_admin' && _activeOrgId) {
    finalPath = path.includes('?')
      ? `${path}&organizationId=${_activeOrgId}`
      : `${path}?organizationId=${_activeOrgId}`;
  }
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
  if (data && method !== 'GET') opts.body = JSON.stringify(data);
  const res = await fetch(`/api/${finalPath}`, opts);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Request failed');
  return json;
}

export function formatBDT(amount) {
  return `\u09f3 ${Number(amount || 0).toLocaleString()}`;
}

export function getStatusColor(status) {
  switch (status) {
    case 'delivered': return 'bg-emerald-100 text-emerald-800';
    case 'review': return 'bg-blue-100 text-blue-800';
    case 'in_progress': return 'bg-amber-100 text-amber-800';
    case 'pending': return 'bg-gray-100 text-gray-600';
    case 'active': return 'bg-emerald-100 text-emerald-800';
    case 'paused': return 'bg-amber-100 text-amber-800';
    case 'completed': return 'bg-blue-100 text-blue-800';
    default: return 'bg-gray-100 text-gray-600';
  }
}

export function getStatusLabel(status) {
  return status?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || '';
}
