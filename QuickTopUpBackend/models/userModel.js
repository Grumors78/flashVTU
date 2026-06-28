const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    // ---- Email verification ----
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
      select: false, // never returned by default queries; opt in with .select('+verificationToken')
    },
    verificationTokenExpires: {
      type: Date,
      select: false,
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  const complexityRe = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
  if (!complexityRe.test(this.password)) {
    return next(
      new Error('Password must be at least 8 characters and contain both letters and numbers')
    );
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

/**
 * Generates a fresh verification token (raw token returned to the caller
 * for emailing; only its SHA-256 hash is stored on the document, same
 * pattern as a password reset token — so a database leak alone can't be
 * used to verify accounts).
 */
userSchema.methods.generateVerificationToken = function () {
  const rawToken = crypto.randomBytes(32).toString('hex');
  this.verificationToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  this.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  return rawToken;
};

module.exports = mongoose.model('User', userSchema);
