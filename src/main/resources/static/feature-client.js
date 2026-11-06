/* Shared client for the self-contained Fav + Admin-Report module.
   Session cookies are HTTP-only; the password is not kept in localStorage. */
window.FeatureClient = {
  async session() {
    const r = await fetch('/api/feature-session/me', { credentials: 'same-origin' });
    if (r.status === 401) return null;
    if (!r.ok) throw new Error('Could not read account (' + r.status + ')');
    return r.json();
  },
  async request(path, method = 'GET', csrf = null, body = null) {
    const headers = {};
    if (csrf) headers['X-CSRF-Token'] = csrf;
    if (body) headers['Content-Type'] = 'application/json';
    const r = await fetch(path, {
      method, headers, credentials: 'same-origin',
      body: body ? JSON.stringify(body) : undefined
    });
    if (!r.ok) {
      if (r.status === 401) throw new Error('Please sign in first.');
      if (r.status === 403) throw new Error('Permission denied or session expired.');
      if (r.status === 404) throw new Error('This item is no longer available.');
      throw new Error('Request failed (' + r.status + ')');
    }
    return r.status === 204 ? null : r.json();
  },
  loginUrl(next = location.pathname + location.search) {
    return 'login.html?next=' + encodeURIComponent(next);
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  const nav = document.querySelector('.nav-links');
  if (!nav) return;

  try {
    const account = await FeatureClient.session();

    nav.querySelectorAll('a').forEach(link => {
      if (new URL(link.href).pathname === '/admin-reports.html') {
        link.remove();
      }
    });

    if (account?.role === 'USER_ADMIN') {
      const link = document.createElement('a');
      link.href = '/admin-reports.html';
      link.textContent = 'Admin Reports';
      nav.appendChild(link);
    }

  } catch (error) {
    console.warn('Navigation session check failed', error);
  }
});