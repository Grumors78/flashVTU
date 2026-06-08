const state = {
  token: localStorage.getItem('flashToken') || null,
  profile: null,
  wallet: { balance: 0, currency: 'NGN' },
  transactions: [],
  selectedDataPlan: null,
  filter: 'all',
};

const DATA_PACKAGES = {
  mtn: [
    { name: 'Daily 100MB', amount: 100, code: 'MTN_DAILY_100' },
    { name: 'Weekly 1.5GB', amount: 500, code: 'MTN_WEEKLY_1_5' },
    { name: 'Monthly 10GB', amount: 4500, code: 'MTN_MONTHLY_10' },
  ],
  glo: [
    { name: 'Daily 150MB', amount: 120, code: 'GLO_DAILY_150' },
    { name: 'Weekly 2GB', amount: 600, code: 'GLO_WEEKLY_2' },
    { name: 'Monthly 12GB', amount: 5200, code: 'GLO_MONTHLY_12' },
  ],
  airtel: [
    { name: 'Daily 200MB', amount: 150, code: 'AIRTEL_DAILY_200' },
    { name: 'Weekly 2.5GB', amount: 650, code: 'AIRTEL_WEEKLY_2_5' },
    { name: 'Monthly 15GB', amount: 6200, code: 'AIRTEL_MONTHLY_15' },
  ],
  '9mobile': [
    { name: 'Daily 120MB', amount: 130, code: '9MOBILE_DAILY_120' },
    { name: 'Weekly 2GB', amount: 620, code: '9MOBILE_WEEKLY_2' },
    { name: 'Monthly 13GB', amount: 5900, code: '9MOBILE_MONTHLY_13' },
  ],
};

const formSelectors = {
  loginForm: document.getElementById('loginForm'),
  registerForm: document.getElementById('registerForm'),
  airtimeForm: document.getElementById('airtimeForm'),
  dataFilterForm: document.getElementById('dataFilterForm'),
  dataPurchaseForm: document.getElementById('dataPurchaseForm'),
  cableForm: document.getElementById('cableForm'),
  electricityForm: document.getElementById('electricityForm'),
  fundForm: document.getElementById('fundForm'),
};

const sections = Array.from(document.querySelectorAll('.page'));
const navItems = Array.from(document.querySelectorAll('.nav-item[data-view]'));
const authBtn = document.getElementById('authBtn');
const toastEl = document.getElementById('toast');
const navLinks = document.getElementById('navLinks');
const navToggle = document.getElementById('navToggle');
const paymentModal = document.getElementById('paymentModal');

async function request(path, options = {}) {
  const url = window.BACKEND_URL.replace(/\/$/, '') + path;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (error) {
    data = { message: text };
  }

  if (!res.ok) {
    throw new Error(data.message || `Request failed with ${res.status}`);
  }

  return data;
}

function showToast(message, type = 'info') {
  toastEl.textContent = message;
  toastEl.className = `toast ${type === 'success' ? 'toast-success' : type === 'danger' ? 'toast-danger' : ''}`;
  toastEl.classList.remove('hidden');
  clearTimeout(window.toastTimeout);
  window.toastTimeout = setTimeout(() => toastEl.classList.add('hidden'), 3500);
}

function toggleNav() {
  navLinks.classList.toggle('open');
}

function setActiveNav(view) {
  navItems.forEach((button) => {
    button.classList.toggle('active', button.dataset.view === view);
  });
}

function setPage(view) {
  if (['dashboard', 'airtime', 'data', 'cable', 'electricity', 'wallet', 'history'].includes(view) && !state.token) {
    showToast('Please sign in to access this section.', 'danger');
    view = 'auth';
  }

  sections.forEach((section) => {
    section.classList.toggle('active', section.id === view);
  });
  setActiveNav(view);
  if (navLinks.classList.contains('open')) {
    navLinks.classList.remove('open');
  }

  if (view === 'dashboard') {
    refreshDashboard();
  }
  if (view === 'history') {
    loadTransactions();
  }
}

function showAuthButton() {
  authBtn.textContent = state.token ? 'Account' : 'Sign In';
}

function updateProfileUI() {
  if (state.token && state.profile) {
    authBtn.textContent = state.profile.name;
  }
}

function setLoggedOut() {
  state.token = null;
  state.profile = null;
  localStorage.removeItem('flashToken');
  showToast('Logged out successfully', 'success');
  showAuthButton();
  setPage('landing');
}

async function loadProfile() {
  if (!state.token) {
    return;
  }
  try {
    const data = await request('/api/auth/me');
    state.profile = data;
    state.wallet = data.wallet || state.wallet;
    updateProfileUI();
    updateWalletSummary();
  } catch (error) {
    console.error(error);
    setLoggedOut();
  }
}

async function loadTransactions() {
  if (!state.token) return;
  try {
    const transactions = await request('/api/transactions');
    state.transactions = Array.isArray(transactions) ? transactions : [];
    renderTransactionHistory();
    renderRecentTransactions();
  } catch (error) {
    showToast(error.message, 'danger');
  }
}

function updateWalletSummary() {
  const balanceEl = document.getElementById('walletBalance');
  const currencyEl = document.getElementById('walletCurrency');
  balanceEl.textContent = `NGN ${Number(state.wallet.balance || 0).toLocaleString()}`;
  currencyEl.textContent = state.wallet.currency || 'NGN';
}

function renderRecentTransactions() {
  const body = document.getElementById('recentTransactionsBody');
  const latest = state.transactions.slice(0, 5);
  body.innerHTML = latest.length ? latest.map((tx) => {
    return `<tr>
      <td>${new Date(tx.createdAt).toLocaleDateString()}</td>
      <td>${tx.metadata?.service || tx.type || 'Wallet'}</td>
      <td>NGN ${Number(tx.amount || 0).toLocaleString()}</td>
      <td>${renderBadge(tx.status)}</td>
    </tr>`;
  }).join('') : `<tr><td colspan="4">No recent activity yet.</td></tr>`;
}

function renderTransactionHistory() {
  const body = document.getElementById('historyBody');
  const filtered = state.transactions.filter((tx) => {
    if (state.filter === 'all') return true;
    return tx.status === state.filter;
  });
  body.innerHTML = filtered.length ? filtered.map((tx) => {
    return `<tr>
      <td>${new Date(tx.createdAt).toLocaleDateString()}</td>
      <td>${tx.metadata?.service || tx.type || 'Wallet'}</td>
      <td>NGN ${Number(tx.amount || 0).toLocaleString()}</td>
      <td>${renderBadge(tx.status)}</td>
    </tr>`;
  }).join('') : `<tr><td colspan="4">No transactions found for this filter.</td></tr>`;
}

function renderBadge(status = 'pending') {
  const normalized = status.toLowerCase();
  const label = normalized === 'success' ? 'Success' : normalized === 'failed' ? 'Failed' : 'Pending';
  const className = normalized === 'success' ? 'badge-success' : normalized === 'failed' ? 'badge-failed' : 'badge-pending';
  return `<span class="badge ${className}">${label}</span>`;
}

function refreshDashboard() {
  updateWalletSummary();
  loadTransactions();
}

function activateAuthTab(formId) {
  document.querySelectorAll('.tab-button').forEach((button) => {
    button.classList.toggle('active', button.dataset.form === formId);
  });
  Object.values(formSelectors).forEach((form) => {
    if (form.id === formId) {
      form.classList.add('active');
    } else {
      form.classList.remove('active');
    }
  });
}

function selectDataPlan(plan) {
  state.selectedDataPlan = plan;
  document.getElementById('selectedPlan').value = `${plan.name} — NGN ${plan.amount.toLocaleString()}`;
  document.getElementById('dataAmount').value = plan.amount;
  document.getElementById('dataBundleCode').value = plan.code;
  document.getElementById('dataPurchaseCard').classList.remove('hidden');
}

async function loadDataPlans(network) {
  const container = document.getElementById('dataPlans');
  container.innerHTML = '<div class="plan-card">Loading plans…</div>';
  try {
    const data = await request(`/api/vtu/data-plans?network=${encodeURIComponent(network)}`);
    const plans = data.plans || DATA_PACKAGES[network] || [];
    renderPlans(plans, network);
  } catch (error) {
    showToast('Using sample plans — live plans unavailable.', 'warning');
    renderPlans(DATA_PACKAGES[network] || [], network);
  }
}

function renderPlans(plans, network) {
  const container = document.getElementById('dataPlans');
  if (!plans || plans.length === 0) {
    container.innerHTML = `<div class="plan-card">No plans available for ${network}. Try another network.</div>`;
    return;
  }
  container.innerHTML = plans.map((plan) => {
    return `<article class="plan-card">
      <h4>${plan.name}</h4>
      <p>NGN ${Number(plan.amount).toLocaleString()}</p>
      <button class="button button-secondary small" data-bundle="${plan.code}" data-name="${plan.name}" data-amount="${plan.amount}">Select plan</button>
    </article>`;
  }).join('');
}

function populateCablePackages(service) {
  const packageSelect = document.getElementById('cablePackage');
  const packages = {
    dstv: [{ label: 'Padi', value: 'DSTV_PADI' }, { label: 'Yanga', value: 'DSTV_YANGA' }, { label: 'Compact', value: 'DSTV_COMPACT' }],
    gotv: [{ label: 'Max', value: 'GOTV_MAX' }, { label: 'Jolli', value: 'GOTV_JOLLI' }, { label: 'Smallie', value: 'GOTV_SMALLIE' }],
    startimes: [{ label: 'Basic', value: 'STARTIMES_BASIC' }, { label: 'Classic', value: 'STARTIMES_CLASSIC' }, { label: 'Nova', value: 'STARTIMES_NOVA' }],
  };
  packageSelect.innerHTML = '<option value="">Select package</option>' + (packages[service] || []).map((item) => `<option value="${item.value}">${item.label}</option>`).join('');
}

async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  if (!email || !password) {
    showToast('Email and password are required.', 'danger');
    return;
  }
  try {
    const data = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem('flashToken', data.token);
    state.token = data.token;
    showToast('Login successful!', 'success');
    await loadProfile();
    showAuthButton();
    setPage('dashboard');
  } catch (error) {
    showToast(error.message, 'danger');
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const name = document.getElementById('registerName').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value.trim();
  if (!name || !email || !password) {
    showToast('Name, email, and password are required.', 'danger');
    return;
  }
  try {
    const data = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    localStorage.setItem('flashToken', data.token);
    state.token = data.token;
    showToast('Registration complete! Welcome aboard.', 'success');
    await loadProfile();
    showAuthButton();
    setPage('dashboard');
  } catch (error) {
    showToast(error.message, 'danger');
  }
}

async function handleAirtime(event) {
  event.preventDefault();
  const network = document.getElementById('airtimeNetwork').value;
  const phone = document.getElementById('airtimePhone').value.trim();
  const amount = Number(document.getElementById('airtimeAmount').value);
  if (!network || !phone || !amount) {
    showToast('Complete the airtime form before submitting.', 'danger');
    return;
  }
  try {
    const data = await request('/api/vtu/airtime', {
      method: 'POST',
      body: JSON.stringify({ network, phone, amount }),
    });
    showToast(data.message || 'Airtime purchase submitted.', 'success');
    await loadProfile();
    loadTransactions();
  } catch (error) {
    showToast(error.message, 'danger');
  }
}

async function handleDataFilter(event) {
  event.preventDefault();
  const network = document.getElementById('dataNetwork').value;
  if (!network) {
    showToast('Select a network before loading plans.', 'danger');
    return;
  }
  await loadDataPlans(network);
}

async function handleDataPurchase(event) {
  event.preventDefault();
  if (!state.selectedDataPlan) {
    showToast('Select a data plan first.', 'danger');
    return;
  }
  const network = document.getElementById('dataNetwork').value;
  const phone = document.getElementById('dataPhone').value.trim();
  const bundleCode = document.getElementById('dataBundleCode').value;
  const amount = Number(document.getElementById('dataAmount').value);
  if (!network || !phone || !bundleCode || !amount) {
    showToast('Complete the data purchase details.', 'danger');
    return;
  }
  try {
    const data = await request('/api/vtu/data', {
      method: 'POST',
      body: JSON.stringify({ network, phone, bundleCode, amount }),
    });
    showToast(data.message || 'Data purchase completed.', 'success');
    await loadProfile();
    loadTransactions();
    document.getElementById('dataPurchaseCard').classList.add('hidden');
  } catch (error) {
    showToast(error.message, 'danger');
  }
}

async function handleCable(event) {
  event.preventDefault();
  const service = document.getElementById('cableService').value;
  const smartcardNumber = document.getElementById('smartcardNumber').value.trim();
  const packageCode = document.getElementById('cablePackage').value;
  const amount = Number(document.getElementById('cableAmount').value);
  if (!service || !smartcardNumber || !packageCode || !amount) {
    showToast('Complete the cable payment form.', 'danger');
    return;
  }
  try {
    const data = await request('/api/vtu/cable', {
      method: 'POST',
      body: JSON.stringify({ service, smartcardNumber, packageCode, amount }),
    });
    showToast(data.message || 'Cable payment submitted.', 'success');
    await loadProfile();
    loadTransactions();
  } catch (error) {
    showToast(error.message, 'danger');
  }
}

async function handleElectricity(event) {
  event.preventDefault();
  const distributor = document.getElementById('electricityDistributor').value;
  const meterType = document.getElementById('meterType').value;
  const meterNumber = document.getElementById('meterNumber').value.trim();
  const amount = Number(document.getElementById('electricityAmount').value);
  if (!distributor || !meterType || !meterNumber || !amount) {
    showToast('Complete the electricity payment form.', 'danger');
    return;
  }
  try {
    const data = await request('/api/vtu/electricity', {
      method: 'POST',
      body: JSON.stringify({ distributor, meterNumber, meterType, amount }),
    });
    showToast(data.message || 'Electricity payment submitted.', 'success');
    await loadProfile();
    loadTransactions();
  } catch (error) {
    showToast(error.message, 'danger');
  }
}

function openPaymentModal() {
  paymentModal.classList.remove('hidden');
}

function closePaymentModal() {
  paymentModal.classList.add('hidden');
}

async function confirmPayment() {
  const amount = Number(document.getElementById('fundAmount').value);
  if (!amount || amount < 100) {
    showToast('Enter a valid funding amount.', 'danger');
    return;
  }
  try {
    await request('/api/wallet/fund', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
    showToast('Wallet funding completed!', 'success');
    closePaymentModal();
    await loadProfile();
    loadTransactions();
  } catch (error) {
    showToast(error.message, 'danger');
  }
}

function updateFilterButtons() {
  document.querySelectorAll('.filter-bar .button').forEach((button) => {
    button.classList.toggle('active', button.dataset.filter === state.filter);
  });
}

function bindEvents() {
  navItems.forEach((button) => {
    button.addEventListener('click', () => setPage(button.dataset.view));
  });

  navToggle.addEventListener('click', toggleNav);

  authBtn.addEventListener('click', () => setPage('auth'));

  document.querySelectorAll('[data-action="auth"]').forEach((button) => {
    button.addEventListener('click', () => setPage('auth'));
  });

  document.querySelectorAll('[data-form]').forEach((button) => {
    button.addEventListener('click', () => activateAuthTab(button.dataset.form));
  });

  document.querySelectorAll('[data-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      state.filter = button.dataset.filter;
      updateFilterButtons();
      renderTransactionHistory();
    });
  });

  formSelectors.loginForm.addEventListener('submit', handleLogin);
  formSelectors.registerForm.addEventListener('submit', handleRegister);
  formSelectors.airtimeForm.addEventListener('submit', handleAirtime);
  formSelectors.dataFilterForm.addEventListener('submit', handleDataFilter);
  formSelectors.dataPurchaseForm.addEventListener('submit', handleDataPurchase);
  formSelectors.cableForm.addEventListener('submit', handleCable);
  formSelectors.electricityForm.addEventListener('submit', handleElectricity);
  formSelectors.fundForm.addEventListener('submit', (event) => {
    event.preventDefault();
    openPaymentModal();
  });

  document.getElementById('confirmPayment').addEventListener('click', confirmPayment);
  document.getElementById('cancelPayment').addEventListener('click', closePaymentModal);
  document.getElementById('logoutBtn').addEventListener('click', setLoggedOut);

  document.getElementById('cableService').addEventListener('change', (event) => {
    populateCablePackages(event.target.value);
  });

  document.getElementById('dataPlans').addEventListener('click', (event) => {
    const target = event.target.closest('button[data-bundle]');
    if (!target) return;
    const plan = {
      code: target.dataset.bundle,
      name: target.dataset.name,
      amount: Number(target.dataset.amount),
    };
    selectDataPlan(plan);
    setPage('data');
  });
}

function init() {
  bindEvents();
  if (state.token) {
    loadProfile();
  }
  showAuthButton();
  activateAuthTab('loginForm');
  setPage('landing');
}

init();
