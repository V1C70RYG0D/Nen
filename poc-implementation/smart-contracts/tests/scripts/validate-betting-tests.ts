/**
 * Betting System Test Validation Script

 */

import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";

const execAsync = promisify(exec);

interface ValidationResult {
    testName: string;
    status: "PASS" | "FAIL" | "SKIP";
    duration: number;
    errors?: string[];
    warnings?: string[];
}

class BettingTestValidator {
    public results: ValidationResult[] = [];
    private startTime: number = 0;

    constructor() {
        this.startTime = Date.now();
    }

    /**
     * Validate test file exists and is properly structured
     */
    async validateTestFile(): Promise<ValidationResult> {
        const testName = "Test File Structure Validation";
        const startTime = Date.now();

        try {
            const testFilePath = path.join(process.cwd(), "tests", "unit", "betting-system.test.ts");

            // Check if file exists
            await fs.access(testFilePath);

            // Read and validate content
            const content = await fs.readFile(testFilePath, "utf-8");

            const errors: string[] = [];
            const warnings: string[] = [];

            // Check for required imports
            if (!content.includes("import { expect } from \"chai\"")) {
                errors.push("Missing Chai expect import");
            }

            if (!content.includes("import * as anchor from \"@coral-xyz/anchor\"")) {
                errors.push("Missing Anchor framework import");
            }

            // Check for required test suites
            const requiredSuites = [
                "Valid Bet Placement Tests",
                "Pool Management Tests",
                "Invalid Bet Rejection Tests",
                "Multiple Bets Per User Tests",
                "Security and Edge Cases",
                "Performance and Load Testing"
            ];

            for (const suite of requiredSuites) {
                if (!content.includes(suite)) {
                    errors.push(`Missing test suite: ${suite}`);
                }
            }




            }

            // Check test structure
            if (!content.includes("describe(") || !content.includes("it(")) {
                errors.push("Invalid test structure - missing describe/it blocks");
            }

            return {
                testName,
                status: errors.length === 0 ? "PASS" : "FAIL",
                duration: Date.now() - startTime,
                errors: errors.length > 0 ? errors : undefined,
                warnings: warnings.length > 0 ? warnings : undefined
            };

        } catch (error) {
            return {
                testName,
                status: "FAIL",
                duration: Date.now() - startTime,
                errors: [`Test file validation failed: ${(error as Error).message}`]
            };
        }
    }

    /**
     * Validate test dependencies
     */
    async validateDependencies(): Promise<ValidationResult> {
        const testName = "Dependencies Validation";
        const startTime = Date.now();

        try {
            const packageJsonPath = path.join(process.cwd(), "package.json");
            const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf-8"));

            const errors: string[] = [];
            const warnings: string[] = [];

            const requiredDeps = [
                "@coral-xyz/anchor",
                "@solana/web3.js",
                "chai",
                "mocha",
                "typescript"
            ];

            const allDeps = {
                ...packageJson.dependencies,
                ...packageJson.devDependencies
            };

            for (const dep of requiredDeps) {
                if (!allDeps[dep]) {
                    errors.push(`Missing required dependency: ${dep}`);
                }
            }

            // Check Node.js version
            const nodeVersion = process.version;
            if (!nodeVersion.startsWith("v18") && !nodeVersion.startsWith("v20")) {
                warnings.push(`Node.js version ${nodeVersion} may not be optimal. Recommended: v18 or v20`);
            }

            return {
                testName,
                status: errors.length === 0 ? "PASS" : "FAIL",
                duration: Date.now() - startTime,
                errors: errors.length > 0 ? errors : undefined,
                warnings: warnings.length > 0 ? warnings : undefined
            };

        } catch (error) {
            return {
                testName,
                status: "FAIL",
                duration: Date.now() - startTime,
                errors: [`Dependencies validation failed: ${(error as Error).message}`]
            };
        }
    }

    /**
     * Validate test configuration
     */
    async validateConfiguration(): Promise<ValidationResult> {
        const testName = "Configuration Validation";
        const startTime = Date.now();

        try {
            const configPath = path.join(process.cwd(), "tests", "config", "betting-test-config.ts");

            await fs.access(configPath);
            const configContent = await fs.readFile(configPath, "utf-8");

            const errors: string[] = [];
            const warnings: string[] = [];

            // Check for required configuration sections
            const requiredSections = [
                "betAmounts",
                "performance",
                "security",
                "dataGeneration",
                "errorHandling"
            ];

            for (const section of requiredSections) {
                if (!configContent.includes(section)) {
                    errors.push(`Missing configuration section: ${section}`);
                }
            }

            // Check for environment variable usage (GI #18)
            if (!configContent.includes("process.env")) {
                warnings.push("Configuration should use environment variables for externalization");
            }

            return {
                testName,
                status: errors.length === 0 ? "PASS" : "FAIL",
                duration: Date.now() - startTime,
                errors: errors.length > 0 ? errors : undefined,
                warnings: warnings.length > 0 ? warnings : undefined
            };

        } catch (error) {
            return {
                testName,
                status: "FAIL",
                duration: Date.now() - startTime,
                errors: [`Configuration validation failed: ${(error as Error).message}`]
            };
        }
    }

    /**
     * Validate TypeScript compilation
     */
    async validateCompilation(): Promise<ValidationResult> {
        const testName = "TypeScript Compilation";
        const startTime = Date.now();

        try {
            const { stdout, stderr } = await execAsync("npx tsc --noEmit", {
                timeout: 30000
            });

            const errors: string[] = [];
            const warnings: string[] = [];

            if (stderr && stderr.trim()) {
                // Parse TypeScript errors
                const lines = stderr.split("\n").filter(line => line.trim());
                for (const line of lines) {
                    if (line.includes("error TS")) {
                        errors.push(line.trim());
                    } else if (line.includes("warning") || line.includes("deprecated")) {
                        warnings.push(line.trim());
                    }
                }
            }

            return {
                testName,
                status: errors.length === 0 ? "PASS" : "FAIL",
                duration: Date.now() - startTime,
                errors: errors.length > 0 ? errors : undefined,
                warnings: warnings.length > 0 ? warnings : undefined
            };

        } catch (error) {
            return {
                testName,
                status: "FAIL",
                duration: Date.now() - startTime,
                errors: [`TypeScript compilation failed: ${(error as Error).message}`]
            };
        }
    }

    /**
     * Validate test syntax without execution
     */
    async validateTestSyntax(): Promise<ValidationResult> {
        const testName = "Test Syntax Validation";
        const startTime = Date.now();

        try {
            // Try to parse the test file without executing
            const { stdout, stderr } = await execAsync("npx mocha tests/unit/betting-system.test.ts --dry-run", {
                timeout: 15000
            });

            const errors: string[] = [];
            const warnings: string[] = [];

            if (stderr && stderr.includes("Error")) {
                errors.push("Test syntax validation failed");
                stderr.split("\n").forEach(line => {
                    if (line.includes("Error") || line.includes("SyntaxError")) {
                        errors.push(line.trim());
                    }
                });
            }

            return {
                testName,
                status: errors.length === 0 ? "PASS" : "FAIL",
                duration: Date.now() - startTime,
                errors: errors.length > 0 ? errors : undefined,
                warnings: warnings.length > 0 ? warnings : undefined
            };

        } catch (error) {
            // Dry-run might not be supported, try alternative approach
            try {
                const testFilePath = path.join(process.cwd(), "tests", "unit", "betting-system.test.ts");
                const content = await fs.readFile(testFilePath, "utf-8");

                // Basic syntax checks
                const errors: string[] = [];

                // Check for balanced brackets
                const openBraces = (content.match(/{/g) || []).length;
                const closeBraces = (content.match(/}/g) || []).length;
                if (openBraces !== closeBraces) {
                    errors.push("Unbalanced braces in test file");
                }

                // Check for balanced parentheses in describe/it blocks
                const describeMatches = content.match(/describe\s*\(/g) || [];
                const itMatches = content.match(/it\s*\(/g) || [];

                if (describeMatches.length === 0) {
                    errors.push("No describe blocks found");
                }

                if (itMatches.length === 0) {
                    errors.push("No it blocks found");
                }

                return {
                    testName,
                    status: errors.length === 0 ? "PASS" : "FAIL",
                    duration: Date.now() - startTime,
                    errors: errors.length > 0 ? errors : undefined
                };

            } catch (parseError) {
                return {
                    testName,
                    status: "FAIL",
                    duration: Date.now() - startTime,
                    errors: [`Syntax validation failed: ${(parseError as Error).message}`]
                };
            }
        }
    }

    /**
     * Run all validations
     */
    async runAllValidations(): Promise<void> {
        console.log("🔍 Starting Betting System Test Validation...\n");

        const validations = [
            this.validateTestFile(),
            this.validateDependencies(),
            this.validateConfiguration(),
            this.validateCompilation(),
            this.validateTestSyntax()
        ];

        this.results = await Promise.all(validations);
    }

    /**
     * Generate validation report
     */
    generateReport(): void {
        const totalDuration = Date.now() - this.startTime;
        const passedTests = this.results.filter(r => r.status === "PASS").length;
        const failedTests = this.results.filter(r => r.status === "FAIL").length;
        const skippedTests = this.results.filter(r => r.status === "SKIP").length;

        console.log("📊 Betting System Test Validation Report");
        console.log("==========================================\n");

        // Overall summary
        console.log(`📈 Summary:`);
        console.log(`   Total Validations: ${this.results.length}`);
        console.log(`   Passed: ${passedTests}`);
        console.log(`   Failed: ${failedTests}`);
        console.log(`   Skipped: ${skippedTests}`);
        console.log(`   Total Duration: ${totalDuration}ms\n`);

        // Detailed results
        console.log("📋 Detailed Results:");
        console.log("-".repeat(60));

        for (const result of this.results) {
            const statusIcon = result.status === "PASS" ? "✅" : result.status === "FAIL" ? "❌" : "⏭️";
            const duration = `${result.duration}ms`;

            console.log(`${statusIcon} ${result.testName} (${duration})`);

            if (result.errors && result.errors.length > 0) {
                console.log("   Errors:");
                result.errors.forEach(error => console.log(`     • ${error}`));
            }

            if (result.warnings && result.warnings.length > 0) {
                console.log("   Warnings:");
                result.warnings.forEach(warning => console.log(`     ⚠️ ${warning}`));
            }

            console.log();
        }

        // Final assessment
        if (failedTests === 0) {
            console.log("🎉 All validations passed! The betting system tests are ready to run.");
        } else {
            console.log(`❌ ${failedTests} validation(s) failed. Please fix the issues before running tests.`);
        }

        console.log("\n🚀 Next Steps:");
        if (failedTests === 0) {
            console.log("   • Run the full test suite: npm test tests/unit/betting-system.test.ts");
            console.log("   • Or use the provided scripts:");
            console.log("     - ./tests/scripts/run-betting-tests.sh all");
            console.log("     - ./tests/scripts/run-betting-tests.bat all");
        } else {
            console.log("   • Fix the validation errors listed above");
            console.log("   • Re-run this validation script");
            console.log("   • Ensure all dependencies are installed: npm install");
        }
    }
}

// Main execution
async function main() {
    const validator = new BettingTestValidator();

    try {
        await validator.runAllValidations();
        validator.generateReport();

        // Exit with appropriate code
        const hasFailures = validator.results.some(r => r.status === "FAIL");
        process.exit(hasFailures ? 1 : 0);

    } catch (error) {
        console.error("❌ Validation process failed:", error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

export { BettingTestValidator };
