require('dotenv').config();
const axios = require('axios').default;

function assertEnv(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) {
    throw new Error(`${name} not set`);
  }
  return v;
}

async function startRollupForSession(sessionId, extra = {}) {
  const startUrl = assertEnv('MAGICBLOCK_ROLLUP_START_URL');
  const apiKey = assertEnv('MAGICBLOCK_API_KEY');
  const payload = { sessionId, ...extra };
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };
  const { data } = await axios.post(startUrl, payload, { headers, timeout: 20000 });
  if (!data || !data.rollupId || !data.endpoint) {
    throw new Error('Invalid response from MagicBlock rollup start');
  }
  return { rollupId: data.rollupId, endpoint: data.endpoint, raw: data };
}

async function getRollupStatus(rollupId) {
  const statusUrlTemplate = assertEnv('MAGICBLOCK_ROLLUP_STATUS_URL');
  const apiKey = assertEnv('MAGICBLOCK_API_KEY');
  const statusUrl = statusUrlTemplate.replace('{rollupId}', encodeURIComponent(rollupId));
  const headers = { 'Authorization': `Bearer ${apiKey}` };
  const { data } = await axios.get(statusUrl, { headers, timeout: 15000 });
  return data;
}

async function waitUntilRollupReady(rollupId, { timeoutMs = 60000, intervalMs = 1500 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const status = await getRollupStatus(rollupId).catch(() => null);
    if (status && (status.status === 'ready' || status.ready === true)) {
      return status;
    }
    await new Promise(r => setTimeout(r, intervalMs));
  }
  throw new Error('Timed out waiting for rollup to be ready');
}

module.exports = { startRollupForSession, getRollupStatus, waitUntilRollupReady };
