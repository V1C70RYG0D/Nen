// types/jest.d.ts
import 'jest-axe';
import '@testing-library/jest-dom';

declare global {
  namespace jest {
    interface Matchers<R> {
      // Jest-axe matchers
      toHaveNoViolations(): R;

      // Testing Library matchers
      toBeInTheDocument(): R;
      toHaveClass(className: string): R;
      toHaveValue(value: any): R;
      toHaveLength(length: number): R;
      toHaveTextContent(text: string): R;
      toHaveAttribute(attr: string, value?: string): R;
      toHaveFocus(): R;
      toBeVisible(): R;
      toBeHidden(): R;

      // Jest mock matchers
      toHaveBeenCalled(): R;
      toHaveBeenCalledWith(...args: any[]): R;
      toHaveBeenCalledTimes(times: number): R;
      toHaveBeenLastCalledWith(...args: any[]): R;

      // Jest core matchers
      toMatchObject(object: any): R;
      toContainElement(element: any): R;
      toBeGreaterThan(value: number): R;
      toBeGreaterThanOrEqual(value: number): R;
      toBeLessThan(value: number): R;
      toBeLessThanOrEqual(value: number): R;
      toBeNull(): R;
      toBeUndefined(): R;
      toBeDefined(): R;
      toBeTruthy(): R;
      toBeFalsy(): R;
      toThrow(error?: string | RegExp | Error): R;
      toEqual(value: any): R;
      toBe(value: any): R;
      toContain(item: any): R;
      toMatch(regexp: RegExp | string): R;
      toStrictEqual(value: any): R;
      toBeInstanceOf(constructor: any): R;
      toBeCloseTo(value: number, precision?: number): R;

      // Promise matchers
      resolves: {
        toBeUndefined(): R;
        toThrow(error?: string | RegExp | Error): R;
        toBe(value: any): R;
        toEqual(value: any): R;
      };
      rejects: {
        toThrow(error?: string | RegExp | Error): R;
        toBe(value: any): R;
        toEqual(value: any): R;
      };
    }

    interface Expect {
      extend(matchers: any): void;
      objectContaining(object: any): any;
      arrayContaining(array: any[]): any;
      stringContaining(string: string): any;
      stringMatching(regexp: RegExp | string): any;
      any(constructor: any): any;
    }
  }
}
