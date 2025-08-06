/**
 * Test Utilities for Comprehensive Testing
 */
export declare class TestDataGenerator {
    static generateValidBetAmounts(): number[];
    static generateInvalidBetAmounts(): number[];
    static generateWalletAddresses(count?: number): string[];
    static generateMatchIds(count?: number): string[];
    static generateAgentIds(): string[];
    static generateBetScenarios(): Array<{
        name: string;
        wallet: string;
        matchId: string;
        amount: number;
        agent: string;
        expectedSuccess: boolean;
    }>;
}
export declare class PerformanceTestUtils {
    static measureAsyncFunction<T>(fn: () => Promise<T>, iterations?: number): Promise<{
        results: T[];
        averageTime: number;
        minTime: number;
        maxTime: number;
        totalTime: number;
    }>;
    static createPerformanceThresholds(): {
        betPlacement: number;
        oddsCalculation: number;
        poolUpdate: number;
        databaseWrite: number;
        redisCache: number;
    };
}
export declare class ValidationTestUtils {
    static createValidationTestCases(): {
        walletValidation: ({
            input: string;
            valid: boolean;
            description: string;
        } | {
            input: null;
            valid: boolean;
            description: string;
        } | {
            input: undefined;
            valid: boolean;
            description: string;
        })[];
        amountValidation: {
            input: number;
            valid: boolean;
            description: string;
        }[];
        matchIdValidation: ({
            input: string;
            valid: boolean;
            description: string;
        } | {
            input: null;
            valid: boolean;
            description: string;
        } | {
            input: undefined;
            valid: boolean;
            description: string;
        })[];
    };
}
export declare class MockDataFactory {
    static createBettingPool(overrides?: any): any;
    static createBetData(overrides?: any): any;
    static createMatchData(overrides?: any): any;
    static createUserData(overrides?: any): any;
}
export declare class ErrorTestUtils {
    static createErrorScenarios(): {
        name: string;
        error: Error;
        expectedBehavior: string;
    }[];
    static expectAsyncError(fn: () => Promise<any>, expectedError: string | RegExp): Promise<void>;
}
export declare class ParameterizedTestHelpers {
    static createBetAmountTests(): {
        validAmounts: {
            describe: {
                (title: string, suite: (...args: ReadonlyArray<any>) => void, timeout?: number): any;
                skip: any;
                only: any;
            };
            fdescribe: any;
            fit: any;
            it: {
                (title: string, test: (...args: ReadonlyArray<any>) => void | Promise<unknown> | Generator<void, unknown, void> | undefined, timeout?: number): any;
                skip: any;
                only: any;
                concurrent: {
                    (title: string, test: (...args: ReadonlyArray<any>) => void | Promise<unknown> | Generator<void, unknown, void> | undefined, timeout?: number): any;
                    only: any;
                    skip: any;
                };
            };
            test: {
                (title: string, test: (...args: ReadonlyArray<any>) => void | Promise<unknown> | Generator<void, unknown, void> | undefined, timeout?: number): any;
                skip: any;
                only: any;
                concurrent: {
                    (title: string, test: (...args: ReadonlyArray<any>) => void | Promise<unknown> | Generator<void, unknown, void> | undefined, timeout?: number): any;
                    only: any;
                    skip: any;
                };
            };
            xdescribe: any;
            xit: any;
            xtest: any;
        };
        invalidAmounts: {
            describe: {
                (title: string, suite: (...args: ReadonlyArray<any>) => void, timeout?: number): any;
                skip: any;
                only: any;
            };
            fdescribe: any;
            fit: any;
            it: {
                (title: string, test: (...args: ReadonlyArray<any>) => void | Promise<unknown> | Generator<void, unknown, void> | undefined, timeout?: number): any;
                skip: any;
                only: any;
                concurrent: {
                    (title: string, test: (...args: ReadonlyArray<any>) => void | Promise<unknown> | Generator<void, unknown, void> | undefined, timeout?: number): any;
                    only: any;
                    skip: any;
                };
            };
            test: {
                (title: string, test: (...args: ReadonlyArray<any>) => void | Promise<unknown> | Generator<void, unknown, void> | undefined, timeout?: number): any;
                skip: any;
                only: any;
                concurrent: {
                    (title: string, test: (...args: ReadonlyArray<any>) => void | Promise<unknown> | Generator<void, unknown, void> | undefined, timeout?: number): any;
                    only: any;
                    skip: any;
                };
            };
            xdescribe: any;
            xit: any;
            xtest: any;
        };
        mixedAmounts: {
            describe: {
                (title: string, suite: (...args: ReadonlyArray<any>) => void, timeout?: number): any;
                skip: any;
                only: any;
            };
            fdescribe: any;
            fit: any;
            it: {
                (title: string, test: (...args: ReadonlyArray<any>) => void | Promise<unknown> | Generator<void, unknown, void> | undefined, timeout?: number): any;
                skip: any;
                only: any;
                concurrent: {
                    (title: string, test: (...args: ReadonlyArray<any>) => void | Promise<unknown> | Generator<void, unknown, void> | undefined, timeout?: number): any;
                    only: any;
                    skip: any;
                };
            };
            test: {
                (title: string, test: (...args: ReadonlyArray<any>) => void | Promise<unknown> | Generator<void, unknown, void> | undefined, timeout?: number): any;
                skip: any;
                only: any;
                concurrent: {
                    (title: string, test: (...args: ReadonlyArray<any>) => void | Promise<unknown> | Generator<void, unknown, void> | undefined, timeout?: number): any;
                    only: any;
                    skip: any;
                };
            };
            xdescribe: any;
            xit: any;
            xtest: any;
        };
    };
    static createConcurrencyTests(): {
        describe: {
            (title: string, suite: (...args: ReadonlyArray<any>) => void, timeout?: number): any;
            skip: any;
            only: any;
        };
        fdescribe: any;
        fit: any;
        it: {
            (title: string, test: (...args: ReadonlyArray<any>) => void | Promise<unknown> | Generator<void, unknown, void> | undefined, timeout?: number): any;
            skip: any;
            only: any;
            concurrent: {
                (title: string, test: (...args: ReadonlyArray<any>) => void | Promise<unknown> | Generator<void, unknown, void> | undefined, timeout?: number): any;
                only: any;
                skip: any;
            };
        };
        test: {
            (title: string, test: (...args: ReadonlyArray<any>) => void | Promise<unknown> | Generator<void, unknown, void> | undefined, timeout?: number): any;
            skip: any;
            only: any;
            concurrent: {
                (title: string, test: (...args: ReadonlyArray<any>) => void | Promise<unknown> | Generator<void, unknown, void> | undefined, timeout?: number): any;
                only: any;
                skip: any;
            };
        };
        xdescribe: any;
        xit: any;
        xtest: any;
    };
    static createOddsCalculationTests(): {
        describe: {
            (title: string, suite: (...args: ReadonlyArray<any>) => void, timeout?: number): any;
            skip: any;
            only: any;
        };
        fdescribe: any;
        fit: any;
        it: {
            (title: string, test: (...args: ReadonlyArray<any>) => void | Promise<unknown> | Generator<void, unknown, void> | undefined, timeout?: number): any;
            skip: any;
            only: any;
            concurrent: {
                (title: string, test: (...args: ReadonlyArray<any>) => void | Promise<unknown> | Generator<void, unknown, void> | undefined, timeout?: number): any;
                only: any;
                skip: any;
            };
        };
        test: {
            (title: string, test: (...args: ReadonlyArray<any>) => void | Promise<unknown> | Generator<void, unknown, void> | undefined, timeout?: number): any;
            skip: any;
            only: any;
            concurrent: {
                (title: string, test: (...args: ReadonlyArray<any>) => void | Promise<unknown> | Generator<void, unknown, void> | undefined, timeout?: number): any;
                only: any;
                skip: any;
            };
        };
        xdescribe: any;
        xit: any;
        xtest: any;
    };
}
export declare class TestEnvironmentUtils {
    static setupTestTimeout(timeout?: number): void;
    static createTestLogger(): {
        info: jest.Mock<any, any, any>;
        warn: jest.Mock<any, any, any>;
        error: jest.Mock<any, any, any>;
        debug: jest.Mock<any, any, any>;
    };
    static mockEnvironmentVariables(vars: Record<string, string>): void;
    static createCleanupHandler(): {
        addCleanup: (cleanup: () => Promise<void> | void) => void;
        cleanup: () => Promise<void>;
    };
}
//# sourceMappingURL=testUtils.d.ts.map