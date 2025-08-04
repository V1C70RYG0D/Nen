// Browser compatibility utilities for wallet integration
export interface BrowserCapabilities {
  hasWebExtensions: boolean;
  hasLocalStorage: boolean;
  hasWebCrypto: boolean;
  supportsWalletStandard: boolean;
  userAgent: string;
  isFirefox: boolean;
  isChrome: boolean;
  isSafari: boolean;
  isEdge: boolean;
  version: string;
}

export interface WalletCompatibility {
  phantom: boolean;
  solflare: boolean;
  coinbase: boolean;
  ledger: boolean;
  torus: boolean;
}

/**
 * Detects browser capabilities for wallet integration
 */
export const detectBrowserCapabilities = (): BrowserCapabilities => {
  const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : '';

  return {
    hasWebExtensions: typeof window !== 'undefined' && 'chrome' in window,
    hasLocalStorage: typeof window !== 'undefined' && 'localStorage' in window,
    hasWebCrypto: typeof window !== 'undefined' && 'crypto' in window && 'subtle' in window.crypto,
    supportsWalletStandard: typeof window !== 'undefined' && 'solana' in window,
    userAgent,
    isFirefox: userAgent.includes('Firefox'),
    isChrome: userAgent.includes('Chrome') && !userAgent.includes('Edge'),
    isSafari: userAgent.includes('Safari') && !userAgent.includes('Chrome'),
    isEdge: userAgent.includes('Edge'),
    version: extractBrowserVersion(userAgent)
  };
};

/**
 * Checks which wallets are compatible with current browser
 */
export const checkWalletCompatibility = (): WalletCompatibility => {
  const capabilities = detectBrowserCapabilities();

  return {
    phantom: capabilities.hasWebExtensions || capabilities.supportsWalletStandard,
    solflare: capabilities.hasWebExtensions || capabilities.supportsWalletStandard,
    coinbase: capabilities.hasWebCrypto && capabilities.hasLocalStorage,
    ledger: capabilities.hasWebCrypto && !capabilities.isSafari, // Safari has WebUSB limitations
    torus: capabilities.hasWebCrypto && capabilities.hasLocalStorage
  };
};

/**
 * Provides fallback recommendations for unsupported browsers
 */
export const getFallbackRecommendations = (): {
  message: string;
  actions: Array<{ title: string; description: string; url?: string }>;
} => {
  const capabilities = detectBrowserCapabilities();
  const compatibility = checkWalletCompatibility();

  if (!capabilities.hasWebExtensions && !capabilities.supportsWalletStandard) {
    return {
      message: "Your browser doesn't support wallet extensions.",
      actions: [
        {
          title: "Install Chrome or Firefox",
          description: "Use a browser that supports wallet extensions",
          url: "https://www.google.com/chrome/"
        },
        {
          title: "Use Mobile App",
          description: "Download our mobile app for wallet integration"
        },
        {
          title: "Continue Without Wallet",
          description: "Browse content without blockchain features"
        }
      ]
    };
  }

  if (!Object.values(compatibility).some(Boolean)) {
    return {
      message: "No compatible wallets detected.",
      actions: [
        {
          title: "Install Phantom",
          description: "Most popular Solana wallet",
          url: "https://phantom.app/"
        },
        {
          title: "Install Solflare",
          description: "Feature-rich Solana wallet",
          url: "https://solflare.com/"
        },
        {
          title: "Continue Without Wallet",
          description: "Browse content without blockchain features"
        }
      ]
    };
  }

  return {
    message: "Some wallet features may be limited.",
    actions: [
      {
        title: "Enable Browser Extensions",
        description: "Make sure extensions are enabled in your browser settings"
      },
      {
        title: "Update Browser",
        description: "Ensure you're using the latest browser version"
      }
    ]
  };
};

/**
 * Extracts browser version from user agent
 */
const extractBrowserVersion = (userAgent: string): string => {
  const patterns = [
    /Firefox\/(\d+\.\d+)/,
    /Chrome\/(\d+\.\d+)/,
    /Safari\/(\d+\.\d+)/,
    /Edge\/(\d+\.\d+)/
  ];

  for (const pattern of patterns) {
    const match = userAgent.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return 'unknown';
};

/**
 * Checks if current environment supports wallet features
 */
export const isWalletSupported = (): boolean => {
  const compatibility = checkWalletCompatibility();
  return Object.values(compatibility).some(Boolean);
};

/**
 * Gets minimum browser requirements
 */
export const getMinimumRequirements = () => {
  return {
    chrome: '88+',
    firefox: '88+',
    safari: '14+',
    edge: '88+'
  };
};
