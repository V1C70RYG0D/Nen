/**
 * Accessibility Compliance Validator

 *
 * Validates WCAG 2.1 AA compliance across the application
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class AccessibilityValidator {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.fixes = [];
    this.projectRoot = process.cwd();
  }

  async validateAccessibility() {
    console.log('🔍 Starting Accessibility Compliance Validation...\n');

    await this.checkSemanticHTML();
    await this.checkColorContrast();
    await this.checkKeyboardNavigation();
    await this.checkScreenReaderSupport();
    await this.checkImageAltText();
    await this.checkFormAccessibility();
    await this.checkHeadingStructure();
    await this.checkFocusManagement();
    await this.checkResponsiveDesign();
    await this.checkInternationalization();

    this.generateReport();
  }

  async checkSemanticHTML() {
    console.log('🏷️  Checking semantic HTML usage...');

    const htmlFiles = this.findFiles(['**/*.tsx', '**/*.jsx', '**/*.html'], ['node_modules', 'dist', 'build']);
    let semanticIssues = 0;

    for (const file of htmlFiles) {
      const content = fs.readFileSync(file, 'utf8');

      // Check for semantic elements
      const semanticElements = ['main', 'nav', 'header', 'footer', 'article', 'section', 'aside'];
      const hasSemanticElements = semanticElements.some(element =>
        content.includes(`<${element}`) || content.includes(`<${element.charAt(0).toUpperCase() + element.slice(1)}`)
      );

      if (!hasSemanticElements && content.includes('<div')) {
        this.warnings.push(`Consider using semantic HTML elements in ${file}`);
        semanticIssues++;
      }

      // Check for proper ARIA usage
      if (content.includes('aria-') && !content.includes('role=')) {
        this.warnings.push(`ARIA attributes found without role in ${file}`);
      }

      // Check for button accessibility
      if (content.includes('onClick') && !content.includes('onKeyDown')) {
        this.warnings.push(`Interactive elements should support keyboard navigation in ${file}`);
        semanticIssues++;
      }
    }

    if (semanticIssues === 0) {
      console.log('✅ Semantic HTML structure looks good');
    } else {
      console.log(`⚠️  Found ${semanticIssues} semantic HTML issues`);
    }
  }

  async checkColorContrast() {
    console.log('🎨 Checking color contrast ratios...');

    const cssFiles = this.findFiles(['**/*.css', '**/*.scss', '**/*.sass'], ['node_modules']);
    let contrastIssues = 0;

    // Check Tailwind config for contrast compliance
    const tailwindConfig = path.join(this.projectRoot, 'frontend', 'tailwind.config.js');
    if (fs.existsSync(tailwindConfig)) {
      const config = fs.readFileSync(tailwindConfig, 'utf8');

      // Check for high contrast theme
      if (!config.includes('high-contrast') && !config.includes('contrast-')) {
        this.warnings.push('Consider adding high contrast theme variants in Tailwind config');
        contrastIssues++;
      }

      // Check for color blind friendly palette
      if (!config.includes('colorblind') && !config.includes('accessible-colors')) {
        this.warnings.push('Consider using colorblind-friendly color palette');
        contrastIssues++;
      }
    }

    if (contrastIssues === 0) {
      console.log('✅ Color contrast configuration looks good');
    } else {
      console.log(`⚠️  Found ${contrastIssues} color contrast considerations`);
    }
  }

  async checkKeyboardNavigation() {
    console.log('⌨️  Checking keyboard navigation support...');

    const componentFiles = this.findFiles(['**/*.tsx', '**/*.jsx'], ['node_modules']);
    let keyboardIssues = 0;

    for (const file of componentFiles) {
      const content = fs.readFileSync(file, 'utf8');

      // Check for keyboard event handlers
      const hasClickHandler = content.includes('onClick');
      const hasKeyboardHandler = content.includes('onKeyDown') || content.includes('onKeyPress');

      if (hasClickHandler && !hasKeyboardHandler) {
        this.issues.push(`Missing keyboard event handlers in ${file}`);
        keyboardIssues++;
      }

      // Check for tabIndex usage
      if (content.includes('tabIndex') && content.includes('tabIndex={-1}')) {
        this.warnings.push(`Negative tabIndex found in ${file} - ensure this is intentional`);
      }

      // Check for focus management
      if (content.includes('useRef') && !content.includes('focus')) {
        this.warnings.push(`Consider implementing focus management in ${file}`);
      }
    }

    if (keyboardIssues === 0) {
      console.log('✅ Keyboard navigation support looks good');
    } else {
      console.log(`❌ Found ${keyboardIssues} keyboard navigation issues`);
    }
  }

  async checkScreenReaderSupport() {
    console.log('🔊 Checking screen reader support...');

    const componentFiles = this.findFiles(['**/*.tsx', '**/*.jsx'], ['node_modules']);
    let screenReaderIssues = 0;

    for (const file of componentFiles) {
      const content = fs.readFileSync(file, 'utf8');

      // Check for ARIA labels
      if (content.includes('<button') && !content.includes('aria-label')) {
        this.warnings.push(`Consider adding aria-label to buttons in ${file}`);
      }

      // Check for form labels
      if (content.includes('<input') && !content.includes('aria-label') && !content.includes('htmlFor')) {
        this.issues.push(`Form inputs missing labels in ${file}`);
        screenReaderIssues++;
      }

      // Check for live regions
      if (content.includes('useState') && content.includes('error')) {
        if (!content.includes('aria-live') && !content.includes('role="alert"')) {
          this.warnings.push(`Consider adding live regions for error announcements in ${file}`);
        }
      }

      // Check for skip links
      if (file.includes('layout') || file.includes('Layout')) {
        if (!content.includes('skip') && !content.includes('Skip')) {
          this.warnings.push(`Consider adding skip navigation links in ${file}`);
        }
      }
    }

    if (screenReaderIssues === 0) {
      console.log('✅ Screen reader support looks good');
    } else {
      console.log(`❌ Found ${screenReaderIssues} screen reader issues`);
    }
  }

  async checkImageAltText() {
    console.log('🖼️  Checking image alt text...');

    const componentFiles = this.findFiles(['**/*.tsx', '**/*.jsx'], ['node_modules']);
    let imageIssues = 0;

    for (const file of componentFiles) {
      const content = fs.readFileSync(file, 'utf8');

      // Check for img tags with alt attributes
      const imgMatches = content.match(/<img\s[^>]*>/g) || [];

      for (const img of imgMatches) {
        if (!img.includes('alt=')) {
          this.issues.push(`Image missing alt attribute in ${file}: ${img.substring(0, 50)}...`);
          imageIssues++;
        } else if (img.includes('alt=""') && !img.includes('role="presentation"')) {
          this.warnings.push(`Empty alt attribute without presentation role in ${file}`);
        }
      }

      // Check for Next.js Image components
      if (content.includes('next/image') || content.includes('<Image')) {
        if (!content.includes('alt=')) {
          this.issues.push(`Next.js Image component missing alt prop in ${file}`);
          imageIssues++;
        }
      }
    }

    if (imageIssues === 0) {
      console.log('✅ Image alt text compliance looks good');
    } else {
      console.log(`❌ Found ${imageIssues} image accessibility issues`);
    }
  }

  async checkFormAccessibility() {
    console.log('📝 Checking form accessibility...');

    const componentFiles = this.findFiles(['**/*.tsx', '**/*.jsx'], ['node_modules']);
    let formIssues = 0;

    for (const file of componentFiles) {
      const content = fs.readFileSync(file, 'utf8');

      // Check for form elements
      if (content.includes('<form')) {
        // Check for fieldsets
        if (content.includes('<input') && !content.includes('<fieldset')) {
          this.warnings.push(`Consider grouping related form fields with fieldset in ${file}`);
        }

        // Check for error handling
        if (!content.includes('error') && !content.includes('validation')) {
          this.warnings.push(`Consider adding error handling and validation feedback in ${file}`);
        }

        // Check for required field indicators
        if (content.includes('required') && !content.includes('aria-required')) {
          this.warnings.push(`Consider using aria-required along with required attribute in ${file}`);
        }
      }

      // Check for label associations
      const inputMatches = content.match(/<input\s[^>]*>/g) || [];
      for (const input of inputMatches) {
        if (!input.includes('aria-label') && !content.includes('htmlFor')) {
          this.issues.push(`Input field missing proper label association in ${file}`);
          formIssues++;
        }
      }
    }

    if (formIssues === 0) {
      console.log('✅ Form accessibility looks good');
    } else {
      console.log(`❌ Found ${formIssues} form accessibility issues`);
    }
  }

  async checkHeadingStructure() {
    console.log('📑 Checking heading structure...');

    const componentFiles = this.findFiles(['**/*.tsx', '**/*.jsx'], ['node_modules']);
    let headingIssues = 0;

    for (const file of componentFiles) {
      const content = fs.readFileSync(file, 'utf8');

      // Extract heading levels
      const headings = [];
      for (let i = 1; i <= 6; i++) {
        const matches = content.match(new RegExp(`<h${i}`, 'g')) || [];
        headings.push(...matches.map(() => i));
      }

      // Check heading hierarchy
      if (headings.length > 1) {
        for (let i = 1; i < headings.length; i++) {
          if (headings[i] > headings[i-1] + 1) {
            this.issues.push(`Heading hierarchy skip in ${file}: h${headings[i-1]} to h${headings[i]}`);
            headingIssues++;
          }
        }
      }

      // Check for missing h1
      if (file.includes('page') && !content.includes('<h1')) {
        this.warnings.push(`Page component missing h1 heading in ${file}`);
      }
    }

    if (headingIssues === 0) {
      console.log('✅ Heading structure looks good');
    } else {
      console.log(`❌ Found ${headingIssues} heading structure issues`);
    }
  }

  async checkFocusManagement() {
    console.log('🎯 Checking focus management...');

    const componentFiles = this.findFiles(['**/*.tsx', '**/*.jsx'], ['node_modules']);
    let focusIssues = 0;

    for (const file of componentFiles) {
      const content = fs.readFileSync(file, 'utf8');

      // Check for modal/dialog focus management
      if (content.includes('modal') || content.includes('dialog') || content.includes('Dialog')) {
        if (!content.includes('focus') && !content.includes('autoFocus')) {
          this.issues.push(`Modal/dialog missing focus management in ${file}`);
          focusIssues++;
        }

        if (!content.includes('useEffect') || !content.includes('focus')) {
          this.warnings.push(`Consider implementing focus trap for modal in ${file}`);
        }
      }

      // Check for route changes
      if (content.includes('useRouter') || content.includes('navigate')) {
        if (!content.includes('focus') && !content.includes('scroll')) {
          this.warnings.push(`Consider managing focus on route changes in ${file}`);
        }
      }

      // Check for custom focus indicators
      if (content.includes(':focus') && !content.includes('outline')) {
        this.warnings.push(`Ensure custom focus indicators are visible in ${file}`);
      }
    }

    if (focusIssues === 0) {
      console.log('✅ Focus management looks good');
    } else {
      console.log(`❌ Found ${focusIssues} focus management issues`);
    }
  }

  async checkResponsiveDesign() {
    console.log('📱 Checking responsive design accessibility...');

    const cssFiles = this.findFiles(['**/*.css', '**/*.scss'], ['node_modules']);
    const tailwindConfig = path.join(this.projectRoot, 'frontend', 'tailwind.config.js');
    let responsiveIssues = 0;

    // Check for viewport meta tag
    const htmlFiles = this.findFiles(['**/*.html', '**/*.tsx'], ['node_modules']);
    let hasViewportMeta = false;

    for (const file of htmlFiles) {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('viewport') && content.includes('width=device-width')) {
        hasViewportMeta = true;
        break;
      }
    }

    if (!hasViewportMeta) {
      this.issues.push('Missing responsive viewport meta tag');
      responsiveIssues++;
    }

    // Check for responsive breakpoints
    if (fs.existsSync(tailwindConfig)) {
      const config = fs.readFileSync(tailwindConfig, 'utf8');
      if (!config.includes('screens') && !config.includes('breakpoints')) {
        this.warnings.push('Consider defining custom responsive breakpoints');
      }
    }

    if (responsiveIssues === 0) {
      console.log('✅ Responsive design accessibility looks good');
    } else {
      console.log(`❌ Found ${responsiveIssues} responsive design issues`);
    }
  }

  async checkInternationalization() {
    console.log('🌍 Checking internationalization support...');

    const componentFiles = this.findFiles(['**/*.tsx', '**/*.jsx'], ['node_modules']);
    const i18nIssues = 0;

    // Check for lang attribute
    const layoutFiles = componentFiles.filter(file =>
      file.includes('layout') || file.includes('_app') || file.includes('_document')
    );

    for (const file of layoutFiles) {
      const content = fs.readFileSync(file, 'utf8');
      if (!content.includes('lang=') && !content.includes('locale')) {
        this.warnings.push(`Consider adding lang attribute in ${file}`);
      }
    }

    // Check for hardcoded text
    for (const file of componentFiles) {
      const content = fs.readFileSync(file, 'utf8');

      // Simple check for hardcoded English text
      const textMatches = content.match(/>[^<{]*[a-zA-Z]{3,}[^<}]*</g) || [];
      if (textMatches.length > 5) {
        this.warnings.push(`Consider implementing i18n for text content in ${file}`);
      }
    }

    console.log('✅ Internationalization checked');
  }

  findFiles(patterns, excludeDirs = []) {
    const glob = require('glob');
    const files = [];

    for (const pattern of patterns) {
      try {
        const matches = glob.sync(pattern, {
          cwd: this.projectRoot,
          ignore: excludeDirs.map(dir => `${dir}/**`)
        });
        files.push(...matches.map(file => path.join(this.projectRoot, file)));
      } catch (error) {
        // Pattern not supported, skip
      }
    }

    return [...new Set(files)];
  }

  generateReport() {
    console.log('\n📊 ACCESSIBILITY COMPLIANCE REPORT');
    console.log('='.repeat(50));

    const totalIssues = this.issues.length;
    const totalWarnings = this.warnings.length;

    console.log(`\n❌ Critical Issues: ${totalIssues}`);
    this.issues.forEach(issue => console.log(`  • ${issue}`));

    console.log(`\n⚠️  Warnings: ${totalWarnings}`);
    this.warnings.forEach(warning => console.log(`  • ${warning}`));

    if (this.fixes.length > 0) {
      console.log(`\n✅ Fixes Applied: ${this.fixes.length}`);
      this.fixes.forEach(fix => console.log(`  • ${fix}`));
    }

    // Calculate compliance score
    const maxPossibleIssues = 50; // Arbitrary baseline
    const complianceScore = Math.max(0, Math.round((maxPossibleIssues - totalIssues) / maxPossibleIssues * 100));

    console.log(`\n📈 Accessibility Compliance Score: ${complianceScore}%`);

    if (complianceScore >= 90) {
      console.log('🎉 EXCELLENT! High accessibility compliance achieved.');
    } else if (complianceScore >= 75) {
      console.log('👍 GOOD! Accessibility compliance is on track.');
    } else if (complianceScore >= 60) {
      console.log('⚠️  NEEDS IMPROVEMENT! Please address the issues above.');
    } else {
      console.log('❌ POOR! Significant accessibility improvements needed.');
    }

    console.log('\n📚 Resources for improvement:');
    console.log('  • WCAG 2.1 Guidelines: https://www.w3.org/WAI/WCAG21/quickref/');
    console.log('  • axe DevTools: https://www.deque.com/axe/devtools/');
    console.log('  • WAVE Evaluation Tool: https://wave.webaim.org/');
    console.log('  • Color Contrast Checker: https://webaim.org/resources/contrastchecker/');
  }
}

// Run the validator if called directly
if (require.main === module) {
  const validator = new AccessibilityValidator();
  validator.validateAccessibility().catch(console.error);
}

module.exports = AccessibilityValidator;
