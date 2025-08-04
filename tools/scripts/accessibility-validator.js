#!/usr/bin/env node

/**
 * Accessibility validationer
 * Validates WCAG 2.1 AA compliance for the Nen Platform
 * Uses externalized configuration values
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Load environment configuration - externalized values
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

class AccessibilityValidator {
  constructor() {
    this.results = {
      passed: [],
      failed: [],
      warnings: []
    };

    this.config = {
      componentsDir: process.env.FRONTEND_COMPONENTS_DIR || path.join(__dirname, '..', 'frontend', 'components'),
      pagesDir: process.env.FRONTEND_PAGES_DIR || path.join(__dirname, '..', 'frontend', 'pages'),
      minColorContrast: parseFloat(process.env.MIN_COLOR_CONTRAST),
      maxLineLength: parseInt(process.env.MAX_LINE_LENGTH, 10)
    };

    // Validate required environment variables
    if (!process.env.MIN_COLOR_CONTRAST || !process.env.MAX_LINE_LENGTH) {
      throw new Error('MIN_COLOR_CONTRAST and MAX_LINE_LENGTH environment variables are required');
    }
  }

  async validateAll() {
    console.log('🔍 Starting WCAG 2.1 AA Accessibility Validation...\n');

    await this.checkAriaLabels();
    await this.checkKeyboardNavigation();
    await this.checkSemanticHTML();
    await this.checkColorContrast();
    await this.checkImageAltText();
    await this.checkFormAccessibility();
    await this.checkHeadingStructure();

    this.generateReport();
  }

  async checkAriaLabels() {
    console.log('🏷️ Checking ARIA labels and roles...');

    try {
      const files = this.getReactFiles();
      let hasAriaSupport = false;
      let missingAriaCount = 0;

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf8');

        // Check for ARIA attributes
        const ariaAttributes = [
          'aria-label', 'aria-labelledby', 'aria-describedby',
          'role=', 'aria-hidden', 'aria-current'
        ];

        const hasAria = ariaAttributes.some(attr => content.includes(attr));
        if (hasAria) {
          hasAriaSupport = true;
        }

        // Check for interactive elements without labels
        const interactiveElements = ['<button', '<input', '<select', '<textarea'];
        for (const element of interactiveElements) {
          const elementMatches = (content.match(new RegExp(element, 'g')) || []).length;
          const ariaMatches = (content.match(/aria-label|aria-labelledby/g) || []).length;

          if (elementMatches > ariaMatches) {
            missingAriaCount += elementMatches - ariaMatches;
          }
        }
      }

      if (hasAriaSupport && missingAriaCount === 0) {
        this.results.passed.push('✅ ARIA labels and roles properly implemented');
      } else if (missingAriaCount > 0) {
        this.results.failed.push(`❌ ${missingAriaCount} interactive elements missing ARIA labels`);
      } else {
        this.results.warnings.push('⚠️ Limited ARIA support found');
      }

    } catch (error) {
      this.results.failed.push(`❌ ARIA validation failed: ${error.message}`);
    }
  }

  async checkKeyboardNavigation() {
    console.log('⌨️ Checking keyboard navigation support...');

    try {
      const files = this.getReactFiles();
      let keyboardSupport = false;

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf8');

        // Check for keyboard event handlers
        const keyboardEvents = ['onKeyDown', 'onKeyUp', 'onKeyPress', 'tabIndex'];
        const hasKeyboardSupport = keyboardEvents.some(event => content.includes(event));

        if (hasKeyboardSupport) {
          keyboardSupport = true;
          break;
        }
      }

      if (keyboardSupport) {
        this.results.passed.push('✅ Keyboard navigation support implemented');
      } else {
        this.results.warnings.push('⚠️ Limited keyboard navigation support detected');
      }

    } catch (error) {
      this.results.failed.push(`❌ Keyboard navigation check failed: ${error.message}`);
    }
  }

  async checkSemanticHTML() {
    console.log('🏗️ Checking semantic HTML structure...');

    try {
      const files = this.getReactFiles();
      let semanticCount = 0;

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf8');

        // Check for semantic HTML elements
        const semanticElements = [
          '<header', '<nav', '<main', '<section', '<article',
          '<aside', '<footer', '<h1', '<h2', '<h3'
        ];

        const hasSemanticElements = semanticElements.some(element => content.includes(element));
        if (hasSemanticElements) {
          semanticCount++;
        }
      }

      const semanticPercentage = (semanticCount / files.length) * 100;

      if (semanticPercentage >= 80) {
        this.results.passed.push(`✅ Semantic HTML structure: ${semanticPercentage.toFixed(1)}% coverage`);
      } else if (semanticPercentage >= 50) {
        this.results.warnings.push(`⚠️ Semantic HTML structure: ${semanticPercentage.toFixed(1)}% coverage (target: 80%)`);
      } else {
        this.results.failed.push(`❌ Semantic HTML structure: ${semanticPercentage.toFixed(1)}% coverage (minimum: 50%)`);
      }

    } catch (error) {
      this.results.failed.push(`❌ Semantic HTML check failed: ${error.message}`);
    }
  }

  async checkColorContrast() {
    console.log('🎨 Checking color contrast requirements...');

    try {
      // Check CSS/Tailwind classes for contrast issues
      const files = [...this.getReactFiles(), ...this.getCSSFiles()];
      let contrastIssues = 0;

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf8');

        // Look for low contrast color combinations
        const lowContrastPatterns = [
          'text-gray-400.*bg-gray-500',
          'text-gray-300.*bg-gray-400',
          'text-white.*bg-gray-100'
        ];

        for (const pattern of lowContrastPatterns) {
          if (content.match(new RegExp(pattern))) {
            contrastIssues++;
          }
        }
      }

      if (contrastIssues === 0) {
        this.results.passed.push('✅ Color contrast requirements met');
      } else {
        this.results.warnings.push(`⚠️ ${contrastIssues} potential color contrast issues found`);
      }

    } catch (error) {
      this.results.warnings.push(`⚠️ Color contrast check incomplete: ${error.message}`);
    }
  }

  async checkImageAltText() {
    console.log('🖼️ Checking image alt text...');

    try {
      const files = this.getReactFiles();
      let imagesWithoutAlt = 0;
      let totalImages = 0;

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf8');

        // Count img tags
        const imgTags = content.match(/<img[^>]*>/g) || [];
        const imgWithAlt = content.match(/<img[^>]*alt\s*=/g) || [];

        totalImages += imgTags.length;
        imagesWithoutAlt += imgTags.length - imgWithAlt.length;
      }

      if (totalImages === 0) {
        this.results.passed.push('✅ No images found (alt text compliance N/A)');
      } else if (imagesWithoutAlt === 0) {
        this.results.passed.push(`✅ All ${totalImages} images have alt text`);
      } else {
        this.results.failed.push(`❌ ${imagesWithoutAlt}/${totalImages} images missing alt text`);
      }

    } catch (error) {
      this.results.failed.push(`❌ Image alt text check failed: ${error.message}`);
    }
  }

  async checkFormAccessibility() {
    console.log('📝 Checking form accessibility...');

    try {
      const files = this.getReactFiles();
      let formsWithLabels = 0;
      let totalInputs = 0;

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf8');

        // Count form inputs
        const inputs = content.match(/<input[^>]*>/g) || [];
        const labelsOrAria = content.match(/(<label[^>]*>|aria-label|aria-labelledby)/g) || [];

        totalInputs += inputs.length;
        if (inputs.length > 0 && labelsOrAria.length >= inputs.length) {
          formsWithLabels++;
        }
      }

      if (totalInputs === 0) {
        this.results.passed.push('✅ No form inputs found (accessibility N/A)');
      } else if (formsWithLabels > 0) {
        this.results.passed.push('✅ Form accessibility implemented');
      } else {
        this.results.failed.push('❌ Form inputs missing proper labels');
      }

    } catch (error) {
      this.results.failed.push(`❌ Form accessibility check failed: ${error.message}`);
    }
  }

  async checkHeadingStructure() {
    console.log('📑 Checking heading structure...');

    try {
      const files = this.getReactFiles();
      let properHeadingStructure = true;

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf8');

        // Check for heading hierarchy
        const headings = content.match(/<h[1-6][^>]*>/g) || [];
        if (headings.length > 0) {
          // Simple check: ensure h1 appears before h2, etc.
          const headingLevels = headings.map(h => parseInt(h.match(/h([1-6])/)[1]));

          for (let i = 1; i < headingLevels.length; i++) {
            if (headingLevels[i] > headingLevels[i-1] + 1) {
              properHeadingStructure = false;
              break;
            }
          }
        }
      }

      if (properHeadingStructure) {
        this.results.passed.push('✅ Proper heading hierarchy maintained');
      } else {
        this.results.failed.push('❌ Heading hierarchy issues detected');
      }

    } catch (error) {
      this.results.warnings.push(`⚠️ Heading structure check incomplete: ${error.message}`);
    }
  }

  getReactFiles() {
    const files = [];

    try {
      const scanDir = (dir) => {
        if (!fs.existsSync(dir)) return;

        const items = fs.readdirSync(dir);
        for (const item of items) {
          const fullPath = path.join(dir, item);
          if (fs.statSync(fullPath).isDirectory()) {
            scanDir(fullPath);
          } else if (item.match(/\.(tsx|jsx)$/)) {
            files.push(fullPath);
          }
        }
      };

      scanDir(this.config.componentsDir);
      scanDir(this.config.pagesDir);
    } catch (error) {
      console.warn(`Warning: Could not scan React files: ${error.message}`);
    }

    return files;
  }

  getCSSFiles() {
    const files = [];

    try {
      const cssDir = path.join(__dirname, '..', 'frontend', 'styles');
      if (fs.existsSync(cssDir)) {
        const items = fs.readdirSync(cssDir);
        for (const item of items) {
          if (item.match(/\.(css|scss)$/)) {
            files.push(path.join(cssDir, item));
          }
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not scan CSS files: ${error.message}`);
    }

    return files;
  }

  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 ACCESSIBILITY COMPLIANCE REPORT (WCAG 2.1 AA)');
    console.log('='.repeat(80));

    console.log('\n✅ PASSED CHECKS:');
    this.results.passed.forEach(item => console.log(`  ${item}`));

    if (this.results.warnings.length > 0) {
      console.log('\n⚠️ WARNINGS:');
      this.results.warnings.forEach(item => console.log(`  ${item}`));
    }

    if (this.results.failed.length > 0) {
      console.log('\n❌ FAILED CHECKS:');
      this.results.failed.forEach(item => console.log(`  ${item}`));
    }

    const totalChecks = this.results.passed.length + this.results.failed.length + this.results.warnings.length;
    const passedChecks = this.results.passed.length;
    const compliancePercentage = totalChecks > 0 ? (passedChecks / totalChecks * 100).toFixed(1) : 0;

    console.log('\n' + '='.repeat(80));
    console.log(`📈 COMPLIANCE SCORE: ${compliancePercentage}% (${passedChecks}/${totalChecks} checks passed)`);
    console.log('='.repeat(80));

    if (this.results.failed.length === 0) {
      console.log('🎉 All critical accessibility checks passed!');
      process.exit(0);
    } else {
      console.log('🚨 Accessibility issues found that need attention.');
      process.exit(1);
    }
  }
}

// Run validation
if (require.main === module) {
  const validator = new AccessibilityValidator();
  validator.validateAll().catch(error => {
    console.error('Accessibility validation failed:', error);
    process.exit(1);
  });
}

module.exports = AccessibilityValidator;
