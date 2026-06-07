# Frontend (Phase 4) — QuickTopUp

This minimal frontend is a Phase 4 starter. It demonstrates connecting to the existing backend.

Quick start

- Serve the `QuickTopUpFrontend/` folder using any static server, for example:

```bash
# serve with Python (simple)
python -m http.server 5000 --directory QuickTopUpFrontend

# or use `npx serve`
npx serve QuickTopUpFrontend
```

- Open `http://localhost:5000` (or the port your static server uses).
- The demo calls the backend root at `http://localhost:4000` by default. To change, edit `QuickTopUpFrontend/js/config.js` and update `window.BACKEND_URL`.

Useful backend endpoints

- `GET /` — basic health check
- `POST /api/auth/...` — authentication
- `POST /api/vtu/...` — VTU operations
- `POST /api/wallet/...` — wallet funding and balance

Next steps

- Replace this static scaffold with a React/Vue app if desired.
- Add authentication flows and forms that POST to `/api/*` routes.
