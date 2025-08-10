const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = 3011;

// Middleware
app.use(cors({
  origin: ['http://localhost:3010', 'http://127.0.0.1:3010'],
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Skip training routes for now
console.log('⚠️ Training routes skipped for testing');

app.listen(PORT, () => {
  console.log(`🚀 Backend started on http://127.0.0.1:${PORT}`);
  console.log(`Health: http://127.0.0.1:${PORT}/health`);
  console.log(`Training API: http://127.0.0.1:${PORT}/api/training`);
});
