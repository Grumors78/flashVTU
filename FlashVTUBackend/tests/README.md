# API Test Suite

This folder contains automated tests for the QuickTopUp backend API.

## Files

- **api-test.js** - Main test script that runs all API flows
- **run-tests.ps1** - PowerShell helper to easily run tests

## Prerequisites

1. Backend must be running:
   ```bash
   cd QuickTopUpBackend
   npm run dev
   ```

2. MongoDB must be connected (check backend logs for "MongoDB connected")

3. Backend must be accessible at the configured URL (default: `http://localhost:4000`)

## Running Tests

### Option 1: PowerShell (Windows)
From the `QuickTopUpBackend` folder:
```powershell
.\run-tests.ps1
```

### Option 2: Direct Node.js
```bash
cd QuickTopUpBackend
node tests/api-test.js
```

### Option 3: Using npm script
You can add this to `package.json` scripts:
```json
"scripts": {
  "test": "node tests/api-test.js"
}
```
Then run:
```bash
npm test
```

## Test Flow

The test suite performs the following steps:

1. **Register User** - Creates a new test user with unique email
2. **Login User** - Authenticates and retrieves JWT token
3. **Get Profile** - Retrieves authenticated user info
4. **Get Wallet** - Fetches wallet balance
5. **Fund Wallet** - Adds 5000 to wallet balance
6. **Get Transactions** - Lists all transactions
7. **Purchase** - Attempts an airtime purchase

## Expected Output

Each test will show:
- ✓ PASS - Test succeeded
- ✗ FAIL - Test failed with error message

Example:
```
✓ Register User
  User created: test-1717747440000@test.com

✓ Login User
  Token received: eyJhbGciOiJIUzI1NiIsInR5cCI...

✓ Get Profile
  User: Test User (test-1717747440000@test.com)

...

========================================
Test Summary
========================================
Passed: 7/7
========================================
```

## Customization

Edit `tests/api-test.js` to:
- Change backend URL: `const BACKEND_URL = 'your-url'`
- Modify test user credentials in the `testUser` object
- Add more tests by creating new test functions
- Change purchase details in `testPurchase()`

## Troubleshooting

### Tests fail with "Failed to connect"
- Ensure backend is running (`npm run dev`)
- Verify `BACKEND_URL` matches your backend location
- Check MongoDB connection in backend logs

### Tests fail with "Invalid token"
- Ensure `authMiddleware.js` is correctly implemented
- Verify JWT secret is set in environment
- Check that JWT token format is correct

### Tests pass but no data in database
- Verify MongoDB connection string is correct
- Check that models are properly defined
- Ensure controller functions save to database
