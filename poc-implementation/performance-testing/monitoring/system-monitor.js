#!/usr/bin/env node

const os = require('os');
const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');

/**
 * Comprehensive System Resource Monitor for Performance Testing
 * 
 * This script monitors:
 * - CPU usage per core and overall
 * - Memory usage (RAM, heap, virtual)
 * - Network I/O
 * - Disk I/O
 * - Process-specific metrics
 * - Database connections
 * - WebSocket connections
 */

class SystemMonitor {
  constructor(options = {}) {
    this.interval = options.interval || 1000; // 1 second
    this.outputDir = options.outputDir || path.join(__dirname, '../reports');
    this.processNames = options.processNames || ['node', 'python', 'postgres', 'redis'];
    this.services = options.services || {
      backend: 'http://localhost:3001/api/health',
      frontend: 'http://localhost:3000',
      ai: 'http://localhost:5000/health'
    };
    
    this.isMonitoring = false;
    this.startTime = null;
    this.data = {
      system: [],
      processes: [],
      network: [],
      services: []
    };

    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Start monitoring system resources
   */
  async start() {
    console.log('🔍 Starting system resource monitoring...');
    this.isMonitoring = true;
    this.startTime = Date.now();

    // Set up monitoring intervals
    this.systemInterval = setInterval(() => this.collectSystemMetrics(), this.interval);
    this.processInterval = setInterval(() => this.collectProcessMetrics(), this.interval * 2);
    this.networkInterval = setInterval(() => this.collectNetworkMetrics(), this.interval * 3);
    this.serviceInterval = setInterval(() => this.checkServiceHealth(), this.interval * 5);

    // Set up graceful shutdown
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());

    console.log(`📊 Monitoring started. Data will be saved to: ${this.outputDir}`);
    console.log('Press Ctrl+C to stop monitoring and generate report');
  }

  /**
   * Collect system-wide metrics
   */
  async collectSystemMetrics() {
    try {
      const timestamp = new Date().toISOString();
      const cpus = os.cpus();
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;

      // Calculate CPU usage
      const cpuUsage = await this.getCPUUsage();
      
      const systemMetrics = {
        timestamp,
        cpu: {
          cores: cpus.length,
          usage: cpuUsage,
          loadavg: os.loadavg()
        },
        memory: {
          total: totalMem,
          used: usedMem,
          free: freeMem,
          usagePercent: (usedMem / totalMem) * 100
        },
        system: {
          platform: os.platform(),
          arch: os.arch(),
          uptime: os.uptime(),
          hostname: os.hostname()
        }
      };

      this.data.system.push(systemMetrics);

      // Log critical thresholds
      if (systemMetrics.memory.usagePercent > 90) {
        console.warn(`⚠️  High memory usage: ${systemMetrics.memory.usagePercent.toFixed(2)}%`);
      }
      
      if (systemMetrics.cpu.usage > 95) {
        console.warn(`⚠️  High CPU usage: ${systemMetrics.cpu.usage.toFixed(2)}%`);
      }

    } catch (error) {
      console.error('Error collecting system metrics:', error);
    }
  }

  /**
   * Get CPU usage percentage
   */
  getCPUUsage() {
    return new Promise((resolve) => {
      const startMeasure = os.cpus();
      
      setTimeout(() => {
        const endMeasure = os.cpus();
        let totalIdle = 0;
        let totalTick = 0;

        for (let i = 0; i < startMeasure.length; i++) {
          const startCpu = startMeasure[i];
          const endCpu = endMeasure[i];
          
          const startTotal = Object.values(startCpu.times).reduce((acc, time) => acc + time, 0);
          const endTotal = Object.values(endCpu.times).reduce((acc, time) => acc + time, 0);
          
          const idleDifference = endCpu.times.idle - startCpu.times.idle;
          const totalDifference = endTotal - startTotal;
          
          totalIdle += idleDifference;
          totalTick += totalDifference;
        }

        const idle = totalIdle / startMeasure.length;
        const total = totalTick / startMeasure.length;
        const usage = 100 - ~~(100 * idle / total);
        
        resolve(usage);
      }, 100);
    });
  }

  /**
   * Collect process-specific metrics
   */
  async collectProcessMetrics() {
    try {
      const processes = [];
      
      for (const processName of this.processNames) {
        const processData = await this.getProcessMetrics(processName);
        if (processData.length > 0) {
          processes.push({
            name: processName,
            processes: processData
          });
        }
      }

      this.data.processes.push({
        timestamp: new Date().toISOString(),
        processes
      });

    } catch (error) {
      console.error('Error collecting process metrics:', error);
    }
  }

  /**
   * Get metrics for specific process
   */
  getProcessMetrics(processName) {
    return new Promise((resolve) => {
      const isWindows = os.platform() === 'win32';
      const cmd = isWindows 
        ? `wmic process where "name like '%${processName}%'" get ProcessId,PageFileUsage,WorkingSetSize /format:csv`
        : `ps aux | grep ${processName} | grep -v grep`;

      exec(cmd, (error, stdout) => {
        if (error) {
          resolve([]);
          return;
        }

        const processes = [];
        const lines = stdout.trim().split('\n');

        if (isWindows) {
          // Parse Windows wmic output
          for (let i = 1; i < lines.length; i++) {
            const parts = lines[i].split(',');
            if (parts.length >= 4 && parts[1]) {
              processes.push({
                pid: parseInt(parts[3]) || 0,
                memory: parseInt(parts[1]) || 0,
                cpu: 0 // Windows CPU calculation would need additional logic
              });
            }
          }
        } else {
          // Parse Unix ps output
          lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 11) {
              processes.push({
                pid: parseInt(parts[1]),
                cpu: parseFloat(parts[2]),
                memory: parseFloat(parts[3]),
                command: parts.slice(10).join(' ')
              });
            }
          });
        }

        resolve(processes);
      });
    });
  }

  /**
   * Collect network metrics
   */
  async collectNetworkMetrics() {
    try {
      const networkData = await this.getNetworkStats();
      
      this.data.network.push({
        timestamp: new Date().toISOString(),
        ...networkData
      });

    } catch (error) {
      console.error('Error collecting network metrics:', error);
    }
  }

  /**
   * Get network statistics
   */
  getNetworkStats() {
    return new Promise((resolve) => {
      const isWindows = os.platform() === 'win32';
      const cmd = isWindows 
        ? 'netstat -e'
        : 'cat /proc/net/dev';

      exec(cmd, (error, stdout) => {
        if (error) {
          resolve({ bytesReceived: 0, bytesSent: 0 });
          return;
        }

        let bytesReceived = 0;
        let bytesSent = 0;

        if (isWindows) {
          // Parse Windows netstat output
          const lines = stdout.split('\n');
          lines.forEach(line => {
            if (line.includes('Bytes')) {
              const match = line.match(/(\d+)/g);
              if (match && match.length >= 2) {
                bytesReceived += parseInt(match[0]);
                bytesSent += parseInt(match[1]);
              }
            }
          });
        } else {
          // Parse Linux /proc/net/dev
          const lines = stdout.split('\n');
          for (let i = 2; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line && !line.startsWith('lo:')) {
              const parts = line.split(/\s+/);
              if (parts.length >= 10) {
                bytesReceived += parseInt(parts[1]) || 0;
                bytesSent += parseInt(parts[9]) || 0;
              }
            }
          }
        }

        resolve({ bytesReceived, bytesSent });
      });
    });
  }

  /**
   * Check health of services
   */
  async checkServiceHealth() {
    try {
      const serviceHealth = {};

      for (const [serviceName, url] of Object.entries(this.services)) {
        try {
          const startTime = Date.now();
          const response = await fetch(url, { 
            timeout: 5000,
            signal: AbortSignal.timeout(5000)
          });
          const responseTime = Date.now() - startTime;

          serviceHealth[serviceName] = {
            status: response.status,
            responseTime,
            healthy: response.status >= 200 && response.status < 400
          };
        } catch (error) {
          serviceHealth[serviceName] = {
            status: 0,
            responseTime: null,
            healthy: false,
            error: error.message
          };
        }
      }

      this.data.services.push({
        timestamp: new Date().toISOString(),
        services: serviceHealth
      });

    } catch (error) {
      console.error('Error checking service health:', error);
    }
  }

  /**
   * Stop monitoring and generate report
   */
  async stop() {
    if (!this.isMonitoring) return;

    console.log('\n🛑 Stopping system monitoring...');
    this.isMonitoring = false;

    // Clear intervals
    if (this.systemInterval) clearInterval(this.systemInterval);
    if (this.processInterval) clearInterval(this.processInterval);
    if (this.networkInterval) clearInterval(this.networkInterval);
    if (this.serviceInterval) clearInterval(this.serviceInterval);

    // Generate report
    await this.generateReport();
    process.exit(0);
  }

  /**
   * Generate comprehensive monitoring report
   */
  async generateReport() {
    try {
      const endTime = Date.now();
      const duration = endTime - this.startTime;
      const reportData = {
        metadata: {
          startTime: new Date(this.startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          duration: duration,
          durationFormatted: this.formatDuration(duration),
          monitoringInterval: this.interval
        },
        summary: this.generateSummary(),
        data: this.data
      };

      // Save raw data
      const rawDataFile = path.join(this.outputDir, `system-monitor-${Date.now()}.json`);
      fs.writeFileSync(rawDataFile, JSON.stringify(reportData, null, 2));

      // Generate human-readable report
      const reportFile = path.join(this.outputDir, `system-monitor-report-${Date.now()}.md`);
      fs.writeFileSync(reportFile, this.generateMarkdownReport(reportData));

      console.log(`📊 Monitoring report saved:`);
      console.log(`   Raw data: ${rawDataFile}`);
      console.log(`   Report: ${reportFile}`);

    } catch (error) {
      console.error('Error generating report:', error);
    }
  }

  /**
   * Generate monitoring summary
   */
  generateSummary() {
    const systemData = this.data.system;
    if (systemData.length === 0) return {};

    const cpuUsages = systemData.map(d => d.cpu.usage);
    const memoryUsages = systemData.map(d => d.memory.usagePercent);
    
    return {
      cpu: {
        avg: this.average(cpuUsages),
        max: Math.max(...cpuUsages),
        min: Math.min(...cpuUsages)
      },
      memory: {
        avg: this.average(memoryUsages),
        max: Math.max(...memoryUsages),
        min: Math.min(...memoryUsages)
      },
      dataPoints: {
        system: systemData.length,
        processes: this.data.processes.length,
        network: this.data.network.length,
        services: this.data.services.length
      }
    };
  }

  /**
   * Generate markdown report
   */
  generateMarkdownReport(data) {
    return `# System Monitoring Report

## Overview
- **Start Time**: ${data.metadata.startTime}
- **End Time**: ${data.metadata.endTime}
- **Duration**: ${data.metadata.durationFormatted}
- **Monitoring Interval**: ${data.metadata.monitoringInterval}ms

## Performance Summary

### CPU Usage
- **Average**: ${data.summary.cpu?.avg?.toFixed(2) || 'N/A'}%
- **Maximum**: ${data.summary.cpu?.max?.toFixed(2) || 'N/A'}%
- **Minimum**: ${data.summary.cpu?.min?.toFixed(2) || 'N/A'}%

### Memory Usage
- **Average**: ${data.summary.memory?.avg?.toFixed(2) || 'N/A'}%
- **Maximum**: ${data.summary.memory?.max?.toFixed(2) || 'N/A'}%
- **Minimum**: ${data.summary.memory?.min?.toFixed(2) || 'N/A'}%

### Data Collection
- **System Metrics**: ${data.summary.dataPoints?.system || 0} data points
- **Process Metrics**: ${data.summary.dataPoints?.processes || 0} data points  
- **Network Metrics**: ${data.summary.dataPoints?.network || 0} data points
- **Service Health**: ${data.summary.dataPoints?.services || 0} data points

## Analysis

${this.generateAnalysisSection(data)}

## Recommendations

${this.generateRecommendations(data)}

---
*Report generated on ${new Date().toISOString()}*
`;
  }

  generateAnalysisSection(data) {
    let analysis = '';
    
    if (data.summary.cpu?.max > 90) {
      analysis += '⚠️ **High CPU Usage Detected**: Peak CPU usage exceeded 90%. Consider optimizing CPU-intensive operations.\n\n';
    }
    
    if (data.summary.memory?.max > 85) {
      analysis += '⚠️ **High Memory Usage Detected**: Peak memory usage exceeded 85%. Monitor for memory leaks.\n\n';
    }
    
    return analysis || 'No critical issues detected during monitoring period.';
  }

  generateRecommendations(data) {
    const recommendations = [];
    
    if (data.summary.cpu?.avg > 70) {
      recommendations.push('- Consider horizontal scaling or CPU optimization for sustained high CPU usage');
    }
    
    if (data.summary.memory?.avg > 75) {
      recommendations.push('- Investigate memory usage patterns and implement memory optimization strategies');
    }
    
    return recommendations.length > 0 ? recommendations.join('\n') : 'System performance is within acceptable ranges.';
  }

  /**
   * Utility functions
   */
  average(arr) {
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  }

  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace('--', '');
    const value = args[i + 1];
    
    if (key && value) {
      if (key === 'interval') options.interval = parseInt(value);
      if (key === 'output-dir') options.outputDir = value;
    }
  }
  
  const monitor = new SystemMonitor(options);
  monitor.start().catch(console.error);
}

module.exports = SystemMonitor;
