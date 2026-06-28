const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const Wallet = require('../models/walletModel');
const asyncHandler = require('../middleware/asyncHandler');
const { sendVerificationEmail } = require('../services/emailService');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Name, email, and password are required');
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error('Email already registered');
  }

  const user = await User.create({ name, email, password });
  await Wallet.create({ user: user._id });

  const rawToken = user.generateVerificationToken();
  await user.save();

  // Email sending is best-effort: a Resend outage shouldn't block account
  // creation, since the user can always request a resend later. We log the
  // failure and let registration succeed, but the account still starts
  // unverified — they just won't have gotten the email yet.
  try {
    await sendVerificationEmail({ to: user.email, name: user.name, token: rawToken });
  } catch (err) {
    console.error(`Failed to send verification email to ${user.email}:`, err.message);
  }

  res.status(201).json({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isVerified: user.isVerified,
    token: generateToken(user._id),
    message: 'Account created. Check your email to verify your account before using QuickTopUp.',
  });
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400);
    throw new Error('Email and password are required');
  }

  const user = await User.findOne({ email });
  if (user && (await user.matchPassword(password))) {
    return res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      token: generateToken(user._id),
    });
  }

  res.status(401);
  throw new Error('Invalid email or password');
});

const getMe = asyncHandler(async (req, res) => {
  const wallet = await Wallet.findOne({ user: req.user._id });
  res.json({
    id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    isVerified: req.user.isVerified,
    wallet: wallet || { balance: 0, currency: 'NGN' },
  });
});

/**
 * GET /api/auth/verify-email/:token
 * Public — the user reaches this via the link in their email, not while
 * logged in via the app's normal JWT flow. Hashes the incoming raw token
 * the same way generateVerificationToken hashed it before storing, then
 * looks for a matching, non-expired record.
 */
const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;
  if (!token) {
    res.status(400);
    throw new Error('Verification token is required');
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    verificationToken: hashedToken,
    verificationTokenExpires: { $gt: Date.now() },
  }).select('+verificationToken +verificationTokenExpires');

  if (!user) {
    res.status(400);
    throw new Error('This verification link is invalid or has expired. Request a new one.');
  }

  user.isVerified = true;
  user.verificationToken = undefined;
  user.verificationTokenExpires = undefined;
  await user.save();

  res.json({ message: 'Email verified successfully. You can now use your QuickTopUp account.' });
});

/**
 * POST /api/auth/resend-verification
 * Requires login (so we know exactly which account to resend for, and so
 * this can't be used to enumerate which emails are registered).
 */
const resendVerification = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user.isVerified) {
    return res.json({ message: 'This account is already verified.' });
  }

  const rawToken = user.generateVerificationToken();
  await user.save();

  await sendVerificationEmail({ to: user.email, name: user.name, token: rawToken });

  res.json({ message: 'Verification email sent. Check your inbox.' });
});

module.exports = { registerUser, loginUser, getMe, verifyEmail, resendVerification };
