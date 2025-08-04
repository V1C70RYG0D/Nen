// config/auth-config.js
// Production-grade authentication configuration for Nen Platform

const crypto = require('crypto');

/**
 * Authentication Configuration
 * Real OAuth2/JWT providers for production deployment
 */
const authConfig = {
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex'),
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    algorithm: 'HS256',
    issuer: process.env.JWT_ISSUER || 'nen-platform',
    audience: process.env.JWT_AUDIENCE || 'nen-users'
  },

  // OAuth2 Providers Configuration
  oauth: {
    // Google OAuth2
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI || `${process.env.FRONTEND_URL}/auth/google/callback`,
      scope: ['openid', 'profile', 'email'],
      enabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    },

    // Discord OAuth2 (for gaming community)
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      redirectUri: process.env.DISCORD_REDIRECT_URI || `${process.env.FRONTEND_URL}/auth/discord/callback`,
      scope: ['identify', 'email'],
      enabled: !!(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET)
    },

    // GitHub OAuth2 (for developers)
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      redirectUri: process.env.GITHUB_REDIRECT_URI || `${process.env.FRONTEND_URL}/auth/github/callback`,
      scope: ['user:email'],
      enabled: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET)
    }
  },

  // Web3 Wallet Authentication
  web3: {
    // Solana wallet integration
    solana: {
      networks: {
        mainnet: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
        devnet: process.env.SOLANA_RPC_DEVNET || 'https://api.devnet.solana.com',
        testnet: process.env.SOLANA_RPC_TESTNET || 'https://api.testnet.solana.com'
      },
      currentNetwork: process.env.SOLANA_NETWORK || 'devnet',
      messagePrefix: 'Nen Platform Authentication',
      signatureTimeout: 300000, // 5 minutes
      nonceExpiry: 600000 // 10 minutes
    },

    // Support for other wallets
    ethereum: {
      enabled: !!process.env.ETHEREUM_RPC_URL,
      rpcUrl: process.env.ETHEREUM_RPC_URL,
      chainId: parseInt(process.env.ETHEREUM_CHAIN_ID) || 1
    }
  },

  // Session Configuration
  session: {
    secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
    name: 'nen.sid',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
    },
    store: {
      type: 'redis',
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      prefix: 'nen:sess:',
      ttl: 86400 // 24 hours
    }
  },

  // Rate Limiting for Auth Endpoints
  rateLimiting: {
    login: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 attempts per window
      message: 'Too many login attempts, please try again later'
    },
    registration: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 3, // 3 registrations per hour per IP
      message: 'Too many registration attempts, please try again later'
    },
    passwordReset: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 3, // 3 password reset attempts per hour
      message: 'Too many password reset attempts, please try again later'
    }
  },

  // Password Security (for traditional auth if implemented)
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSymbols: true,
    bcryptRounds: 12
  },

  // Two-Factor Authentication
  twoFactor: {
    enabled: process.env.ENABLE_2FA === 'true',
    issuer: 'Nen Platform',
    window: 2, // Allow 2 time steps before/after current
    digits: 6,
    period: 30
  },

  // Email Verification
  emailVerification: {
    enabled: process.env.ENABLE_EMAIL_VERIFICATION === 'true',
    tokenExpiry: 24 * 60 * 60 * 1000, // 24 hours
    resendDelay: 5 * 60 * 1000, // 5 minutes between resends
    maxAttempts: 3
  },

  // Account Security
  security: {
    maxLoginAttempts: 5,
    lockoutTime: 30 * 60 * 1000, // 30 minutes
    passwordResetExpiry: 60 * 60 * 1000, // 1 hour
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
    requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION === 'true',
    enableAuditLog: true
  },

  // CORS Configuration for Auth
  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }
};

/**
 * Validation function to ensure all required auth environment variables are set
 */
function validateAuthConfig() {
  const required = [
    'JWT_SECRET',
    'SESSION_SECRET'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.warn(`⚠️  Missing required auth environment variables: ${missing.join(', ')}`);
    console.warn('🔧 Generating temporary secrets for development (NOT suitable for production)');
  }

  // Validate OAuth providers
  const oauthProviders = Object.keys(authConfig.oauth).filter(provider =>
    authConfig.oauth[provider].enabled
  );

  if (oauthProviders.length === 0) {
    console.warn('⚠️  No OAuth providers configured. Users will only be able to authenticate with Solana wallets.');
  } else {
    console.log(`✅ OAuth providers enabled: ${oauthProviders.join(', ')}`);
  }

  // Validate Web3 configuration
  if (!process.env.SOLANA_RPC_URL) {
    console.warn('⚠️  SOLANA_RPC_URL not configured, using default devnet');
  }

  return {
    isValid: missing.length === 0,
    missingVariables: missing,
    enabledProviders: oauthProviders
  };
}

/**
 * Generate authentication URLs for OAuth providers
 */
function generateAuthUrls(baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000') {
  const urls = {};

  Object.keys(authConfig.oauth).forEach(provider => {
    if (authConfig.oauth[provider].enabled) {
      const config = authConfig.oauth[provider];
      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        scope: config.scope.join(' '),
        response_type: 'code',
        state: crypto.randomBytes(16).toString('hex')
      });

      const authUrls = {
        google: `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
        discord: `https://discord.com/api/oauth2/authorize?${params}`,
        github: `https://github.com/login/oauth/authorize?${params}`
      };

      urls[provider] = authUrls[provider];
    }
  });

  return urls;
}

module.exports = {
  authConfig,
  validateAuthConfig,
  generateAuthUrls
};
