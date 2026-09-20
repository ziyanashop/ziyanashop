// Single authentication gateway: one /login, one forwarded port, role-aware routing.
// Google Apps Script is the source of truth for authentication and roles.
const API_URL = String(import.meta.env.VITE_API_URL || '').trim();

const read = (key, fallback = null) => {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; }
};
const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));

const appPrefix = () => {
  const path = window.location.pathname;
  return path.startsWith('/ziyanashop/') ? '/ziyanashop' : '';
};
const route = (path) => {
  const target = `${appPrefix()}${path}` || '/';
  window.location.assign(target);
};

const setAdminSession = (user) => {
  save('ziyana-admin-session', { username: user.identifier, role: 'admin', name: user.name || 'Administrator', at: Date.now() });
  save('ziyana-current-user', { name: user.name || 'Administrator', email: user.identifier, username: user.identifier, role: 'admin' });
  route('/admin');
};

const setUserSession = (user) => {
  const identifier = String(user.identifier || '').trim();
  const sessionUser = {
    ...user,
    name: user.name || 'Customer',
    email: user.email || (identifier.includes('@') ? identifier.toLowerCase() : ''),
    phone: user.phone || (identifier.includes('@') ? '' : identifier),
    role: 'user',
    addresses: Array.isArray(user.addresses) ? user.addresses : [],
  };
  save('ziyana-current-user', sessionUser);
  const users = read('ziyana-users', []);
  const index = users.findIndex((item) => item.email === sessionUser.email || item.phone === sessionUser.phone);
  if (index >= 0) users[index] = { ...users[index], ...sessionUser };
  else users.push(sessionUser);
  save('ziyana-users', users);
  route('/account');
};

const authenticateRemote = async (identity, password) => {
  if (!API_URL) return { ok: false, error: 'Authentication service is not configured. Set VITE_API_URL and restart Vite.' };
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'authenticate', identifier: identity, password }),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) return { ok: false, error: result?.error || 'Authentication service unavailable.' };
    return result || { ok: false, error: 'Authentication service returned an invalid response.' };
  } catch {
    return { ok: false, error: 'Could not reach the authentication service. Check VITE_API_URL and the Apps Script deployment.' };
  }
};

const getLoginFields = (form) => {
  const inputs = [...form.querySelectorAll('input')];
  const passwordInput = inputs.find((input) => input.type === 'password');
  const identityInput = inputs.find((input) => input !== passwordInput);
  return { identity: identityInput?.value?.trim() || '', password: passwordInput?.value || '' };
};

const showError = (form, message) => {
  const existing = form.querySelector('.error');
  if (existing) { existing.textContent = message; return; }
  const p = document.createElement('p');
  p.className = 'error';
  p.textContent = message;
  const button = form.querySelector('button[type=submit], button:not([type])');
  if (button) form.insertBefore(p, button);
};

const authenticateAndRoute = async (form, event) => {
  const submitterText = String(event.submitter?.textContent || '').toLowerCase();
  // Let the existing React handler handle password-reset submissions.
  if (submitterText.includes('update password')) return;
  const { identity, password } = getLoginFields(form);
  if (!identity || !password) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (form.dataset.authBusy === '1') return;
  form.dataset.authBusy = '1';

  const button = form.querySelector('button[type=submit], button:not([type])');
  const original = button?.textContent;
  if (button) { button.disabled = true; button.textContent = 'Signing in…'; }

  const result = await authenticateRemote(identity, password);
  if (result?.ok && String(result.user?.role).toLowerCase() === 'admin') return setAdminSession(result.user);
  if (result?.ok && String(result.user?.role).toLowerCase() === 'user') return setUserSession(result.user);

  form.dataset.authBusy = '0';
  if (button) { button.disabled = false; button.textContent = original || 'Sign in'; }
  showError(form, result?.error || 'Email/phone or password is incorrect.');
};

const bindForm = (form) => {
  if (!(form instanceof HTMLFormElement) || form.dataset.authRouterBound === '1') return;
  form.dataset.authRouterBound = '1';
  form.addEventListener('submit', (event) => {
    if (window.location.pathname.endsWith('/login') || window.location.pathname === '/login') authenticateAndRoute(form, event);
  }, true);
};

const scanLogin = () => {
  if (!window.location.pathname.endsWith('/login') && window.location.pathname !== '/login') return;
  document.querySelectorAll('form.auth-form').forEach(bindForm);
};
scanLogin();
new MutationObserver(scanLogin).observe(document.documentElement, { childList: true, subtree: true });

// Never expose the admin panel unless an authenticated admin session exists.
if ((window.location.pathname === '/admin' || window.location.pathname.endsWith('/admin')) && read('ziyana-admin-session')?.role !== 'admin') {
  route('/login');
}
