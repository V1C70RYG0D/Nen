#!/usr/bin/env node
/* Simple dev server to expose training fee/payment endpoints for testing */
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = parseInt(process.env.PORT || '3012', 10);

app.use(cors());
app.use(express.json());

// Mount replayTraining routes under /api/training
const replayTrainingRoutes = require('../src/routes/replayTraining.js');
app.use('/api/training', replayTrainingRoutes);

app.get('/health', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

app.listen(PORT, () => {
  console.log(`Dev training server listening on http://127.0.0.1:${PORT}`);
  console.log(`Health: http://127.0.0.1:${PORT}/health`);
  console.log(`Fee quote: http://127.0.0.1:${PORT}/api/training/fee/quote?trainingHours=0.5`);
});


