#!/usr/bin/env node

/**
 * Debug Homepage Issues
 * Check what's happening with the homepage design and functionality
 */

const http = require('http');

function testHomepage() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3010,
      path: '/',
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (compatible; NodeJS-Debug/1.0)'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('🔍 Homepage Debug Analysis:\n');
        
        // Check for key elements
        const checks = [
          { name: 'ACTIVE MATCHES header', regex: /ACTIVE MATCHES/, expected: true },
          { name: 'WITNESS THE ULTIMATE header', regex: /WITNESS THE ULTIMATE/, expected: true },
          { name: 'Filter toggle button', regex: /(Show Filters|Hide Filters)/, expected: true },
          { name: 'Tab navigation', regex: /(live matches|upcoming matches)/i, expected: true },
          { name: 'Offline/Reconnect UI', regex: /(offline|reconnect|connecting)/i, expected: false },
          { name: 'Navigation links', regex: /href="\/matches"/, expected: true },
          { name: 'Error messages', regex: /(error|invalid|failed)/i, expected: false },
          { name: 'MatchList component', regex: /MatchList|match-card/i, expected: true },
          { name: 'Layout component', regex: /NEN PLATFORM/, expected: true },
          { name: 'Proper styling', regex: /cyber-dark|solana-purple/, expected: true }
        ];

        checks.forEach(check => {
          const found = check.regex.test(data);
          const status = (found === check.expected) ? '✅' : '❌';
          console.log(`${status} ${check.name}: ${found ? 'Found' : 'Not found'}`);
        });

        // Look for specific issues
        console.log('\n🔍 Specific Issue Analysis:');
        
        // Check filter state
        if (data.includes('showFilters')) {
          console.log('✅ Filter state management detected');
        } else {
          console.log('❌ Filter state management missing');
        }

        // Check tab switching
        if (data.includes('setSelectedTab')) {
          console.log('✅ Tab switching logic detected');  
        } else {
          console.log('❌ Tab switching logic missing');
        }

        // Check for auto-expanded filters
        if (data.includes('showFilters={true}')) {
          console.log('❌ Filters are auto-expanded (should be false by default)');
        } else {
          console.log('✅ Filters not auto-expanded');
        }

        // Check for WebSocket issues
        if (data.includes('Connecting...') || data.includes('reconnect')) {
          console.log('❌ WebSocket/connection UI still showing');
        } else {
          console.log('✅ No WebSocket connection UI detected');
        }

        console.log('\n📊 Response Details:');
        console.log(`Status: ${res.statusCode}`);
        console.log(`Content-Length: ${data.length} chars`);
        console.log(`Content-Type: ${res.headers['content-type']}`);

        resolve(data);
      });
    });

    req.on('error', (error) => {
      console.error('❌ Failed to fetch homepage:', error.message);
      reject(error);
    });

    req.setTimeout(10000, () => {
      console.error('❌ Homepage request timeout');
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.end();
  });
}

testHomepage().catch(console.error);
