const axios = require('axios');

const baseURL = process.env.VTU_API_BASE_URL || 'https://api.vtu.example.com';
const apiKey = process.env.VTU_API_KEY;
const apiKeyHeader = process.env.VTU_API_KEY_HEADER || 'Authorization';
const authScheme = process.env.VTU_AUTH_SCHEME || 'Bearer';

const headers = {
  'Content-Type': 'application/json',
};

if (apiKey) {
  if (apiKeyHeader.toLowerCase() === 'authorization') {
    headers.Authorization = `${authScheme} ${apiKey}`;
  } else {
    headers[apiKeyHeader] = apiKey;
  }
}

const client = axios.create({
  baseURL,
  timeout: 25000,
  headers,
});

const request = async (method, url, data = {}, params = {}) => {
  try {
    const response = await client.request({ method, url, data, params });
    return response.data;
  } catch (error) {
    if (error.response) {
      const message = error.response.data?.message || error.response.data?.error || error.response.statusText;
      throw new Error(message || 'VTU provider error');
    }
    throw new Error(error.message || 'VTU request failed');
  }
};

const getDataPlans = async (network) => {
  if (!network) {
    throw new Error('Network is required to fetch data bundle plans');
  }
  return request('get', '/data-plans', {}, { network });
};

const purchaseAirtime = async ({ network, phone, amount, reference }) => {
  if (!network || !phone || !amount || !reference) {
    throw new Error('Network, phone, amount, and reference are required for airtime purchase');
  }
  return request('post', '/purchase/airtime', { network, phone, amount, reference });
};

const purchaseData = async ({ network, phone, bundleCode, amount, reference }) => {
  if (!network || !phone || !bundleCode || !amount || !reference) {
    throw new Error('Network, phone, bundleCode, amount, and reference are required for data purchase');
  }
  return request('post', '/purchase/data', { network, phone, bundleCode, amount, reference });
};

const purchaseCable = async ({ service, smartcardNumber, packageCode, amount, reference }) => {
  if (!service || !smartcardNumber || !packageCode || !amount || !reference) {
    throw new Error('Service, smartcardNumber, packageCode, amount, and reference are required for cable purchase');
  }
  return request('post', '/purchase/cable', { service, smartcardNumber, packageCode, amount, reference });
};

const purchaseElectricity = async ({ distributor, meterNumber, meterType, amount, reference }) => {
  if (!distributor || !meterNumber || !amount || !reference) {
    throw new Error('Distributor, meterNumber, amount, and reference are required for electricity purchase');
  }
  return request('post', '/purchase/electricity', { distributor, meterNumber, meterType, amount, reference });
};

const validateCustomer = async (payload) => {
  if (!payload || Object.keys(payload).length === 0) {
    throw new Error('Validation payload is required');
  }
  return request('post', '/validate', payload);
};

const getTransactionStatus = async (reference) => {
  if (!reference) {
    throw new Error('Reference is required to query transaction status');
  }
  return request('get', `/transaction/${encodeURIComponent(reference)}`);
};

module.exports = {
  getDataPlans,
  purchaseAirtime,
  purchaseData,
  purchaseCable,
  purchaseElectricity,
  validateCustomer,
  getTransactionStatus,
};
