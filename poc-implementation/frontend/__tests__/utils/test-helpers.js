// test-helpers.js

export function renderWithProviders(ui, { ...renderOptions } = {}) {
  function Wrapper({ children }) {
    return (
      <MockWalletContextProvider>
        {children}
      </MockWalletContextProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

export const accessibilityMatchers = {
  toBeKeyboardAccessible(element) {
    const tabIndex = element.getAttribute('tabindex');
    if (tabIndex && parseInt(tabIndex) > 0) {
      return {
        message: () => `Expected no positive tabindex but found ${tabIndex}`,
        pass: false,
      };
    }
    return {
      message: () => "Element is keyboard accessible",
      pass: true,
    };
  },
};

expect.extend(accessibilityMatchers);

