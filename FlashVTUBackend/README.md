# QuickTopUp Backend

This folder contains the phase 2 backend scaffold for the QuickTopUp VTU project. It includes:

- Express server setup
- MongoDB database connection
- User authentication and wallet management
- Transaction logging and admin endpoints

## Phase 2 completion plan

1. Design database schema for users, wallets, transactions, and services.
2. Set up the backend framework using Node.js and Express.
3. Implement user authentication with registration, login, and profile retrieval.
4. Implement wallet operations: balance check, fund wallet, and deduct on purchase.
5. Implement transaction logging for every wallet and service action.
6. Implement admin endpoints to manage users and review transaction history.
7. Configure environment variables for API keys and secrets.

## Phase 3 requirements

To complete Phase 3, the backend must implement VTU provider and payment gateway integration:

- Connect to a VTU provider API such as VTpass, VTU.ng, or ClubKonnect.
- Implement an airtime purchase endpoint covering all mobile networks.
- Implement a data bundle endpoint with plan listings.
- Implement cable TV purchase support for DStv, GOtv, and Startimes.
- Implement electricity bill payment support for PHCN/disco services.
- Integrate Paystack or Flutterwave for wallet funding.
- Add webhook handling to auto-credit wallets after confirmed payments.
- Add VTU purchase endpoints for airtime, data, cable, electricity, and transaction status.
- Verify payment success before crediting wallet balances.
- Add retry and reconciliation logic for failed VTU transactions.
- Prevent duplicate transactions using unique reference IDs.
- Handle API timeouts, provider errors, and partial failures gracefully.
- Test all VTU endpoints in the provider sandbox before going live.
- Validate end-to-end payment and purchase flows, including wallet funding callbacks.

## Getting started

1. Copy `.env.example` to `.env` and update values.
2. Run `npm install`.
3. Start the server with `npm run dev`.
4. Connect to MongoDB using `MONGO_URI`.

## Folder structure

- `app.js` - Express application entry point
- `config/db.js` - MongoDB connector
- `models/` - Mongoose schemas
- `routes/` - API route definitions
- `controllers/` - Route business logic
- `middleware/` - Authentication and error handling
- `utils/` - Helper functions

## Frontend (Phase 4)

The frontend scaffold was moved to a separate top-level folder for Phase 4.

- Folder: [QuickTopUpFrontend](../QuickTopUpFrontend)
- Quick start (from the `QuickTopUpBackend` folder):

```bash
# serve the frontend using the backend npm scripts
npm run serve-frontend

# or serve directly with Python
python -m http.server 5000 --directory ../QuickTopUpFrontend
```

Edit `QuickTopUpFrontend/js/config.js` to change the backend URL (default: `http://localhost:4000`).
