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

const allowedOrigins = [process.env.FRONTEND_URL].filter(Boolean);
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.options('*', corsOptions);
app.use(express.json());
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
