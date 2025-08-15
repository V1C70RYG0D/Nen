#!/usr/bin/env node
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

async function main() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const router = require('../src/routes/replayTraining.js');
  app.use('/api/training', router);

  const PORT = parseInt(process.env.TEST_PORT || '3032', 10);
  const server = app.listen(PORT, async () => {
    try {
      const base = `http://127.0.0.1:${PORT}/api/training`;
      console.log('Server up at', base);
      // Quote
      const q = await axios.get(`${base}/fee/quote`, { params: { trainingHours: 0.5 }, timeout: 5000 });
      console.log('Quote:', q.data);
      // Estimate
      const est = await axios.get(`${base}/fee/estimate`, { params: { focusArea: 'all', intensity: 'medium', maxMatches: 10, replayCount: 10 }, timeout: 5000 });
      console.log('Estimate:', est.data);
      // Pay plan
      const pay = await axios.post(`${base}/fee/pay`, { walletPubkey: '8SRwaR9wr4n7a3tCWMgejAV5DAJnky8NXQTS8qWgsEyC', trainingHours: 0.5 }, { timeout: 5000 });
      console.log('Pay plan:', pay.data);
    } catch (e) {
      console.error('Test error', e?.response?.data || e.message);
    } finally {
      server.close();
    }
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


