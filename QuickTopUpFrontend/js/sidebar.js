// ============================================
// QuickTopUp — Sidebar partial
// Injects the app shell nav into any page with a <div id="sidebar-root">
// ============================================

const NAV_ITEMS = [
  { href: 'dashboard.html', label: 'Dashboard', icon: 'grid' },
  { href: 'wallet.html', label: 'Wallet', icon: 'wallet' },
  { href: 'airtime.html', label: 'Airtime', icon: 'phone' },
  { href: 'data.html', label: 'Data', icon: 'signal' },
  { href: 'cable.html', label: 'Cable TV', icon: 'tv' },
  { href: 'electricity.html', label: 'Electricity', icon: 'bolt' },
  { href: 'history.html', label: 'History', icon: 'clock' },
];

const ICONS = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  wallet: '<rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="17" cy="14" r="1.4" fill="currentColor" stroke="none"/>',
  phone: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 18h4"/>',
  signal: '<path d="M3 20h2v-4H3v4zM8 20h2v-9H8v9zM13 20h2v-14h-2v14zM18 20h2V4h-2v16z"/>',
  tv: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M8 21h8M12 19v2"/>',
  bolt: '<path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
};

function svgIcon(name, cls = 'nav__icon') {
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}

function renderSidebar() {
  const root = document.getElementById('sidebar-root');
  if (!root) return;

  const navHtml = NAV_ITEMS.map(
    (item) => `
    <a class="nav__link" href="${item.href}">
      ${svgIcon(item.icon)}
      <span>${item.label}</span>
    </a>`
  ).join('');

  root.innerHTML = `
    <aside class="sidebar">
      <div class="brand">
        <div class="brand__mark">Q</div>
        <span class="brand__name">QuickTopUp</span>
      </div>
      <nav class="nav" aria-label="Main navigation">
        ${navHtml}
      </nav>
      <div class="nav__footer">
        <button class="signout-btn" data-signout type="button">
          <svg class="nav__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>
          <span>Sign out</span>
        </button>
      </div>
    </aside>
    <div class="scrim"></div>
  `;
}

function renderMobileTopbar(title) {
  const root = document.getElementById('mobile-topbar-root');
  if (!root) return;
  root.innerHTML = `
    <div class="mobile-topbar">
      <button class="menu-toggle" aria-label="Open menu">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
      </button>
      <span class="brand__name" style="font-size: var(--text-base);">${title || 'QuickTopUp'}</span>
      <div style="width:36px;"></div>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', () => {
  renderSidebar();
  if (document.body.dataset.pageTitle) {
    renderMobileTopbar(document.body.dataset.pageTitle);
  }
  highlightActiveNav();
  initMobileNav();
  wireSignOut();
});
