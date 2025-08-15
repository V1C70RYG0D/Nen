console.log('Starting simple test server...');
const express = require('express');
const app = express();

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

console.log('About to start listening on port 3011...');
app.listen(3011, () => {
  console.log('✅ Server running on port 3011');
});
console.log('Server setup complete.');
