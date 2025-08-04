# Nen Smart Contract Testing Framework

## Overview



## 🏗️ Architecture

```
smart-contracts/
├── tests/
│   ├── config/           # Test environment configuration
│   ├── utils/            # Testing utilities and helpers
│   ├── fixtures/         # Test data and mock objects
│   ├── unit/            # Unit tests for individual functions
│   └── integration/     # End-to-end integration tests
├── scripts/             # Automation and deployment scripts
├── test-artifacts/      # Generated reports and coverage data
└── target/             # Compiled programs and IDL files
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn
- Rust and Cargo
- Solana CLI tools
- Anchor Framework v0.31.0+

### Installation

1. **Clone and setup dependencies:**
   ```bash
   cd smart-contracts
   npm install
   ```

2. **Configure test environment:**
   ```bash
   node scripts/setup-test-environment.js
   ```

3. **Validate deployment:**
   ```bash
   node scripts/validate-deployment.js
   ```

4. **Run comprehensive tests:**
   ```bash
   node scripts/comprehensive-test-runner.js
   ```

## 📋 Test Categories

### Unit Tests
- **Platform Initialization**: Core platform setup and configuration
- **User Management**: Account creation, validation, and permissions
- **Betting Logic**: Odds calculation, bet placement, and settlement
- **Security Controls**: Access control, input validation, and edge cases

### Integration Tests
- **Complete Workflows**: End-to-end user journeys
- **Cross-Program Interactions**: Multi-program transaction flows
- **State Consistency**: Data integrity across operations
- **Performance Benchmarks**: Transaction throughput and latency

### Security Tests
- **Access Control**: Unauthorized access prevention
- **Input Validation**: Malformed data handling
- **Economic Attacks**: MEV protection and sandwich attack resistance
- **Reentrancy Protection**: State manipulation prevention

## 🔧 Configuration

### Environment Variables

```bash
# Network Configuration
TEST_NETWORK=localnet                    # localnet, devnet, testnet
SOLANA_RPC_URL=http://localhost:8899    # Custom RPC endpoint

# Program IDs
NEN_CORE_PROGRAM_ID=your_program_id_here
NEN_MAGICBLOCK_PROGRAM_ID=your_program_id_here

# Test Configuration
TEST_TIMEOUT=30000                      # Test timeout in milliseconds
PARALLEL_TESTS=true                     # Enable parallel test execution
COVERAGE_ENABLED=true                   # Generate coverage reports
```

### Test Network Setup

The framework supports three test environments:

- **Localnet**: Local Solana validator for rapid development
- **Devnet**: Solana's developer network for shared testing
- **Testnet**: Pre-production testing environment

## 📊 Test Utilities

### Core Classes

#### `TestEnvironmentSetup`
Manages test environment configuration, network connections, and program loading.

```typescript
const testEnv = new TestEnvironmentSetup();
await testEnv.initialize();
const program = testEnv.getProgram('nenCore');
```

#### `TransactionHelper`
Simplifies transaction creation, signing, and execution with comprehensive error handling.

```typescript
const txHelper = new TransactionHelper(provider);
const result = await txHelper.executeTransaction(transaction, signers);
```

#### `AccountValidator`
Validates account states, data structures, and business logic constraints.

```typescript
const validator = new AccountValidator();
const isValid = await validator.validateUserAccount(userAccount);
```

#### `PerformanceProfiler`
Measures and reports transaction performance, throughput, and resource usage.

```typescript
const profiler = new PerformanceProfiler();
const metrics = await profiler.profileTransaction(transaction);
```

#### `SecurityTester`
Automated security testing for common vulnerabilities and attack vectors.

```typescript
const securityTester = new SecurityTester();
await securityTester.testAccessControl(program, unauthorizedUser);
```

### Mock Data Generators

#### `PlatformMockData`
Generates realistic platform configurations and admin accounts.

#### `UserMockData`
Creates diverse user profiles with varying bet histories and preferences.

#### `MatchMockData`
Generates sports matches with realistic odds, markets, and outcomes.

#### `AgentMockData`
Creates AI agent configurations with different strategies and parameters.

## 🎯 Running Tests

### Individual Test Suites

```bash
# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run security tests only
npm run test:security

# Run performance benchmarks
npm run test:performance
```

### Comprehensive Testing

```bash
# Run all tests with coverage
npm run test:comprehensive

# Run tests in CI mode
npm run test:ci

# Run tests with custom network
TEST_NETWORK=devnet npm run test
```

### Test Options

```bash
# Verbose output
npm run test -- --verbose

# Specific test pattern
npm run test -- --grep "platform initialization"

# Parallel execution
npm run test -- --parallel

# Generate coverage report
npm run test -- --coverage
```

## 📈 Reporting and Artifacts

### Generated Reports

The framework generates comprehensive reports in `test-artifacts/`:

- **Coverage Report**: `coverage/lcov-report/index.html`
- **Performance Metrics**: `performance-report.json`
- **Security Analysis**: `security-report.json`
- **Test Results**: `test-results.json`
- **Deployment Validation**: `deployment-validation.json`

### CI/CD Integration

The framework integrates with popular CI/CD platforms:

#### GitHub Actions
```yaml
- name: Run Smart Contract Tests
  run: |
    cd smart-contracts
    node scripts/comprehensive-test-runner.js

- name: Upload Test Artifacts
  uses: actions/upload-artifact@v3
  with:
    name: test-reports
    path: smart-contracts/test-artifacts/
```

#### Custom CI
```bash
# CI-optimized test execution
node scripts/comprehensive-test-runner.js --ci --coverage --artifacts
```

## 🔍 Troubleshooting

### Common Issues

#### "Program not found" Error
```bash
# Ensure programs are built and deployed
anchor build
anchor deploy --provider.cluster localnet
```

#### Network Connection Issues
```bash
# Check Solana cluster status
solana cluster-version
solana ping
```

#### Test Timeout Issues
```bash
# Increase timeout in environment
export TEST_TIMEOUT=60000
```

### Debug Mode

Enable verbose logging for detailed debugging:

```bash
DEBUG=true npm run test
```

### Validation Scripts

Run validation scripts to diagnose issues:

```bash
# Validate deployment
node scripts/validate-deployment.js

# Check environment setup
node scripts/setup-test-environment.js --validate
```

## 🛠️ Development Workflow

### Adding New Tests

1. **Create test file** in appropriate directory (`unit/` or `integration/`)
2. **Import test utilities** and mock data generators
3. **Follow naming convention**: `feature-name.test.ts`
4. **Add test to CI suite** in `comprehensive-test-runner.js`

### Test Structure Template

```typescript
import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';
import { TestEnvironmentSetup } from '../config/test-setup';

describe('Feature Name', () => {
    let testEnv: TestEnvironmentSetup;

    before(async () => {
        testEnv = new TestEnvironmentSetup();
        await testEnv.initialize();
    });

    after(async () => {
        await testEnv.cleanup();
    });

    it('should test specific functionality', async () => {
        // Test implementation
        expect(result).to.be.true;
    });
});
```

### Mock Data Usage

```typescript
import { UserMockData, MatchMockData } from '../utils/mock-data';

const userMock = new UserMockData();
const testUser = userMock.generateUser('premium');

const matchMock = new MatchMockData();
const testMatch = matchMock.generateMatch('football');
```

## 📚 API Reference

### Test Environment Configuration

#### Network Settings
- `localnet`: Local Solana validator
- `devnet`: Solana development network
- `testnet`: Solana test network

#### Program Configuration
- Automatic IDL loading
- Program account validation
- Cross-program interaction setup

### Utility Functions

#### Transaction Management
- Transaction building and signing
- Error handling and retry logic
- Performance monitoring

#### Account Operations
- Account creation and initialization
- State validation and verification
- Data serialization/deserialization

#### Security Testing
- Access control verification
- Input validation testing
- Economic attack simulation

## 🔐 Security Considerations

### Test Data Security
- Mock data contains no real private keys
- All test accounts are automatically generated
- Network isolation for testing environments

### Program Security
- Comprehensive access control testing
- Input validation and sanitization
- Economic attack vector analysis

### CI/CD Security
- Secure artifact storage
- Environment variable protection
- Audit trail maintenance

## 🤝 Contributing

### Code Standards
- TypeScript with strict type checking
- Comprehensive test coverage (>90%)
- Security-first development approach
- Performance optimization focus

### Pull Request Process
1. Add tests for new functionality
2. Ensure all existing tests pass
3. Update documentation as needed


### Issue Reporting
- Use provided issue templates
- Include test environment details
- Provide reproduction steps
- Include relevant logs and artifacts

## 📝 License

This testing framework is part of the Nen Protocol and follows the project's license terms.

## 🆘 Support

For testing framework support:
- Review troubleshooting section
- Check generated artifacts for error details
- Run validation scripts for environment issues
- Consult the comprehensive reports for debugging information

---


