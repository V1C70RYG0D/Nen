# Report Templates

This directory contains standardized HTML, JSON, and PDF templates for test reporting across Jest, Playwright, and Cypress frameworks.

## Structure

```
templates/reports/
├── README.md                    # This documentation
├── common/                      # Shared components and styles
│   ├── styles/                 # CSS stylesheets
│   ├── components/             # Reusable template components
│   └── assets/                 # Images, logos, fonts
├── jest/                       # Jest test report templates
│   ├── html/                   # HTML report templates
│   ├── json/                   # JSON report schemas
│   └── pdf/                    # PDF report templates
├── playwright/                 # Playwright test report templates
│   ├── html/                   # HTML report templates
│   ├── json/                   # JSON report schemas
│   └── pdf/                    # PDF report templates
├── cypress/                    # Cypress test report templates
│   ├── html/                   # HTML report templates
│   ├── json/                   # JSON report schemas
│   └── pdf/                    # PDF report templates
└── utils/                      # Template utilities and generators
    ├── generators/             # Report generators
    ├── validators/             # Template validators
    └── converters/             # Format converters
```

## Template Types

### Jest Templates
- **Unit Test Reports**: Coverage, test results, performance metrics
- **Integration Test Reports**: API testing, service integration
- **Coverage Reports**: Line, branch, function, statement coverage

### Playwright Templates
- **E2E Test Reports**: User journey testing, cross-browser compatibility
- **Visual Regression Reports**: Screenshot comparisons, UI consistency
- **Performance Reports**: Page load times, resource usage

### Cypress Templates
- **Cross-Browser Reports**: Browser compatibility testing
- **Feature Testing Reports**: Feature-specific test results
- **Accessibility Reports**: WCAG compliance testing

## Features

- **Consistent Branding**: Nen Platform styling across all reports
- **Responsive Design**: Mobile-friendly report viewing
- **Interactive Elements**: Expandable sections, filtering, sorting
- **Export Capabilities**: PDF generation from HTML templates
- **Integration Ready**: Easy integration with CI/CD pipelines
- **Accessibility Compliant**: WCAG 2.1 AA standards
- **Zero Hardcoding**: All values externalized through environment variables

## Usage

Templates are automatically used by the testing frameworks when configured in their respective configuration files:

- `config/jest.config.js` - Jest reporter configuration
- `tests/integration/playwright.config.ts` - Playwright reporter configuration
- `cypress/config/*.config.js` - Cypress reporter configuration

## Environment Variables

All templates use environment variables for configuration:

```env
# Report Configuration
REPORT_TITLE="Nen Platform Test Report"
REPORT_LOGO_URL="${ASSETS_BASE_URL}/logo.png"
REPORT_OUTPUT_DIR="./test-reports"
REPORT_TIMESTAMP_FORMAT="YYYY-MM-DD HH:mm:ss"

# Branding
PLATFORM_NAME="Nen Platform"
PLATFORM_URL="${FRONTEND_URL}"
COMPANY_NAME="Nen Platform Team"

# Report Features
ENABLE_INTERACTIVE_FEATURES=true
ENABLE_PDF_EXPORT=true
ENABLE_CHART_VISUALIZATIONS=true
```

## Compliance

- **GI-18**: Zero hardcoded values - all configuration externalized
- **GI-22**: WCAG 2.1 AA accessibility compliance
- **GI-03**: Production-ready quality and scalability
- **GI-04**: Modular design with single responsibility
- **GI-05**: Enhanced UI/UX with professional styling
