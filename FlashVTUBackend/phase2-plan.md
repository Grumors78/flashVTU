# Phase 2 — Backend & Database

This folder contains the completed backend plan for Phase 2, with all necessary files saved together.

## Completed Phase 2 tasks

- Designed database schemas for users, wallets, transactions, and services.
- Built the backend with Node.js and Express.
- Added authentication: registration, login, and protected profile retrieval.
- Added wallet operations: balance query, wallet funding, and purchase deduction.
- Added full transaction logging with reference IDs and status.
- Added admin backend routes for user review, transaction audit, and system stats.
- Configured environment variable support for sensitive keys and database connection.

## Key files

- `app.js` — Application entry point and route registration.
- `config/db.js` — MongoDB connection logic.
- `models/userModel.js` — User schema with password hashing.
- `models/walletModel.js` — Wallet schema and credit/debit helpers.
- `models/transactionModel.js` — Transaction log schema.
- `models/serviceModel.js` — Service catalog schema for future API integration.
- `controllers/` — Business logic for auth, wallet, transactions, and admin.
- `routes/` — API endpoints for auth, wallet, transactions, and admin.
- `middleware/authMiddleware.js` — JWT protection and admin authorization.
- `middleware/errorMiddleware.js` — Centralized error handling.
- `utils/generateReference.js` — Unique transaction reference generator.
- `.env.example` — Environment variable template.
- `README.md` — Setup instructions and Phase 2 summary.

## Next step

1. Copy `.env.example` to `.env`.
2. Run `npm install`.
3. Start MongoDB and run `npm run dev`.
4. Use the API routes to register users, fund wallets, and log transactions.
