const express = require('express');
const rateLimit = require('express-rate-limit');
const { registerUser, loginUser, getMe, verifyEmail, resendVerification } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later' },
});

router.post('/register', authLimiter, registerUser);
router.post('/login', authLimiter, loginUser);
router.get('/me', protect, getMe);

// Public — reached via the link in the verification email, not the app's JWT flow.
router.get('/verify-email/:token', verifyEmail);

// Requires login so we know exactly which account to resend for.
router.post('/resend-verification', protect, authLimiter, resendVerification);

module.exports = router;
