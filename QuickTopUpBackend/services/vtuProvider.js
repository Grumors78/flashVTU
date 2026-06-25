const axios = require('axios');

/**
 * PeyFlex VTU provider adapter.
 *
 * Confirmed directly from PeyFlex's own Postman documentation
 * (documenter.getpostman.com/view/17835214/...), June 2026. Every endpoint,
 * field name, and auth scheme below was verified against real request/response
 * examples shown in that doc — nothing here is guessed.
 *
 * Base URL: https://client.peyflex.com.ng/api
 * Auth: header "Authorization: Token <api_key>" (note: literal word "Token",
 *       not "Bearer", and not the raw key alone).
 *
 * Endpoints used:
 *   GET  /airtime/networks/        - list airtime network codes
 *   POST /airtime/purchase/        - buy airtime
 *   GET  /data/networks/           - list data network codes
 *   GET  /data/plans/?network=...  - list data plans for a network
 *   POST /data/purchase/           - buy a data plan
 *   GET  /cable/providers/         - list cable providers
 *   GET  /cable/plans/             - list cable plan codes
 *   POST /cable/verify/            - verify a cable IUC number
 *   POST /cable/subscribe/         - pay for a cable subscription
 *   GET  /electricity/plans/       - list electricity discos/plans
 *   GET  /electricity/verify/      - verify a meter number (no auth required)
 *   POST /electricity/subscribe/   - pay an electricity bill
 *
 * Endpoints NOT confirmed (not shown in the docs reviewed) and therefore not
 * implemented: a transaction status/requery endpoint. If you find one in the
 * sidebar under a section not yet reviewed, send it over and getTransactionStatus
 * below can be wired up.
 */

const BASE_URL = 'https://client.peyflex.com.ng/api';
const apiKey = process.env.VTU_API_KEY;

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 25000,
  headers: {
    Authorization: `Token ${apiKey}`,
    'Content-Type': 'application/json',
  },
});

function ensureApiKey() {
  if (!apiKey) {
    throw new Error('VTU_API_KEY is not configured on the server');
  }
}

/**
 * PeyFlex returns a `status` field of "SUCCESS" or "FAILED" in the body,
 * generally with a 200 OK even on failure (confirmed in the cable/electricity
 * examples), though a 400 was also observed for the same FAILED cable case.
 * So we check the body's status field first, regardless of HTTP status code.
 */
function interpretResponse(data) {
  if (data?.status === 'SUCCESS') {
    return data;
  }
  const message = data?.message || 'PeyFlex reported a failed transaction';
  const err = new Error(message);
  err.peyflexResponse = data;
  throw err;
}

async function post(path, body) {
  ensureApiKey();
  try {
    const { data } = await client.post(path, body);
    return interpretResponse(data);
  } catch (error) {
    if (error.response?.data) {
      return interpretResponse(error.response.data);
    }
    throw new Error(error.message || 'PeyFlex request failed');
  }
}

async function get(path, params, { auth = true } = {}) {
  if (auth) ensureApiKey();
  try {
    const config = { params };
    if (!auth) {
      // electricity/verify explicitly requires no auth — build a clean header
      // set rather than relying on `undefined` to override axios defaults.
      config.headers = { 'Content-Type': 'application/json' };
    }
    const { data } = await client.get(path, config);
    return data;
  } catch (error) {
    if (error.response?.data) {
      return error.response.data;
    }
    throw new Error(error.message || 'PeyFlex request failed');
  }
}

// ---------- Airtime ----------

const getAirtimeNetworks = async () => get('/airtime/networks/');

const purchaseAirtime = async ({ network, phone, amount }) => {
  if (!network || !phone || !amount) {
    throw new Error('Network, phone, and amount are required for airtime purchase');
  }
  return post('/airtime/purchase/', {
    network,
    mobile_number: phone,
    amount: String(amount),
  });
};

// ---------- Data ----------

const getDataNetworks = async () => get('/data/networks/');

/**
 * Confirmed shape: GET /data/plans/?network=mtn_gifting_data
 * Returns { network, plans: [{ plan_code, amount, label }] }
 */
const getDataPlans = async (network) => {
  if (!network) {
    throw new Error('Network is required to fetch data plans');
  }
  const data = await get('/data/plans/', { network });
  return data?.plans || [];
};

/**
 * Confirmed shape: POST /data/purchase/
 * { network, mobile_number, plan_code }
 */
const purchaseData = async ({ network, phone, bundleCode }) => {
  if (!network || !phone || !bundleCode) {
    throw new Error('Network, phone, and bundleCode (plan_code) are required for data purchase');
  }
  return post('/data/purchase/', {
    network,
    mobile_number: phone,
    plan_code: bundleCode,
  });
};

// ---------- Cable TV ----------

const getCableProviders = async () => get('/cable/providers/');
const getCablePlans = async () => get('/cable/plans/');

/**
 * Confirmed shape: POST /cable/verify/ { iuc, identifier }
 * Response: { status, customer_name, iuc, provider }
 */
const validateCableCustomer = async ({ iuc, identifier }) => {
  if (!iuc || !identifier) {
    throw new Error('iuc and identifier are required to verify a cable customer');
  }
  return post('/cable/verify/', { iuc, identifier });
};

/**
 * Confirmed shape: POST /cable/subscribe/
 * { identifier, plan, iuc, phone, amount }
 * No customer_name/customer_number/invoice needed — that earlier assumption
 * (from less reliable docs) was wrong.
 */
const purchaseCable = async ({ service, smartcardNumber, packageCode, phone, amount }) => {
  if (!service || !smartcardNumber || !packageCode || !phone || !amount) {
    throw new Error('service (identifier), smartcardNumber (iuc), packageCode (plan), phone, and amount are required for cable purchase');
  }
  return post('/cable/subscribe/', {
    identifier: service,
    plan: packageCode,
    iuc: smartcardNumber,
    phone,
    amount: String(amount),
  });
};

// ---------- Electricity ----------

const getElectricityPlans = async () => get('/electricity/plans/');

/**
 * Confirmed shape: GET /electricity/verify/?identifier=electricity&meter=...&plan=...&type=prepaid
 * No authentication required per PeyFlex's docs ("No authentication required. Just direct.")
 * Response: { status, customer_name, message }
 */
const validateElectricityMeter = async ({ meterNumber, distributor, meterType }) => {
  if (!meterNumber || !distributor) {
    throw new Error('meterNumber and distributor (plan code) are required to verify a meter');
  }
  return get(
    '/electricity/verify/',
    {
      identifier: 'electricity',
      meter: meterNumber,
      plan: distributor,
      type: (meterType || 'prepaid').toLowerCase(),
    },
    { auth: false }
  );
};

/**
 * Confirmed shape: POST /electricity/subscribe/
 * { identifier: "electricity", meter, plan, amount, type, phone }
 */
const purchaseElectricity = async ({ distributor, meterNumber, meterType, amount, phone }) => {
  if (!distributor || !meterNumber || !amount || !phone) {
    throw new Error('Distributor (plan), meterNumber, amount, and phone are required for electricity purchase');
  }
  return post('/electricity/subscribe/', {
    identifier: 'electricity',
    meter: meterNumber,
    plan: distributor,
    amount: String(amount),
    type: (meterType || 'prepaid').toLowerCase(),
    phone,
  });
};

// ---------- Unified "validateCustomer" used by the existing controller ----------

/**
 * Dispatches to the right verify call based on payload.service, so the
 * existing /api/vtu/validate route keeps working for both cable and
 * electricity without the controller needing to know provider-specific shapes.
 */
const validateCustomer = async (payload) => {
  const { service } = payload;
  if (service === 'cable') {
    return validateCableCustomer({ iuc: payload.smartcardNumber, identifier: payload.provider });
  }
  if (service === 'electricity') {
    return validateElectricityMeter({
      meterNumber: payload.meterNumber,
      distributor: payload.distributor,
      meterType: payload.meterType,
    });
  }
  throw new Error('Unsupported service for validation. Use "cable" or "electricity".');
};

/**
 * Not documented in the PeyFlex API docs reviewed. Throws clearly rather
 * than guessing an endpoint shape.
 */
const getTransactionStatus = async (reference) => {
  throw new Error(
    `PeyFlex's documentation (as reviewed) does not include a transaction-status/requery endpoint (reference: ${reference}). ` +
    'Check the "List Cable Plan Codes"/sidebar sections not yet reviewed, or contact PeyFlex support.'
  );
};

module.exports = {
  getAirtimeNetworks,
  purchaseAirtime,
  getDataNetworks,
  getDataPlans,
  purchaseData,
  getCableProviders,
  getCablePlans,
  validateCableCustomer,
  purchaseCable,
  getElectricityPlans,
  validateElectricityMeter,
  purchaseElectricity,
  validateCustomer,
  getTransactionStatus,
};
