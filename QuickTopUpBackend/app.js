const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const walletRoutes = require('./routes/walletRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const adminRoutes = require('./routes/adminRoutes');
const vtuRoutes = require('./routes/vtuRoutes');
const { errorHandler } = require('./middleware/errorMiddleware');

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

/**
 * Capture the raw request body BEFORE JSON parsing, but only for the Paystack
 * webhook route. Signature verification (HMAC-SHA512) must run against the
 * exact bytes Paystack sent — re-serializing req.body with JSON.stringify can
 * produce a different byte sequence (key order/whitespace) and silently break
 * verification. All other routes use the normal JSON parser untouched.
 */
app.use(
  express.json({
    verify: (req, res, buf) => {
      if (req.originalUrl === '/api/wallet/webhook/paystack') {
        req.rawBody = buf.toString('utf8');
      }
    },
  })
);
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({ message: 'QuickTopUp backend is running.' });
});

app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/vtu', vtuRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`QuickTopUp backend listening on port ${PORT}`);
});

module.exports = app;
