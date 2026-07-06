const axios = require('axios');

/**
 * Flutterwave v3 payment provider adapter.
 *
 * Confirmed against Flutterwave's official v3 documentation (June 2026):
 *   https://developer.flutterwave.com/v3.0/docs/flutterwave-standard-1
 *   https://developer.flutterwave.com/v3.0/docs/transaction-verification
 *   https://developer.flutterwave.com/docs/webhooks
 *
 * Key differences from Paystack (important for the wallet controller):
 *   - Amounts are in NAIRA, not kobo (no conversion needed)
 *   - Webhook verification uses the verif-hash header, not HMAC-SHA512
 *   - Verification uses transaction_id (numeric) not tx_ref
 *   - Checkout link is at data.link (not data.authorization_url)
 *   - Redirect callback query params: tx_ref, transaction_id, status
 */

const BASE_URL = 'https://api.flutterwave.com/v3';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
  headers: {
    Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
    'Content-Type': 'application/json',
  },
});

function ensureApiKey() {
  if (!process.env.FLW_SECRET_KEY) {
    throw new Error('FLW_SECRET_KEY is not configured on the server');
  }
}

/**
 * Initialize a payment transaction. Returns Flutterwave's checkout link.
 *
 * @returns {Object} { link, tx_ref } - redirect user to `link` to pay
 */
const initializeTransaction = async ({ email, name, amount, tx_ref, redirectUrl, metadata }) => {
  ensureApiKey();
  if (!email || !amount || !tx_ref) {
    throw new Error('email, amount, and tx_ref are required to initialize a payment');
  }

  const frontendUrl = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',')[0].trim()
    : null;

  const payload = {
    tx_ref,
    amount: String(amount), // Flutterwave expects a string amount in Naira (not kobo)
    currency: 'NGN',
    redirect_url: redirectUrl || (frontendUrl ? `${frontendUrl}/wallet.html` : undefined),
    customer: {
      email,
      name: name || email,
    },
    customizations: {
      title: 'FlashVTU Wallet Funding',
      description: 'Fund your FlashVTU wallet',
    },
  };

  if (metadata) payload.meta = metadata;

  try {
    const { data: res } = await client.post('/payments', payload);
    if (res.status !== 'success' || !res.data?.link) {
      throw new Error(res.message || 'Flutterwave did not return a payment link');
    }
    return { link: res.data.link, tx_ref };
  } catch (error) {
    if (error.response?.data) {
      throw new Error(error.response.data.message || 'Flutterwave initialization failed');
    }
    throw error;
  }
};

/**
 * Verify a transaction by its numeric Flutterwave transaction ID.
 * Always verify server-side before crediting a wallet — never trust
 * the redirect URL's status query param alone.
 *
 * @param {string|number} transactionId - the transaction_id from the redirect/webhook
 * @returns Flutterwave's transaction data object (data.status, data.amount, etc.)
 */
const verifyTransaction = async (transactionId) => {
  ensureApiKey();
  if (!transactionId) {
    throw new Error('transactionId is required to verify a payment');
  }

  try {
    const { data: res } = await client.get(`/transactions/${transactionId}/verify`);
    if (res.status !== 'success') {
      throw new Error(res.message || 'Flutterwave verification failed');
    }
    return res.data;
  } catch (error) {
    if (error.response?.data) {
      throw new Error(error.response.data.message || 'Flutterwave verification request failed');
    }
    throw error;
  }
};

/**
 * Verify a transaction by our own tx_ref (merchant reference).
 * Used by reconciliation since it doesn't have Flutterwave's numeric
 * transaction_id — only our own reference string.
 *
 * Endpoint: GET /v3/transactions/verify_by_reference?tx_ref=...
 */
const verifyByReference = async (txRef) => {
  ensureApiKey();
  if (!txRef) {
    throw new Error('txRef is required to verify a payment by reference');
  }

  try {
    const { data: res } = await client.get('/transactions/verify_by_reference', {
      params: { tx_ref: txRef },
    });
    if (res.status !== 'success') {
      throw new Error(res.message || 'Flutterwave verification by reference failed');
    }
    return res.data;
  } catch (error) {
    if (error.response?.data) {
      throw new Error(error.response.data.message || 'Flutterwave verification request failed');
    }
    throw error;
  }
};

/**
 * Verify the webhook signature.
 * Flutterwave uses a simple verif-hash header — a plain string set in your
 * Flutterwave dashboard (Settings -> API -> Webhook Secret Hash). This is
 * different from Paystack's HMAC-SHA512 approach; Flutterwave just expects
 * the header to exactly match the secret you set.
 *
 * @param {string} headerHash - the value of req.headers['verif-hash']
 * @returns {boolean}
 */
const verifyWebhookSignature = (headerHash) => {
  const secretHash = process.env.FLW_WEBHOOK_HASH;
  if (!secretHash) {
    console.warn('FLW_WEBHOOK_HASH is not set — skipping webhook signature verification');
    return true; // fail open with a warning in dev; tighten in production
  }
  return headerHash === secretHash;
};

/**
 * Create a temporary (dynamic) virtual account for a specific transaction.
 * No BVN or NIN required — Flutterwave generates a one-time account tied
 * to the exact amount. The account expires once the transfer is received.
 *
 * Confirmed endpoint: POST /v3/virtual-account-numbers
 * Required: email, amount, tx_ref
 * Do NOT pass is_permanent: true — that's what triggers the BVN requirement.
 *
 * Response: { data: { account_number, bank_name, flw_ref, expiry_date, note } }
 */
const createTemporaryVirtualAccount = async ({ email, firstname, lastname, amount, txRef }) => {
  ensureApiKey();
  if (!email || !amount || !txRef) {
    throw new Error('email, amount, and txRef are required to create a virtual account');
  }

  const payload = {
    email,
    amount: Number(amount),
    tx_ref: txRef,
    currency: 'NGN',
    narration: `FlashVTU wallet — ${firstname || ''} ${lastname || ''}`.trim(),
  };

  if (firstname) payload.firstname = firstname;
  if (lastname) payload.lastname = lastname;

  try {
    const { data: res } = await client.post('/virtual-account-numbers', payload);
    if (res.status !== 'success' || !res.data?.account_number) {
      throw new Error(res.message || 'Flutterwave did not return a virtual account number');
    }
    return {
      accountNumber: res.data.account_number,
      bankName: res.data.bank_name,
      flwRef: res.data.flw_ref,
      expiryDate: res.data.expiry_date,
      note: res.data.note,
      amount: res.data.amount,
    };
  } catch (error) {
    if (error.response?.data) {
      throw new Error(error.response.data.message || 'Virtual account creation failed');
    }
    throw error;
  }
};

module.exports = { initializeTransaction, verifyTransaction, verifyByReference, createTemporaryVirtualAccount, verifyWebhookSignature };
