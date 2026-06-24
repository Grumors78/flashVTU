// ============================================
// QuickTopUp — Shared UI helpers
// ============================================

function formatNaira(amount) {
  const n = Number(amount) || 0;
  return n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-NG', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function showToast(message, type = 'success') {
  let stack = document.querySelector('.toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    document.body.appendChild(stack);
  }
  const toast = document.createElement('div');
  toast.className = `toast is-${type}`;
  toast.textContent = message;
  stack.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 200ms ease';
    setTimeout(() => toast.remove(), 200);
  }, 3600);
}

function setButtonLoading(button, isLoading, loadingText = 'Please wait…') {
  if (isLoading) {
    button.dataset.originalText = button.innerHTML;
    button.innerHTML = `<span class="spinner"></span> ${loadingText}`;
    button.disabled = true;
  } else {
    button.innerHTML = button.dataset.originalText || button.innerHTML;
    button.disabled = false;
  }
}

/** Highlights the current page's nav link based on the file name. */
function highlightActiveNav() {
  const current = location.pathname.split('/').pop() || 'dashboard.html';
  document.querySelectorAll('.nav__link').forEach((link) => {
    const href = link.getAttribute('href');
    link.classList.toggle('is-active', href === current);
  });
}

/** Wires up the mobile sidebar toggle + scrim, if present on the page. */
function initMobileNav() {
  const toggle = document.querySelector('.menu-toggle');
  const sidebar = document.querySelector('.sidebar');
  const scrim = document.querySelector('.scrim');
  if (!toggle || !sidebar || !scrim) return;

  const open = () => { sidebar.classList.add('is-open'); scrim.classList.add('is-visible'); };
  const close = () => { sidebar.classList.remove('is-open'); scrim.classList.remove('is-visible'); };

  toggle.addEventListener('click', open);
  scrim.addEventListener('click', close);
  sidebar.querySelectorAll('a, button').forEach((el) => el.addEventListener('click', close));
}

/** Populates the user's name/email in the header if elements with these ids exist. */
function renderUserChip() {
  const user = getStoredUser();
  const nameEl = document.querySelector('[data-user-name]');
  const emailEl = document.querySelector('[data-user-email]');
  const initialEl = document.querySelector('[data-user-initial]');
  if (user) {
    if (nameEl) nameEl.textContent = user.name;
    if (emailEl) emailEl.textContent = user.email;
    if (initialEl) initialEl.textContent = (user.name || '?').charAt(0).toUpperCase();
  }
}

function wireSignOut() {
  document.querySelectorAll('[data-signout]').forEach((btn) => {
    btn.addEventListener('click', () => {
      clearToken();
      location.href = 'login.html';
    });
  });
}

/** Redirects to login if there is no token. Call at the top of protected pages. */
function requireAuth() {
  if (!getToken()) {
    location.href = 'login.html';
  }
}

/** Redirects away from auth pages if already logged in. */
function redirectIfAuthed() {
  if (getToken()) {
    location.href = 'dashboard.html';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  highlightActiveNav();
  initMobileNav();
  renderUserChip();
  wireSignOut();
});
