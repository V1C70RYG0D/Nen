#!/usr/bin/env node
// Simple status check
const http = require('http');

function check(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`✅ ${url} - Status: ${res.statusCode}`);
        try {
          const json = JSON.parse(data);
          console.log(`   Response: ${JSON.stringify(json).substring(0, 100)}...`);
        } catch (e) {
          console.log(`   Response: ${data.substring(0, 100)}...`);
        }
        resolve(true);
      });
    });
    req.on('error', (e) => {
      console.log(`❌ ${url} - Error: ${e.message}`);
      resolve(false);
    });
    req.setTimeout(3000, () => {
      req.destroy();
      console.log(`❌ ${url} - Timeout`);
      resolve(false);
    });
  });
}

async function main() {
  console.log('Quick Status Check');
  console.log('==================');
  
  await check('http://127.0.0.1:3011/health');
  await check('http://127.0.0.1:3011/api/stats');
  await check('http://127.0.0.1:3003/health');
  await check('http://127.0.0.1:3003/');
  
  console.log('Done');
}

main();
