const { checkGICompliance, showGIStatus, config } = require('../main.js');

describe('Main Entry Point', () => {
  test('should have valid configuration', () => {
    expect(config).toBeDefined();
    expect(config.colors).toBeDefined();
    expect(config.paths).toBeDefined();
    expect(config.project).toBeDefined();
  });

  test('should check GI compliance', () => {
    const compliance = checkGICompliance();
    expect(typeof compliance).toBe('boolean');
  });

  test('should show GI status', () => {
    const status = showGIStatus();
    expect(typeof status).toBe('boolean');
  });
});
