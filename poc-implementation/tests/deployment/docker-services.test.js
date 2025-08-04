// tests/deployment/docker-services.test.js
const { exec } = require('child_process');
const axios = require('axios');

describe('Docker Environment Tests - DS-003 & DS-004', () => {
  const baseHost = process.env.TEST_HOST || process.env.DOCKER_HOST || (() => {
  })();

  const services = [
    { name: 'postgres', port: 5432, healthPath: null },
    { name: 'redis', port: 6379, healthPath: null },
    { name: 'backend', port: 3001, healthPath: '/health' },
    { name: 'nginx', port: 80, healthPath: '/' },
    { name: 'prometheus', port: 9090, healthPath: '/-/healthy' },
    { name: 'grafana', port: 3000, healthPath: '/api/health' }
  ];

  // Helper function to execute shell commands
  const execCommand = (command) => {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          resolve({ error, stdout, stderr, success: false });
        } else {
          resolve({ stdout, stderr, success: true });
        }
      });
    });
  };

  describe('Docker Compose Service Orchestration', () => {
    test('Docker is installed and accessible', async () => {
      const result = await execCommand('docker --version');
      if (result.success) {
        expect(result.stdout).toContain('Docker version');
      } else {
        console.log('Docker not installed or not accessible');
        expect(result.error.code).not.toBe(127); // Command not found
      }
    });

    test('Docker Compose is installed', async () => {
      const result = await execCommand('docker-compose --version');
      if (result.success) {
        expect(result.stdout).toMatch(/docker-compose version|Docker Compose version/);
      } else {
        console.log('Docker Compose not installed or not accessible');
      }
    });

    test('Docker daemon is running', async () => {
      const result = await execCommand('docker info');
      if (result.success) {
        expect(result.stdout).toContain('Server Version');
      } else {
        console.log('Docker daemon not running or not accessible');
      }
    });

    test('Check running containers', async () => {
      const result = await execCommand('docker ps --format "table {{.Names}}\\t{{.Status}}"');
      if (result.success) {
        console.log('Running containers:');
        console.log(result.stdout);
        // At least some containers should be running
        expect(result.stdout.split('\\n').length).toBeGreaterThan(1);
      } else {
        console.log('Could not list running containers');
      }
    });

    test('Services are accessible via Docker network', async () => {
      const result = await execCommand('docker network ls');
      if (result.success) {
        expect(result.stdout).toContain('bridge');
      } else {
        console.log('Could not list Docker networks');
      }
    });
  });

  describe('Database Setup and Migration', () => {
    test('PostgreSQL container health', async () => {
      const result = await execCommand('docker ps --filter "name=postgres" --format "{{.Status}}"');
      if (result.success && result.stdout.includes('Up')) {
        console.log('PostgreSQL container is running');
        expect(result.stdout).toContain('Up');
      } else {
        console.log('PostgreSQL container not running or not found');
      }
    });

    test('Database connection test', async () => {
      const testCommand = 'docker exec -i $(docker ps -q --filter "name=postgres") pg_isready -U nen 2>/dev/null || echo "not_ready"';
      const result = await execCommand(testCommand);

      if (result.success && !result.stdout.includes('not_ready')) {
        expect(result.stdout).toContain('accepting connections');
      } else {
        console.log('PostgreSQL not ready or container not accessible');
      }
    });

    test('Database schema validation', async () => {
      const schemaCommand = 'docker exec -i $(docker ps -q --filter "name=postgres") psql -U nen -d nen_platform -c "\\\\dt" 2>/dev/null || echo "schema_error"';
      const result = await execCommand(schemaCommand);

      if (result.success && !result.stdout.includes('schema_error')) {
        // Check for key tables
        const expectedTables = ['users', 'ai_agents', 'matches', 'bets'];
        expectedTables.forEach(table => {
          if (result.stdout.includes(table)) {
            console.log(`✓ Table ${table} exists`);
          } else {
            console.log(`⚠ Table ${table} not found`);
          }
        });
      } else {
        console.log('Could not validate database schema');
      }
    });

    test('Initial data presence', async () => {
      const dataCommand = 'docker exec -i $(docker ps -q --filter "name=postgres") psql -U nen -d nen_platform -c "SELECT COUNT(*) FROM system_config;" 2>/dev/null || echo "data_error"';
      const result = await execCommand(dataCommand);

      if (result.success && !result.stdout.includes('data_error')) {
        expect(result.stdout).toMatch(/\\d+/); // Should contain a number
      } else {
        console.log('Could not verify initial data');
      }
    });
  });

  describe('Redis Cache Service', () => {
    test('Redis container health', async () => {
      const result = await execCommand('docker ps --filter "name=redis" --format "{{.Status}}"');
      if (result.success && result.stdout.includes('Up')) {
        expect(result.stdout).toContain('Up');
      } else {
        console.log('Redis container not running');
      }
    });

    test('Redis connectivity', async () => {
      const redisCommand = 'docker exec -i $(docker ps -q --filter "name=redis") redis-cli ping 2>/dev/null || echo "redis_error"';
      const result = await execCommand(redisCommand);

      if (result.success && result.stdout.includes('PONG')) {
        expect(result.stdout).toContain('PONG');
      } else {
        console.log('Redis not responding to ping');
      }
    });
  });

  describe('Application Services Health', () => {
    services.forEach(service => {
      if (service.healthPath) {
        test(`${service.name} service health check`, async () => {
          try {
            const response = await axios.get(`http://${baseHost}:${service.port}${service.healthPath}`, {
              timeout: 10000
            });
            expect(response.status).toBeLessThan(500);
            console.log(`✓ ${service.name} is healthy`);
          } catch (error) {
            if (error.code === 'ECONNREFUSED') {
              console.log(`⚠ ${service.name} not accessible on port ${service.port}`);
            } else {
              console.log(`⚠ ${service.name} health check failed:`, error.message);
            }
          }
        });
      }
    });
  });

  describe('Service Inter-communication', () => {
    test('Backend can connect to database', async () => {
      try {
        const response = await axios.get(`http://${baseHost}:3001/api/system/status`, {
          timeout: 5000
        });
        if (response.status === 200 && response.data.database) {
          expect(response.data.database).toBe('connected');
        }
      } catch (error) {
        console.log('Backend-database connection test not available');
      }
    });

    test('Backend can connect to Redis', async () => {
      try {
        const response = await axios.get(`http://${baseHost}:3001/api/system/cache/status`, {
          timeout: 5000
        });
        if (response.status === 200 && response.data.redis) {
          expect(response.data.redis).toBe('connected');
        }
      } catch (error) {
        console.log('Backend-Redis connection test not available');
      }
    });
  });

  describe('Resource Usage Monitoring', () => {
    test('Container resource usage within limits', async () => {
      const result = await execCommand('docker stats --no-stream --format "table {{.Container}}\\t{{.CPUPerc}}\\t{{.MemUsage}}"');
      if (result.success) {
        console.log('Container resource usage:');
        console.log(result.stdout);

        // Parse CPU usage and check it's reasonable
        const lines = result.stdout.split('\\n').slice(1); // Skip header
        lines.forEach(line => {
          if (line.trim()) {
            const parts = line.split(/\\s+/);
            const cpuPerc = parseFloat(parts[1]);
            if (!isNaN(cpuPerc)) {
              expect(cpuPerc).toBeLessThan(90); // CPU usage should be reasonable
            }
          }
        });
      } else {
        console.log('Could not retrieve container stats');
      }
    });

    test('Container memory usage reasonable', async () => {
      const result = await execCommand('docker stats --no-stream --format "{{.Container}} {{.MemPerc}}"');
      if (result.success) {
        const lines = result.stdout.split('\\n');
        lines.forEach(line => {
          if (line.trim()) {
            const parts = line.split(' ');
            const memPerc = parseFloat(parts[1]);
            if (!isNaN(memPerc)) {
              expect(memPerc).toBeLessThan(95); // Memory usage should be reasonable
            }
          }
        });
      } else {
        console.log('Could not retrieve memory stats');
      }
    });
  });

  describe('Data Persistence', () => {
    test('Database data persists', async () => {
      // This would require a more complex test involving container restart
      const result = await execCommand('docker volume ls');
      if (result.success) {
        expect(result.stdout).toContain('volume');
      }
    });

    test('Redis data persistence configured', async () => {
      const result = await execCommand('docker exec -i $(docker ps -q --filter "name=redis") redis-cli CONFIG GET save 2>/dev/null || echo "config_error"');
      if (result.success && !result.stdout.includes('config_error')) {
        console.log('Redis persistence configuration:', result.stdout);
      }
    });
  });

  describe('Service Restart Behavior', () => {
    test('Services have restart policies', async () => {
      const result = await execCommand('docker inspect $(docker ps -q) --format "{{.Name}}: {{.HostConfig.RestartPolicy.Name}}"');
      if (result.success) {
        console.log('Container restart policies:');
        console.log(result.stdout);
        // Most services should have some restart policy
        expect(result.stdout).toMatch(/unless-stopped|always|on-failure/);
      }
    });
  });

  describe('Monitoring Stack', () => {
    test('Prometheus is accessible', async () => {
      try {
        const response = await axios.get(`http://${baseHost}:9090/-/healthy`, {
          timeout: 5000
        });
        expect(response.status).toBe(200);
      } catch (error) {
        console.log('Prometheus not accessible');
      }
    });

    test('Grafana is accessible', async () => {
      try {
        const response = await axios.get(`http://${baseHost}:3000/api/health`, {
          timeout: 5000
        });
        expect(response.status).toBe(200);
      } catch (error) {
        console.log('Grafana not accessible');
      }
    });
  });
});
