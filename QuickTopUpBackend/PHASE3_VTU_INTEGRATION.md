# QuickTopUp Phase 3 - VTU Integration Guide

## Configuration Status ✅

- **VTU Provider URL**: `https://vtu.ng/api/`
- **Server**: Running on `http://localhost:4000`
- **Environment**: Configured in `.env`

## Installed Dependencies

```
axios@^1.7.0       - HTTP client for VTU API requests
express@^4.18.2    - Web framework
mongoose@^7.5.0    - MongoDB driver
jsonwebtoken@^9.0.0 - JWT authentication
bcryptjs@^2.4.3    - Password hashing
cors@^2.8.5        - CORS middleware
dotenv@^16.3.1     - Environment variables
```

## Environment Configuration

Create or update `.env`:
```
PORT=4000
MONGO_URI=mongodb://localhost:27017/quicktopup
JWT_SECRET=supersecretkey
ADMIN_EMAIL=admin@quicktopup.com.ng
ADMIN_PASSWORD=Admin@123
PAYSTACK_SECRET_KEY=your_paystack_secret
VTU_API_KEY=your_vtu_api_key
VTU_API_BASE_URL=https://vtu.ng/api/
```

## VTU API Endpoints

All endpoints require Bearer token authentication.

### 1. Get Data Plans
```
GET /api/vtu/data-plans?network=mtn
```
Fetch available data bundle plans for a network.

**Query Parameters:**
- `network` (required): MTN, AIRTEL, GLO, 9MOBILE

**Response:**
```json
{
  "network": "mtn",
  "plans": [...]
}
```

### 2. Validate Customer
```
POST /api/vtu/validate
```
Validate customer details before payment (cable IDs, meter numbers, etc.).

**Body:**
```json
{
  "service": "cable|electricity",
  "smartcardNumber": "string",
  "meterNumber": "string"
}
```

### 3. Purchase Airtime
```
POST /api/vtu/airtime
```
Buy airtime for a phone number.

**Body:**
```json
{
  "network": "mtn",
  "phone": "08012345678",
  "amount": 500
}
```

**Response:**
```json
{
  "message": "Airtime purchase request processed",
  "balance": 1500,
  "transaction": {
    "_id": "...",
    "reference": "REF123456789",
    "status": "success",
    "metadata": { "service": "airtime", "network": "mtn", "phone": "08012345678" }
  }
}
```

### 4. Purchase Data
```
POST /api/vtu/data
```
Buy data bundle for a phone number.

**Body:**
```json
{
  "network": "mtn",
  "phone": "08012345678",
  "bundleCode": "mtn_1gb_daily",
  "amount": 1500
}
```

### 5. Purchase Cable
```
POST /api/vtu/cable
```
Subscribe to cable TV.

**Body:**
```json
{
  "service": "dstv",
  "smartcardNumber": "1234567890",
  "packageCode": "dstv_compact_plus",
  "amount": 19000
}
```

### 6. Purchase Electricity
```
POST /api/vtu/electricity
```
Pay electricity bills.

**Body:**
```json
{
  "distributor": "phed",
  "meterNumber": "1234567890",
  "meterType": "prepaid",
  "amount": 5000
}
```

### 7. Check Transaction Status
```
GET /api/vtu/transaction/:reference
```
Query transaction status by reference ID.

**Response:**
```json
{
  "status": "success",
  "message": "Transaction completed"
}
```

## Transaction Flow

1. User funds wallet via Paystack/Flutterwave
2. User initiates VTU purchase (airtime, data, cable, or electricity)
3. Backend generates unique reference ID
4. Backend calls VTU provider API
5. Transaction status updated in database
6. Wallet balance debited on success
7. Unique reference ID returned for tracking

## Error Handling

All endpoints return appropriate HTTP status codes:
- `200`: Success
- `400`: Bad request (missing/invalid parameters)
- `401`: Unauthorized (invalid token)
- `404`: Resource not found

## Testing with cURL

```bash
# Test root endpoint
curl http://localhost:4000/

# Get data plans (requires auth token)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:4000/api/vtu/data-plans?network=mtn

# Purchase airtime
curl -X POST http://localhost:4000/api/vtu/airtime \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "network": "mtn",
    "phone": "08012345678",
    "amount": 500
  }'
```

## Files Modified/Created

- **Created**: `services/vtuProvider.js` - VTU provider adapter
- **Created**: `controllers/vtuController.js` - VTU endpoints controller
- **Created**: `routes/vtuRoutes.js` - VTU API routes
- **Modified**: `app.js` - Registered VTU routes
- **Modified**: `package.json` - Added axios dependency
- **Modified**: `.env` and `.env.example` - VTU configuration
- **Modified**: `config/db.js` - Graceful MongoDB error handling

## Next Steps

1. Get API key from VTU provider (vtu.ng)
2. Update `VTU_API_KEY` in `.env`
3. Test endpoints using provided cURL commands or Postman
4. Integrate frontend forms to call these endpoints
5. Set up webhook handling for async payment confirmations
