const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const Wallet = require('../models/walletModel');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

const registerUser = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    return res.status(400).json({ message: 'Email already registered' });
  }

  const user = await User.create({ name, email, password });
  await Wallet.create({ user: user._id });

  res.status(201).json({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    token: generateToken(user._id),
  });
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const user = await User.findOne({ email });
  if (user && (await user.matchPassword(password))) {
    return res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  }

  res.status(401).json({ message: 'Invalid email or password' });
};

const getMe = async (req, res) => {
  const wallet = await Wallet.findOne({ user: req.user._id });
  res.json({
    id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    wallet: wallet || { balance: 0, currency: 'NGN' },
  });
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
};
