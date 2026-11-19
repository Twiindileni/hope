const TOKEN_KEY = 'hopefc_token';

export const auth = {
  get token() { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set(token) { try { localStorage.setItem(TOKEN_KEY, token); } catch { /* ignore */ } },
  clear() { try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } },
};

export async function api(path, { method = 'GET', body, raw } = {}) {
  const headers = {};
  if (auth.token) headers.Authorization = `Bearer ${auth.token}`;
  if (body && !raw) headers['Content-Type'] = 'application/json';
  const res = await fetch(`/api${path}`, { method, headers, body: raw ? body : body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== '/auth/login') {
    auth.clear();
    window.dispatchEvent(new Event('hopefc:logout'));
  }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export async function uploadImage(file) {
  const fd = new FormData();
  fd.append('file', file);
  const { url } = await api('/upload', { method: 'POST', body: fd, raw: true });
  return url;
}
