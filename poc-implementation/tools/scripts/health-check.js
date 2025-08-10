#!/usr/bin/env node

/**
 * Health Check Script
 * Verifies system health and readiness
 */

const http = require('http');
const https = require('https');
const { execSync } = require('child_process');

class HealthChecker {
  constructor() {
    this.results = {
      backend: false,
      frontend: false,
      database: false,
      services: []
    };
  }

  async checkEndpoint(url, name) {
    return new Promise((resolve) => {
      const client = url.startsWith('https') ? https : http;
      const request = client.get(url, (res) => {
        const healthy = res.statusCode === 200;
        console.log(`${healthy ? '✅' : '❌'} ${name}: ${res.statusCode}`);
        resolve(healthy);
      });

      request.on('error', (err) => {
        console.log(`❌ ${name}: ${err.message}`);
        resolve(false);
      });

      request.setTimeout(5000, () => {
        console.log(`❌ ${name}: Timeout`);
        request.destroy();
        resolve(false);
      });
    });
  }

  async checkServices() {
    console.log('🔍 Checking service health...\n');

    const services = [
      { name: 'Backend API', url: process.env.API_BASE_URL + '/health' },
      { name: 'Frontend', url: process.env.FRONTEND_URL },
      { name: 'WebSocket', url: process.env.WS_ENDPOINT?.replace('ws', 'http') + '/health' }
    ];

    for (const service of services) {
      if (service.url && !service.url.includes('undefined')) {
        const healthy = await this.checkEndpoint(service.url, service.name);
        this.results.services.push({ name: service.name, healthy });
      }
    }
  }

  checkDependencies() {
    console.log('\n📦 Checking dependencies...\n');

    try {
      execSync('npm list --depth=0', { stdio: 'pipe' });
      console.log('✅ NPM dependencies: OK');
      return true;
    } catch (error) {
      console.log('❌ NPM dependencies: Issues found');
      return false;
    }
  }

  generateReport() {
    console.log('\n📊 Health Check Summary');
    console.log('========================');

    const healthyServices = this.results.services.filter(s => s.healthy).length;
    const totalServices = this.results.services.length;
    const overallHealth = totalServices > 0 ? (healthyServices / totalServices) * 100 : 0;

    console.log(`\nOverall Health: ${overallHealth.toFixed(1)}% (${healthyServices}/${totalServices} services healthy)`);

    if (overallHealth === 100) {
      console.log('🎉 All systems operational!');
      return 0;
    } else {
      console.log('⚠️  Some services require attention');
      return 1;
    }
  }

  async run() {
    console.log('🏥 Starting Health Check...\n');

    await this.checkServices();
    this.checkDependencies();

    return this.generateReport();
  }
}

// Run if called directly
if (require.main === module) {
  require('dotenv').config();

  const checker = new HealthChecker();
  checker.run().then(exitCode => {
    process.exit(exitCode);
  }).catch(error => {
    console.error('❌ Health check failed:', error);
    process.exit(1);
  });
}

module.exports = HealthChecker;
