#!/usr/bin/env node

/**
 * Production Readiness Validator
 * Comprehensive validation of production build readiness
 * Validates environment, security, performance, and system stability
 *
 * Following rules: 1, 2, 3, 8, 15, 20
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const crypto = require('crypto');

class ProductionReadinessValidator {
    constructor() {
        this.results = {
            environment: [],
            security: [],
            dependencies: [],
            performance: [],
            healthChecks: [],
            errors: [],
            warnings: []
        };
        this.startTime = Date.now();
        this.logFile = path.join(__dirname, 'logs', `production-validation-${Date.now()}.log`);
        this.ensureLogDirectory();
    }

    ensureLogDirectory() {
        const logDir = path.dirname(this.logFile);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [${level}] ${message}`;

        console.log(logEntry);
        fs.appendFileSync(this.logFile, logEntry + '\n');
    }

    logError(message, error = null) {
        const errorMsg = error ? `${message}: ${error.message}` : message;
        this.log(errorMsg, 'ERROR');
        this.results.errors.push(errorMsg);
    }

    logWarning(message) {
        this.log(message, 'WARN');
        this.results.warnings.push(message);
    }

    logSuccess(message) {
        this.log(`✅ ${message}`, 'SUCCESS');
    }

    // Environment Configuration Validation
    validateEnvironmentConfiguration() {
        this.log('🔧 Validating Environment Configuration...');

        const requiredEnvVars = [
            'NODE_ENV',
            'DATABASE_URL',
            'REDIS_URL',
            'JWT_SECRET',
            'PORT'
        ];

        const productionEnvVars = [
            'POSTGRES_DB',
            'POSTGRES_USER',
            'POSTGRES_PASSWORD',
            'RATE_LIMIT_WINDOW_MS',
            'RATE_LIMIT_MAX_REQUESTS',
            'LOG_LEVEL'
        ];

        let envScore = 0;
        const totalEnvChecks = requiredEnvVars.length + productionEnvVars.length;

        // Check required environment variables
        requiredEnvVars.forEach(envVar => {
            if (process.env[envVar]) {
                this.logSuccess(`Required env var ${envVar} is set`);
                envScore++;
            } else {
                this.logError(`Missing required environment variable: ${envVar}`);
            }
        });

        // Check production-specific environment variables
        productionEnvVars.forEach(envVar => {
            if (process.env[envVar]) {
                this.logSuccess(`Production env var ${envVar} is set`);
                envScore++;
            } else {
                this.logWarning(`Missing production environment variable: ${envVar}`);
            }
        });

        // Validate NODE_ENV for production
        if (process.env.NODE_ENV === 'production') {
            this.logSuccess('NODE_ENV is set to production');
            envScore++;
        } else {
            this.logWarning(`NODE_ENV is '${process.env.NODE_ENV}', should be 'production' for production deployment`);
        }

        // Check for sensitive data in environment
        this.validateSecureEnvironment();

        const envHealthScore = Math.round((envScore / totalEnvChecks) * 100);
        this.results.environment.push({
            category: 'Environment Configuration',
            score: envHealthScore,
            status: envHealthScore >= 80 ? 'PASS' : 'FAIL',
            details: `${envScore}/${totalEnvChecks} environment checks passed`
        });

        return envHealthScore >= 80;
    }

    validateSecureEnvironment() {
        // Check for weak secrets
        const weakSecrets = ['test', 'development', 'secret', 'password', '123456'];

        if (process.env.JWT_SECRET) {
            const jwtSecret = process.env.JWT_SECRET.toLowerCase();
            if (weakSecrets.some(weak => jwtSecret.includes(weak))) {
                this.logError('JWT_SECRET appears to contain weak/default values');
            } else if (process.env.JWT_SECRET.length < 32) {
                this.logWarning('JWT_SECRET is shorter than recommended 32 characters');
            } else {
                this.logSuccess('JWT_SECRET appears to be properly configured');
            }
        }

        // Check database URL for security
        if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost')) {
            this.logWarning('DATABASE_URL points to localhost - ensure this is intended for production');
        }
    }

    // Security Configuration Validation
    validateSecurityConfiguration() {
        this.log('🔒 Validating Security Configuration...');

        let securityScore = 0;
        const securityChecks = [];

        // Check for security-related packages in package.json
        try {
            const packageJsonPath = path.join(__dirname, 'package.json');
            if (fs.existsSync(packageJsonPath)) {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

                const securityPackages = ['helmet', 'cors', 'express-rate-limit', 'bcrypt'];
                securityPackages.forEach(pkg => {
                    if (packageJson.dependencies?.[pkg] || packageJson.devDependencies?.[pkg]) {
                        this.logSuccess(`Security package ${pkg} is installed`);
                        securityScore++;
                    } else {
                        this.logWarning(`Security package ${pkg} is not installed`);
                    }
                });

                securityChecks.push('Security packages check');
            }
        } catch (error) {
            this.logError('Failed to validate security packages', error);
        }

        // Check for SSL/TLS configuration files
        const sslPaths = [
            path.join(__dirname, 'infrastructure', 'nginx', 'ssl'),
            path.join(__dirname, 'config', 'ssl'),
            path.join(__dirname, 'certs')
        ];

        let sslFound = false;
        sslPaths.forEach(sslPath => {
            if (fs.existsSync(sslPath)) {
                this.logSuccess(`SSL configuration directory found: ${sslPath}`);
                sslFound = true;
                securityScore++;
            }
        });

        if (!sslFound) {
            this.logWarning('No SSL certificate directories found');
        }

        // Check for security-related configuration files
        const securityConfigs = [
            path.join(__dirname, 'config', 'security.json'),
            path.join(__dirname, '.eslintrc.security.json')
        ];

        securityConfigs.forEach(configPath => {
            if (fs.existsSync(configPath)) {
                this.logSuccess(`Security configuration found: ${path.basename(configPath)}`);
                securityScore++;
            }
        });

        const maxSecurityScore = 7; // 4 packages + 1 SSL + 2 configs
        const securityHealthScore = Math.round((securityScore / maxSecurityScore) * 100);

        this.results.security.push({
            category: 'Security Configuration',
            score: securityHealthScore,
            status: securityHealthScore >= 70 ? 'PASS' : 'FAIL',
            details: `${securityScore}/${maxSecurityScore} security checks passed`
        });

        return securityHealthScore >= 70;
    }

    // Dependencies Validation
    validateDependencies() {
        this.log('📦 Validating Dependencies...');

        let dependencyScore = 0;
        const dependencyChecks = [];

        try {
            // Check if node_modules exists
            if (fs.existsSync(path.join(__dirname, 'node_modules'))) {
                this.logSuccess('node_modules directory exists');
                dependencyScore++;
            } else {
                this.logError('node_modules directory not found - run npm install');
            }

            // Check package-lock.json exists
            if (fs.existsSync(path.join(__dirname, 'package-lock.json'))) {
                this.logSuccess('package-lock.json exists for reproducible builds');
                dependencyScore++;
            } else {
                this.logWarning('package-lock.json not found - dependencies may not be locked');
            }

            // Try to validate npm dependencies
            try {
                execSync('npm list --depth=0 --prod', {
                    stdio: 'pipe',
                    cwd: __dirname,
                    timeout: 30000
                });
                this.logSuccess('All production dependencies are installed');
                dependencyScore++;
            } catch (error) {
                this.logWarning('Some production dependencies may be missing or have issues');
            }

            // Check for critical backend dependencies
            const criticalDeps = ['express', 'cors', 'helmet', 'dotenv'];
            const packageJsonPath = path.join(__dirname, 'package.json');

            if (fs.existsSync(packageJsonPath)) {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

                criticalDeps.forEach(dep => {
                    if (packageJson.dependencies?.[dep]) {
                        this.logSuccess(`Critical dependency ${dep} is declared`);
                        dependencyScore++;
                    } else {
                        this.logError(`Critical dependency ${dep} is missing`);
                    }
                });
            }

        } catch (error) {
            this.logError('Failed to validate dependencies', error);
        }

        const maxDepsScore = 3 + 4; // 3 basic checks + 4 critical deps
        const depsHealthScore = Math.round((dependencyScore / maxDepsScore) * 100);

        this.results.dependencies.push({
            category: 'Dependencies',
            score: depsHealthScore,
            status: depsHealthScore >= 80 ? 'PASS' : 'FAIL',
            details: `${dependencyScore}/${maxDepsScore} dependency checks passed`
        });

        return depsHealthScore >= 80;
    }

    // Performance Benchmarks
    async runPerformanceBenchmarks() {
        this.log('⚡ Running Performance Benchmarks...');

        let performanceScore = 0;
        const performanceTests = [];

        // Test 1: Memory usage check
        const memUsage = process.memoryUsage();
        const memUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);

        if (memUsageMB < 100) {
            this.logSuccess(`Memory usage is efficient: ${memUsageMB}MB`);
            performanceScore += 2;
        } else if (memUsageMB < 200) {
            this.logWarning(`Memory usage is acceptable: ${memUsageMB}MB`);
            performanceScore += 1;
        } else {
            this.logError(`Memory usage is high: ${memUsageMB}MB`);
        }

        // Test 2: File system performance
        const testFilePath = path.join(__dirname, 'temp-perf-test.txt');
        const testData = crypto.randomBytes(1024 * 100).toString('hex'); // 100KB

        try {
            const writeStart = Date.now();
            fs.writeFileSync(testFilePath, testData);
            const writeTime = Date.now() - writeStart;

            const readStart = Date.now();
            const readData = fs.readFileSync(testFilePath, 'utf8');
            const readTime = Date.now() - readStart;

            fs.unlinkSync(testFilePath); // Cleanup

            if (writeTime < 50 && readTime < 20) {
                this.logSuccess(`File I/O performance is excellent (W:${writeTime}ms, R:${readTime}ms)`);
                performanceScore += 2;
            } else if (writeTime < 100 && readTime < 50) {
                this.logSuccess(`File I/O performance is good (W:${writeTime}ms, R:${readTime}ms)`);
                performanceScore += 1;
            } else {
                this.logWarning(`File I/O performance needs attention (W:${writeTime}ms, R:${readTime}ms)`);
            }
        } catch (error) {
            this.logError('Failed to test file I/O performance', error);
        }

        // Test 3: CPU performance
        const cpuStart = Date.now();
        let iterations = 0;
        while (Date.now() - cpuStart < 100) { // Run for 100ms
            iterations++;
            Math.sqrt(Math.random() * 1000000);
        }

        if (iterations > 100000) {
            this.logSuccess(`CPU performance is excellent (${iterations} iterations in 100ms)`);
            performanceScore += 2;
        } else if (iterations > 50000) {
            this.logSuccess(`CPU performance is good (${iterations} iterations in 100ms)`);
            performanceScore += 1;
        } else {
            this.logWarning(`CPU performance is limited (${iterations} iterations in 100ms)`);
        }

        const maxPerfScore = 6;
        const perfHealthScore = Math.round((performanceScore / maxPerfScore) * 100);

        this.results.performance.push({
            category: 'Performance Benchmarks',
            score: perfHealthScore,
            status: perfHealthScore >= 70 ? 'PASS' : 'FAIL',
            details: `${performanceScore}/${maxPerfScore} performance tests passed`
        });

        return perfHealthScore >= 70;
    }

    // Health Check Simulations
    async simulateHealthChecks() {
        this.log('🏥 Simulating Health Checks...');

        let healthScore = 0;
        const healthChecks = [];

        // Check 1: Configuration file integrity
        const configFiles = [
            'package.json',
            'tsconfig.json',
            '.env.example'
        ];

        configFiles.forEach(configFile => {
            const filePath = path.join(__dirname, configFile);
            if (fs.existsSync(filePath)) {
                try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    if (configFile.endsWith('.json')) {
                        JSON.parse(content); // Validate JSON
                    }
                    this.logSuccess(`Configuration file ${configFile} is valid`);
                    healthScore++;
                } catch (error) {
                    this.logError(`Configuration file ${configFile} is invalid`, error);
                }
            } else {
                this.logWarning(`Configuration file ${configFile} not found`);
            }
        });

        // Check 2: Backend structure validation
        const backendPaths = [
            path.join(__dirname, 'backend', 'src'),
            path.join(__dirname, 'backend', 'package.json'),
            path.join(__dirname, 'frontend')
        ];

        backendPaths.forEach(backendPath => {
            if (fs.existsSync(backendPath)) {
                this.logSuccess(`Backend structure exists: ${path.basename(backendPath)}`);
                healthScore++;
            } else {
                this.logWarning(`Backend structure missing: ${path.basename(backendPath)}`);
            }
        });

        // Check 3: Docker configuration validation
        const dockerFiles = [
            path.join(__dirname, 'config', 'docker-compose.prod.yml'),
            path.join(__dirname, 'infrastructure', 'docker', 'docker-compose.prod.yml'),
            path.join(__dirname, 'config', 'Dockerfile')
        ];

        let dockerConfigScore = 0;
        dockerFiles.forEach(dockerFile => {
            if (fs.existsSync(dockerFile)) {
                this.logSuccess(`Docker configuration exists: ${path.basename(dockerFile)}`);
                dockerConfigScore++;
                healthScore++;
            }
        });

        if (dockerConfigScore === 0) {
            this.logError('No Docker configuration files found');
        }

        // Check 4: Test structure validation
        const testPaths = [
            path.join(__dirname, 'tests'),
            path.join(__dirname, 'backend', '__tests__'),
            path.join(__dirname, 'backend', 'tests')
        ];

        let testStructureFound = false;
        testPaths.forEach(testPath => {
            if (fs.existsSync(testPath)) {
                this.logSuccess(`Test structure exists: ${path.basename(testPath)}`);
                testStructureFound = true;
                healthScore++;
            }
        });

        if (!testStructureFound) {
            this.logWarning('No test structure found');
        }

        const maxHealthScore = configFiles.length + backendPaths.length + dockerFiles.length + 1; // +1 for test structure
        const healthCheckScore = Math.round((healthScore / maxHealthScore) * 100);

        this.results.healthChecks.push({
            category: 'Health Checks',
            score: healthCheckScore,
            status: healthCheckScore >= 80 ? 'PASS' : 'FAIL',
            details: `${healthScore}/${maxHealthScore} health checks passed`
        });

        return healthCheckScore >= 80;
    }

    // Generate comprehensive report
    generateReport() {
        const endTime = Date.now();
        const duration = Math.round((endTime - this.startTime) / 1000);

        this.log('📊 Generating Production Readiness Report...');

        const allResults = [
            ...this.results.environment,
            ...this.results.security,
            ...this.results.dependencies,
            ...this.results.performance,
            ...this.results.healthChecks
        ];

        const totalScore = allResults.reduce((sum, result) => sum + result.score, 0);
        const averageScore = Math.round(totalScore / allResults.length);
        const passedTests = allResults.filter(result => result.status === 'PASS').length;
        const totalTests = allResults.length;

        // Generate detailed report
        const reportPath = path.join(__dirname, 'logs', `production-readiness-report-${Date.now()}.md`);
        const reportContent = this.generateMarkdownReport(allResults, averageScore, passedTests, totalTests, duration);

        fs.writeFileSync(reportPath, reportContent);

        // Console summary
        console.log('\n' + '='.repeat(60));
        console.log('🎯 PRODUCTION READINESS VALIDATION SUMMARY');
        console.log('='.repeat(60));
        console.log(`📈 Overall Score: ${averageScore}%`);
        console.log(`✅ Tests Passed: ${passedTests}/${totalTests}`);
        console.log(`⏱️  Duration: ${duration}s`);
        console.log(`📄 Detailed Report: ${reportPath}`);
        console.log(`📋 Log File: ${this.logFile}`);

        if (this.results.errors.length > 0) {
            console.log(`\n❌ Errors (${this.results.errors.length}):`);
            this.results.errors.forEach(error => console.log(`  • ${error}`));
        }

        if (this.results.warnings.length > 0) {
            console.log(`\n⚠️  Warnings (${this.results.warnings.length}):`);
            this.results.warnings.forEach(warning => console.log(`  • ${warning}`));
        }

        console.log('\n' + '='.repeat(60));

        // Determine overall status
        if (averageScore >= 90) {
            console.log('🎉 PRODUCTION READY - System is ready for deployment!');
            return { status: 'READY', score: averageScore, reportPath };
        } else if (averageScore >= 75) {
            console.log('⚠️  CONDITIONALLY READY - Address warnings before deployment');
            return { status: 'CONDITIONAL', score: averageScore, reportPath };
        } else {
            console.log('❌ NOT READY - Critical issues must be resolved');
            return { status: 'NOT_READY', score: averageScore, reportPath };
        }
    }

    generateMarkdownReport(results, averageScore, passedTests, totalTests, duration) {
        const timestamp = new Date().toISOString();

        return `# Production Readiness Validation Report

**Generated:** ${timestamp}
**Duration:** ${duration} seconds
**Overall Score:** ${averageScore}%
**Tests Passed:** ${passedTests}/${totalTests}

## Executive Summary

${averageScore >= 90 ? '✅ **PRODUCTION READY** - System meets all production requirements' :
  averageScore >= 75 ? '⚠️ **CONDITIONALLY READY** - Minor issues to address' :
  '❌ **NOT READY** - Critical issues must be resolved'}

## Detailed Results

${results.map(result => `### ${result.category}
- **Score:** ${result.score}%
- **Status:** ${result.status}
- **Details:** ${result.details}
`).join('\n')}

## Error Summary

${this.results.errors.length === 0 ? 'No errors detected.' :
  this.results.errors.map(error => `- ❌ ${error}`).join('\n')}

## Warning Summary

${this.results.warnings.length === 0 ? 'No warnings.' :
  this.results.warnings.map(warning => `- ⚠️ ${warning}`).join('\n')}

## Recommendations

${averageScore < 90 ? `
### Immediate Actions Required:
${this.results.errors.map(error => `- Fix: ${error}`).join('\n')}

### Recommended Improvements:
${this.results.warnings.map(warning => `- Address: ${warning}`).join('\n')}
` : '✅ All systems are operating within acceptable parameters.'}

## System Information

- **Node.js Version:** ${process.version}
- **Platform:** ${process.platform}
- **Architecture:** ${process.arch}
- **Memory Usage:** ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB
- **Uptime:** ${Math.round(process.uptime())}s

---
*Report generated by Nen Platform Production Readiness Validator*
`;
    }

    // Main execution method
    async run() {
        try {
            this.log('🚀 Starting Production Readiness Validation...');

            // Load environment variables
            require('dotenv').config();

            // Run all validation checks
            const envValid = this.validateEnvironmentConfiguration();
            const securityValid = this.validateSecurityConfiguration();
            const depsValid = this.validateDependencies();
            const perfValid = await this.runPerformanceBenchmarks();
            const healthValid = await this.simulateHealthChecks();

            // Generate final report
            const result = this.generateReport();

            return result;
        } catch (error) {
            this.logError('Production validation failed', error);
            return { status: 'ERROR', score: 0, error: error.message };
        }
    }
}

// Execute if run directly
if (require.main === module) {
    const validator = new ProductionReadinessValidator();
    validator.run().then(result => {
        process.exit(result.status === 'READY' ? 0 : 1);
    }).catch(error => {
        console.error('❌ Validation failed:', error);
        process.exit(1);
    });
}

module.exports = ProductionReadinessValidator;

