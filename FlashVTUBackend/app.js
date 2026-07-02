const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const cron = require('node-cron');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const walletRoutes = require('./routes/walletRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const adminRoutes = require('./routes/adminRoutes');
const vtuRoutes = require('./routes/vtuRoutes');
const { errorHandler } = require('./middleware/errorMiddleware');
const { reconcilePendingFunding } = require('./services/reconciliationService');

dotenv.config();
connectDB();

const app = express();
app.set('trust proxy', 1);

const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((o) => o.trim())
  : [];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0 || !allowedOrigins.includes(origin)) {
      return callback(new Error('Not allowed by CORS'));
    }
    callback(null, true);
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Flutterwave webhook verification uses a simple verif-hash header comparison
// (not HMAC-SHA512 like Paystack), so raw body capture is not needed here.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({ message: 'FlashVTU backend is running.' });
});

app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/vtu', vtuRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`FlashVTU backend listening on port ${PORT}`);

  /**
   * Reconciliation safety net — runs every 10 minutes. Catches wallet_fund
   * transactions stuck in 'pending' because both the webhook and the
   * frontend's verify-on-return path failed to resolve them (e.g. user
   * closed the tab before redirect, webhook delivery failed/retries
   * exhausted). See services/reconciliationService.js for full details.
   *
   * Schedule '*\/10 * * * *' = every 10 minutes, every hour, every day.
   * Set RECONCILIATION_ENABLED=false in env to disable (e.g. in tests).
   */
  if (process.env.RECONCILIATION_ENABLED !== 'false') {
    cron.schedule('*/10 * * * *', async () => {
      try {
        const summary = await reconcilePendingFunding();
        if (summary.checked > 0) {
          console.log('Reconciliation run:', JSON.stringify(summary));
        }
      } catch (err) {
        console.error('Reconciliation job failed to run:', err.message);
      }
    });
    console.log('Reconciliation safety net scheduled (every 10 minutes)');
  }
});

module.exports = app;
