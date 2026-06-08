const axios = require('axios');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';

// Verify JWT_SECRET is set
if (!process.env.JWT_SECRET) {
  console.error('ERROR: JWT_SECRET environment variable is not set!');
  console.error('Set it before running tests: set JWT_SECRET=your_secret_key');
  process.exit(1);
}

// Test user credentials
const testUser = {
  name: 'Test User',
  email: `test-${Date.now()}@test.com`,
  password: 'Test@123',
};

let authToken = null;
let userId = null;

const api = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper to log test results
function logTest(testName, status, message = '') {
  const emoji = status === 'PASS' ? '✓' : '✗';
  console.log(`\n${emoji} ${testName}`);
  if (message) console.log(`  ${message}`);
}

// Test 1: Register User
async function testRegister() {
  try {
    console.log('\n--- Test 1: Register User ---');
    const res = await api.post('/api/auth/register', testUser);
    
    if (res.status === 201 && res.data.id) {
      userId = res.data.id;
      logTest('Register User', 'PASS', `User created: ${res.data.email}`);
      return true;
    } else {
      logTest('Register User', 'FAIL', JSON.stringify(res.data));
      return false;
    }
  } catch (error) {
    logTest('Register User', 'FAIL', error.response?.data?.message || error.message);
    return false;
  }
}

// Test 2: Login User
async function testLogin() {
  try {
    console.log('\n--- Test 2: Login User ---');
    const res = await api.post('/api/auth/login', {
      email: testUser.email,
      password: testUser.password,
    });

    if (res.status === 200 && res.data.token) {
      authToken = res.data.token;
      api.defaults.headers['Authorization'] = `Bearer ${authToken}`;
      logTest('Login User', 'PASS', `Token received: ${authToken.substring(0, 20)}...`);
      return true;
    } else {
      logTest('Login User', 'FAIL', JSON.stringify(res.data));
      return false;
    }
  } catch (error) {
    logTest('Login User', 'FAIL', error.response?.data?.message || error.message);
    return false;
  }
}

// Test 3: Get Profile
async function testGetProfile() {
  try {
    console.log('\n--- Test 3: Get User Profile ---');
    if (!authToken) {
      logTest('Get Profile', 'FAIL', 'No auth token available');
      return false;
    }

    const res = await api.get('/api/auth/me');
    if (res.status === 200 && res.data.name) {
      logTest('Get Profile', 'PASS', `User: ${res.data.name} (${res.data.email})`);
      return true;
    } else {
      logTest('Get Profile', 'FAIL', JSON.stringify(res.data));
      return false;
    }
  } catch (error) {
    logTest('Get Profile', 'FAIL', error.response?.data?.message || error.message);
    return false;
  }
}

// Test 4: Get Wallet
async function testGetWallet() {
  try {
    console.log('\n--- Test 4: Get Wallet ---');
    if (!authToken) {
      logTest('Get Wallet', 'FAIL', 'No auth token available');
      return false;
    }

    const res = await api.get('/api/wallet/');
    if (res.status === 200 && res.data.balance !== undefined) {
      logTest('Get Wallet', 'PASS', `Wallet balance: ${res.data.balance || 0}`);
      return true;
    } else {
      logTest('Get Wallet', 'FAIL', JSON.stringify(res.data));
      return false;
    }
  } catch (error) {
    logTest('Get Wallet', 'FAIL', error.response?.data?.message || error.message);
    return false;
  }
}

// Test 5: Fund Wallet
async function testFundWallet() {
  try {
    console.log('\n--- Test 5: Fund Wallet ---');
    if (!authToken) {
      logTest('Fund Wallet', 'FAIL', 'No auth token available');
      return false;
    }

    const res = await api.post('/api/wallet/fund', { amount: 5000 });
    if (res.status === 200 && res.data.balance !== undefined) {
      logTest('Fund Wallet', 'PASS', `New balance: ${res.data.balance}`);
      return true;
    } else {
      logTest('Fund Wallet', 'FAIL', JSON.stringify(res.data));
      return false;
    }
  } catch (error) {
    logTest('Fund Wallet', 'FAIL', error.response?.data?.message || error.message);
    return false;
  }
}

// Test 6: Get Transactions
async function testGetTransactions() {
  try {
    console.log('\n--- Test 6: Get Transactions ---');
    if (!authToken) {
      logTest('Get Transactions', 'FAIL', 'No auth token available');
      return false;
    }

    const res = await api.get('/api/transactions/');
    if (res.status === 200 && Array.isArray(res.data)) {
      logTest('Get Transactions', 'PASS', `Transactions found: ${res.data.length}`);
      return true;
    } else {
      logTest('Get Transactions', 'FAIL', JSON.stringify(res.data));
      return false;
    }
  } catch (error) {
    logTest('Get Transactions', 'FAIL', error.response?.data?.message || error.message);
    return false;
  }
}

// Test 7: Purchase
async function testPurchase() {
  try {
    console.log('\n--- Test 7: Purchase ---');
    if (!authToken) {
      logTest('Purchase', 'FAIL', 'No auth token available');
      return false;
    }

    const res = await api.post('/api/wallet/purchase', {
      amount: 100,
      serviceCode: 'airtime_mtn',
      target: '08012345678',
    });

    if (res.status === 200 && res.data.transaction) {
      logTest('Purchase', 'PASS', `Transaction ID: ${res.data.transaction._id || res.data.transaction.id}`);
      return true;
    } else {
      logTest('Purchase', 'FAIL', JSON.stringify(res.data));
      return false;
    }
  } catch (error) {
    logTest('Purchase', 'FAIL', error.response?.data?.message || error.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('========================================');
  console.log('QuickTopUp API Test Suite');
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log('========================================');

  const results = [];

  results.push(await testRegister());
  results.push(await testLogin());
  results.push(await testGetProfile());
  results.push(await testGetWallet());
  results.push(await testFundWallet());
  results.push(await testGetTransactions());
  results.push(await testPurchase());

  console.log('\n========================================');
  console.log('Test Summary');
  console.log('========================================');
  const passed = results.filter((r) => r).length;
  const total = results.length;
  console.log(`Passed: ${passed}/${total}`);
  console.log('========================================\n');

  process.exit(passed === total ? 0 : 1);
}

// Run tests
runAllTests().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
