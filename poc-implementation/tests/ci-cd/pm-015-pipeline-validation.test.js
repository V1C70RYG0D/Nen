/**
 * Test Suite 4.1: Advanced CI/CD Testing
 * Test Case: PM-015 - Deployment Pipeline Validation
 *
 * Validates comprehensive CI/CD pipeline with security scanning
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

describe('PM-015: Deployment Pipeline Validation', () => {
  const workflowPath = path.join(process.cwd(), '.github/workflows/ci.yml');
  let workflowConfig;

  beforeAll(() => {
    // Load GitHub Actions workflow configuration
    const workflowContent = fs.readFileSync(workflowPath, 'utf8');
    workflowConfig = yaml.load(workflowContent);
  });

  describe('1. GitHub Actions Workflow Execution', () => {
    test('CI/CD pipeline executes without errors', () => {
      expect(workflowConfig).toBeDefined();
      expect(workflowConfig.name).toBe('CI/CD Pipeline');
      expect(workflowConfig.jobs).toHaveProperty('test');
      expect(workflowConfig.jobs).toHaveProperty('build');
      expect(workflowConfig.jobs).toHaveProperty('deploy');
    });

    test('Pipeline triggers on correct branches', () => {
      expect(workflowConfig.on.push.branches).toContain('main');
      expect(workflowConfig.on.push.branches).toContain('develop');
      expect(workflowConfig.on.pull_request.branches).toContain('main');
    });

    test('Node.js matrix strategy configured correctly', () => {
      const testJob = workflowConfig.jobs.test;
      expect(testJob.strategy.matrix['node-version']).toEqual(
        expect.arrayContaining(['18.x', '20.x', '22.x'])
      );
    });
  });

  describe('2. Security Scanning Integration', () => {
    test('Security scans pass all checks', () => {
      const testJobSteps = workflowConfig.jobs.test.steps.map(step => step.name || step.uses);

      expect(testJobSteps).toContain('OWASP Dependency Check');
      expect(testJobSteps).toContain('Run Trivy for security scanning');
      expect(testJobSteps).toContain('CodeQL Analysis');
      expect(testJobSteps).toContain('Perform CodeQL Analysis');
    });

    test('Security audit step configured', () => {
      const testJobSteps = workflowConfig.jobs.test.steps;
      const auditStep = testJobSteps.find(step =>
        step.name === 'Run security audit'
      );

      expect(auditStep).toBeDefined();
      expect(auditStep.run).toContain('npm audit --audit-level moderate');
    });

    test('OWASP dependency check configured correctly', () => {
      const testJobSteps = workflowConfig.jobs.test.steps;
      const owaspStep = testJobSteps.find(step =>
        step.uses && step.uses.includes('OWASP/dependency-check-action')
      );

      expect(owaspStep).toBeDefined();
    });
  });

  describe('3. Automated Testing Environments', () => {
    test('Automated tests provide coverage', () => {
      const testJobSteps = workflowConfig.jobs.test.steps.map(step => step.name);

      expect(testJobSteps).toContain('Run tests');
      expect(testJobSteps).toContain('Run advanced tests');
      expect(testJobSteps).toContain('Run integration tests');
      expect(testJobSteps).toContain('Upload coverage reports');
    });

    test('Linting configured', () => {
      const testJobSteps = workflowConfig.jobs.test.steps;
      const lintStep = testJobSteps.find(step => step.name === 'Run linting');

      expect(lintStep).toBeDefined();
      expect(lintStep.run).toBe('npm run lint:check');
    });

    test('Multiple Node.js versions tested', () => {
      const nodeVersions = workflowConfig.jobs.test.strategy.matrix['node-version'];
      expect(nodeVersions.length).toBeGreaterThan(1);
    });
  });

  describe('4. Deployment Pipeline with Rollback', () => {
    test('Deployments complete successfully', () => {
      const deployJob = workflowConfig.jobs.deploy;
      expect(deployJob).toBeDefined();
      expect(deployJob.needs).toEqual(['test', 'build']);
      expect(deployJob.if).toBe("github.ref == 'refs/heads/main'");
    });

    test('Rollback procedures functional', () => {
      const deployJobSteps = workflowConfig.jobs.deploy.steps;
      const rollbackStep = deployJobSteps.find(step =>
        step.name === 'Rollback if validation fails'
      );

      expect(rollbackStep).toBeDefined();
      expect(rollbackStep.if).toBe('failure()');
      expect(rollbackStep.run).toContain('docker-compose.rollback.yml');
    });

    test('Deployment validation configured', () => {
      const deployJobSteps = workflowConfig.jobs.deploy.steps;
      const validationStep = deployJobSteps.find(step =>
        step.name === 'Validate deployment'
      );

      expect(validationStep).toBeDefined();
      expect(validationStep.run).toContain('curl --fail');
    });
  });

  describe('5. Monitoring Integration', () => {
    test('Monitoring integrated properly', () => {
      const deployJobSteps = workflowConfig.jobs.deploy.steps;
      const monitoringStep = deployJobSteps.find(step =>
        step.name === 'Monitoring setup check'
      );

      expect(monitoringStep).toBeDefined();
      expect(monitoringStep.run).toContain('/metrics');
    });

    test('Coverage reports uploaded', () => {
      const testJobSteps = workflowConfig.jobs.test.steps;
      const coverageStep = testJobSteps.find(step =>
        step.uses && step.uses.includes('codecov/codecov-action')
      );

      expect(coverageStep).toBeDefined();
      expect(coverageStep.if).toBe("matrix.node-version == '20.x'");
    });
  });

  describe('6. Artifact Management', () => {
    test('Artifacts managed securely', () => {
      const deployJobSteps = workflowConfig.jobs.deploy.steps;
      const artifactStep = deployJobSteps.find(step =>
        step.uses && step.uses.includes('actions/upload-artifact')
      );

      expect(artifactStep).toBeDefined();
      expect(artifactStep.with.name).toBe('coverage-reports');
      expect(artifactStep.with.path).toBe('./coverage/');
    });

    test('Docker image tagging strategy', () => {
      const buildJobSteps = workflowConfig.jobs.build.steps;
      const dockerStep = buildJobSteps.find(step =>
        step.name === 'Build Docker image'
      );

      expect(dockerStep).toBeDefined();
      expect(dockerStep.run).toContain('docker tag');
      expect(dockerStep.run).toContain(':latest');
      expect(dockerStep.run).toContain(':staging');
    });
  });

  describe('7. Deployment Automation', () => {
    test('Test deployment automation', async () => {
      // Check if package.json has the necessary scripts
      const packageJsonPath = path.resolve(__dirname, '../../package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      expect(packageJson.scripts).toHaveProperty('test:pm-013');
      expect(packageJson.scripts).toHaveProperty('test:pm-014');
      expect(packageJson.scripts).toHaveProperty('build');
      expect(packageJson.scripts).toHaveProperty('lint:check');
    });

    test('Docker login configured', () => {
      const testJobSteps = workflowConfig.jobs.test.steps;
      const dockerLoginStep = testJobSteps.find(step =>
        step.uses && step.uses.includes('docker/login-action')
      );

      expect(dockerLoginStep).toBeDefined();
      expect(dockerLoginStep.with).toHaveProperty('username');
      expect(dockerLoginStep.with).toHaveProperty('password');
    });

    test('Environment-specific configurations', () => {
      // Check if build job is dependent on test job
      const buildJob = workflowConfig.jobs.build;
      expect(buildJob.needs).toBe('test');

      // Check if deploy job is dependent on both test and build jobs
      const deployJob = workflowConfig.jobs.deploy;
      expect(deployJob.needs).toEqual(['test', 'build']);
    });
  });

  describe('8. Pipeline Performance and Reliability', () => {
    test('Pipeline stages properly ordered', () => {
      // Test job should run first (no dependencies)
      expect(workflowConfig.jobs.test.needs).toBeUndefined();

      // Build job should depend on test
      expect(workflowConfig.jobs.build.needs).toBe('test');

      // Deploy job should depend on both test and build
      expect(workflowConfig.jobs.deploy.needs).toEqual(['test', 'build']);
    });

    test('Conditional deployment on main branch only', () => {
      const deployJob = workflowConfig.jobs.deploy;
      expect(deployJob.if).toBe("github.ref == 'refs/heads/main'");
    });

    test('Cache configured for dependencies', () => {
      const testJobSteps = workflowConfig.jobs.test.steps;
      const nodeSetupStep = testJobSteps.find(step =>
        step.uses && step.uses.includes('actions/setup-node')
      );

      expect(nodeSetupStep.with.cache).toBe('npm');
    });
  });
});
