const axios = require('axios');

const PAYSTACK_BASE_URL = 'https://api.paystack.co';
const secretKey = process.env.PAYSTACK_SECRET_KEY;

const client = axios.create({
  baseURL: PAYSTACK_BASE_URL,
  timeout: 20000,
  headers: {
    Authorization: `Bearer ${secretKey}`,
    'Content-Type': 'application/json',
  },
});

/**
 * Naira -> kobo. Paystack requires integer amounts in the smallest currency unit.
 * Rounding guards against floating point artifacts (e.g. 19.1 * 100 = 1909.99999...).
 */
const toKobo = (nairaAmount) => Math.round(Number(nairaAmount) * 100);
const toNaira = (koboAmount) => Number(koboAmount) / 100;

/**
 * Initialize a transaction. Returns { authorization_url, access_code, reference }.
 * `reference` here echoes back what we send so it should match callers' own reference.
 */
const initializeTransaction = async ({ email, amount, reference, callbackUrl, metadata }) => {
  if (!secretKey) {
    throw new Error('PAYSTACK_SECRET_KEY is not configured on the server');
  }
  if (!email || !amount || !reference) {
    throw new Error('email, amount, and reference are required to initialize a payment');
  }

  const payload = {
    email,
    amount: toKobo(amount),
    reference,
    currency: 'NGN',
  };
  if (callbackUrl) payload.callback_url = callbackUrl;
  if (metadata) payload.metadata = metadata;

  try {
    const { data } = await client.post('/transaction/initialize', payload);
    return data.data; // { authorization_url, access_code, reference }
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Paystack initialization failed';
    throw new Error(message);
  }
};

/**
 * Verify a transaction by reference. Returns Paystack's transaction data object,
 * including .status ('success' | 'failed' | 'abandoned'), .amount (in kobo), .reference.
 */
const verifyTransaction = async (reference) => {
  if (!secretKey) {
    throw new Error('PAYSTACK_SECRET_KEY is not configured on the server');
  }
  if (!reference) {
    throw new Error('reference is required to verify a payment');
  }

  try {
    const { data } = await client.get(`/transaction/verify/${encodeURIComponent(reference)}`);
    return data.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Paystack verification failed';
    throw new Error(message);
  }
};

module.exports = { initializeTransaction, verifyTransaction, toKobo, toNaira };
