/// <reference types="jest" />
/// <reference types="@testing-library/jest-dom" />

// Extend the global Jest namespace to include custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeDefined(): R;
      toBe(expected: any): R;
      toEqual(expected: any): R;
      toMatch(expected: string | RegExp): R;
      toHaveTextContent(text: string | RegExp): R;
      toHaveLength(length: number): R;
      toBeLessThanOrEqual(expected: number): R;
      toBeGreaterThanOrEqual(expected: number): R;
    }
  }
}

export {};
