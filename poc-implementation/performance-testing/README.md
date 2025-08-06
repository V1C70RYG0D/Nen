# Performance Testing Suite

This comprehensive performance testing suite validates system performance under various load conditions for the Nen Platform POC chess game system.

## Overview

The testing suite includes:

- **Load Testing Tools**: k6 and Artillery configurations
- **Test Scenarios**: Single user, concurrent users (10-1000), sustained load, spike tests
- **System Monitoring**: Real-time resource tracking (CPU, memory, network, processes)
- **Database Performance**: Query optimization, connection pooling, index effectiveness
- **WebSocket Scalability**: Real-time communication performance
- **AI Service Performance**: Move generation and concurrent request handling
- **Comprehensive Reporting**: Automated report generation with recommendations

## Prerequisites

### Required Tools

```bash
# Install k6
# Windows (using chocolatey)
choco install k6

# macOS (using homebrew)
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Install Artillery
npm install -g artillery

# Install Node.js dependencies (if not already installed)
npm install
```

### System Requirements

- **Node.js**: v18+ recommended
- **Memory**: 4GB+ available for testing
- **Network**: Stable connection to target services
- **Disk Space**: 1GB+ for reports and logs

## Quick Start

### 1. Run All Performance Tests

```bash
# Run complete test suite (recommended)
node performance-testing/scripts/run-performance-tests.js

# Skip long-running tests (faster execution)
node performance-testing/scripts/run-performance-tests.js --skip-long-tests

# Run with custom URLs
node performance-testing/scripts/run-performance-tests.js \
  --base-url http://localhost:3001 \
  --ws-url ws://localhost:3001 \
  --ai-url http://localhost:5000
```

### 2. Run Individual Tests

#### Single User Test
```bash
k6 run \
  -e BASE_URL=http://localhost:3001 \
  -e WS_URL=ws://localhost:3001 \
  -e AI_URL=http://localhost:5000 \
  performance-testing/k6/single-user-gameplay.js
```

#### Concurrent Users Test
```bash
k6 run \
  -e TARGET_USERS=100 \
  -e TEST_DURATION=10m \
  -e BASE_URL=http://localhost:3001 \
  performance-testing/k6/concurrent-users.js
```

#### WebSocket Scalability Test
```bash
artillery run performance-testing/artillery/websocket-scalability.yml
```

#### API Performance Test
```bash
artillery run performance-testing/artillery/api-performance.yml
```

### 3. System Monitoring

```bash
# Start system monitoring (runs until Ctrl+C)
node performance-testing/monitoring/system-monitor.js

# Custom monitoring interval (default: 1000ms)
node performance-testing/monitoring/system-monitor.js --interval 2000

# Custom output directory
node performance-testing/monitoring/system-monitor.js --output-dir ./my-reports
```

### 4. Database Performance Testing

```bash
node performance-testing/scripts/database-performance.js
```

## Test Scenarios

### Load Testing Scenarios

| Test | Users | Duration | Purpose |
|------|--------|----------|---------|
| Single User | 1 | 2m | Baseline performance |
| Concurrent 10 | 10 | 8m | Light load validation |
| Concurrent 100 | 100 | 15m | Moderate load testing |
| Concurrent 1000 | 1000 | 20m | High load testing |
| Sustained Load | 50 | 30m | Long-term stability |
| Spike Test | 20→500→20 | 10m | Traffic spike resilience |

### Performance Thresholds

#### API Performance
- **Response Time**: 95th percentile < 1000ms
- **Error Rate**: < 5%
- **Throughput**: > 50 RPS minimum

#### WebSocket Performance
- **Connection Time**: Average < 2000ms
- **Message Latency**: 95th percentile < 500ms
- **Concurrent Connections**: Target-dependent

#### Database Performance
- **Query Time**: Average < 100ms
- **Connection Acquisition**: < 50ms
- **Transaction Time**: < 200ms

#### AI Service Performance
- **Move Generation**: < 2000ms average
- **Concurrent Requests**: Handle 10+ simultaneously
- **Error Rate**: < 2%

## Configuration Options

### Environment Variables

```bash
# Service URLs
BASE_URL=http://localhost:3001
WS_URL=ws://localhost:3001
AI_URL=http://localhost:5000

# Test Configuration
TARGET_USERS=100
TEST_DURATION=10m
SUSTAINED_USERS=50
SUSTAINED_DURATION=30m
BASELINE_USERS=20
SPIKE_USERS=500

# Database
DATABASE_URL=postgresql://localhost:5432/nen_db
```

### Test Customization

#### k6 Tests
Modify test parameters in the script files:
- `options.stages`: Test load profile
- `options.thresholds`: Performance criteria
- Custom metrics and checks

#### Artillery Tests
Edit YAML configuration files:
- `config.phases`: Load phases
- `config.variables`: Test data
- `scenarios`: Test workflows

## Reports and Analysis

### Generated Reports

All tests generate comprehensive reports in the `performance-testing/reports/` directory:

- **JSON Reports**: Raw test data and metrics
- **Markdown Reports**: Human-readable summaries
- **System Monitoring**: Resource usage data
- **Database Performance**: Query and connection analysis

### Report Structure

```
performance-testing/reports/
├── k6/                          # k6 test outputs
│   ├── single-user-*.json
│   ├── concurrent-users-*.json
│   └── spike-test-*.json
├── artillery/                   # Artillery test outputs
│   ├── websocket-*.json
│   └── api-performance-*.json
├── system-monitor-*.json        # System resource data
├── database-performance-*.json  # Database metrics
└── performance-test-report-*.md # Comprehensive summary
```

### Key Metrics

#### Performance Indicators
- **Response Time**: Average, 95th percentile, 99th percentile
- **Throughput**: Requests per second (RPS)
- **Error Rate**: Percentage of failed requests
- **Concurrency**: Active connections/users
- **Resource Usage**: CPU, memory, network I/O

#### System Health
- **Service Availability**: Uptime during testing
- **Connection Pool Health**: Database connection efficiency
- **Memory Usage**: Heap and system memory consumption
- **CPU Utilization**: Processing load distribution

## Troubleshooting

### Common Issues

#### Test Failures
```bash
# Check service health first
curl http://localhost:3001/api/health
curl http://localhost:5000/health

# Verify all services are running
ps aux | grep node
ps aux | grep python
```

#### Resource Issues
```bash
# Check available memory
free -h  # Linux
vm_stat  # macOS
wmic computersystem get TotalPhysicalMemory  # Windows

# Monitor during tests
top       # Linux/macOS  
taskmgr   # Windows
```

#### Connection Issues
```bash
# Check port availability
netstat -an | grep :3001
netstat -an | grep :5000

# Test WebSocket connectivity
wscat -c ws://localhost:3001/socket.io/?EIO=4&transport=websocket
```

### Performance Optimization

#### Database
- Add indexes for frequently queried fields
- Optimize connection pool size
- Enable query logging and analysis
- Consider read replicas for read-heavy workloads

#### API Server
- Enable compression (gzip)
- Implement response caching
- Optimize middleware chain
- Consider clustering/PM2

#### WebSocket Server
- Implement connection limits
- Use Redis adapter for scaling
- Optimize message serialization
- Consider WebSocket compression

#### AI Service
- Implement request queuing
- Cache common positions
- Optimize model inference
- Consider GPU acceleration

### Scaling Recommendations

#### Horizontal Scaling
- Load balancer configuration
- Service discovery setup
- Database clustering
- Cache layer (Redis)

#### Vertical Scaling
- Memory allocation tuning
- CPU core utilization
- Network bandwidth optimization
- Storage I/O improvements

## Best Practices

### Testing Strategy
1. **Start Small**: Begin with single-user tests
2. **Gradual Scaling**: Increase load incrementally
3. **Monitor Resources**: Watch system metrics during tests
4. **Baseline First**: Establish performance baselines
5. **Regular Testing**: Run tests after code changes

### Production Readiness
1. **All Tests Pass**: Ensure critical tests succeed
2. **Resource Headroom**: Leave capacity for traffic spikes
3. **Error Handling**: Graceful degradation under load
4. **Monitoring Setup**: Production monitoring systems
5. **Scaling Plan**: Documented scaling procedures

### Report Analysis
1. **Trend Analysis**: Compare results over time
2. **Bottleneck Identification**: Find performance constraints
3. **Capacity Planning**: Determine scaling requirements
4. **SLA Validation**: Verify service level agreements
5. **Optimization Priority**: Focus on high-impact improvements

## Advanced Usage

### Custom Test Development

#### Creating New k6 Tests
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 20 },
    { duration: '5m', target: 20 },
    { duration: '2m', target: 0 }
  ]
};

export default function () {
  let response = http.get('http://test.api.com/endpoint');
  check(response, {
    'status is 200': (r) => r.status === 200,
  });
  sleep(1);
}
```

#### Creating New Artillery Tests
```yaml
config:
  target: 'http://localhost:3001'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "Custom Test Scenario"
    flow:
      - get:
          url: "/api/custom-endpoint"
```

### Integration with CI/CD

#### GitHub Actions Example
```yaml
name: Performance Tests
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:

jobs:
  performance-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: |
          npm install
          npm install -g k6 artillery
      - name: Start services
        run: |
          npm run start:backend &
          npm run start:ai &
          sleep 30
      - name: Run performance tests
        run: |
          node performance-testing/scripts/run-performance-tests.js --skip-long-tests
      - name: Upload reports
        uses: actions/upload-artifact@v3
        with:
          name: performance-reports
          path: performance-testing/reports/
```

## Support and Contributing

### Getting Help
- Check the troubleshooting section above
- Review test logs in the reports directory
- Open an issue with test results and system information

### Contributing
1. Fork the repository
2. Create feature branch for new tests
3. Follow existing patterns and conventions
4. Include documentation for new features
5. Test thoroughly before submitting PR

### Test Development Guidelines
- Use descriptive test names
- Include performance thresholds
- Add error handling and logging
- Generate comprehensive reports
- Document configuration options

## License

This performance testing suite is part of the Nen Platform POC project and follows the same licensing terms.
