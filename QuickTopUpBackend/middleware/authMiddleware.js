const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, token missing' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized, user not found' });
    }
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, token invalid' });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ message: 'Admin access required' });
};

/**
 * Blocks any request from a logged-in but unverified account. Mounted
 * AFTER `protect` (needs req.user already populated) and BEFORE any
 * money-moving or wallet-touching route. Per the project's enforcement
 * decision: unverified users are blocked from everything except the
 * verify/resend-verification endpoints themselves and basic profile
 * read (getMe), so they can always see their own verification status
 * and act on it.
 */
const requireVerified = (req, res, next) => {
  if (req.user && req.user.isVerified) {
    return next();
  }
  return res.status(403).json({
    message: 'Please verify your email address before continuing. Check your inbox or request a new verification email.',
    code: 'EMAIL_NOT_VERIFIED',
  });
};

module.exports = { protect, admin, requireVerified };
