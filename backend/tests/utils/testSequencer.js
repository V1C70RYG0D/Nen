/**
 * Custom Test Sequencer for Nen Platform Backend
 * Optimizes test execution order for better performance and reliability
 */

const Sequencer = require('@jest/test-sequencer').default;

class TestSequencer extends Sequencer {
  sort(tests) {
    // Sort tests by priority and dependencies
    const testPriority = {
      // Setup tests first
      'setup': 1,
      'globalSetup': 1,

      // Unit tests
      'unit': 2,
      'utils': 2,
      'services': 2,

      // Integration tests
      'integration': 3,
      'websocket': 3,
      'database': 3,

      // End-to-end tests last
      'e2e': 4,
      'performance': 4,
      'load': 4
    };

    return tests.sort((testA, testB) => {
      const priorityA = this.getTestPriority(testA.path, testPriority);
      const priorityB = this.getTestPriority(testB.path, testPriority);

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // Secondary sort by file name for consistent ordering
      return testA.path.localeCompare(testB.path);
    });
  }

  getTestPriority(testPath, priorities) {
    // Extract test type from path
    for (const [type, priority] of Object.entries(priorities)) {
      if (testPath.includes(type)) {
        return priority;
      }
    }

    // Default priority for unmatched tests
    return 3;
  }
}

module.exports = TestSequencer;
