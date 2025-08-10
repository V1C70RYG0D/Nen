// KYC/AML compliance middleware
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { CacheService } from '../utils/redis';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        walletAddress: string;
        [key: string]: any;
      };
      kyc?: KYCUser;
      aml?: AMLCheck;
    }
  }
}

export interface KYCUser {
  id: string;
  walletAddress: string;
  kycStatus: 'pending' | 'verified' | 'rejected' | 'expired';
  kycLevel: 'basic' | 'enhanced' | 'institutional';
  riskScore: number; // 0-100
  country?: string;
  lastKycUpdate: Date;
}

export interface AMLCheck {
  isClean: boolean;
  riskScore: number;
  flags: string[];
  lastChecked: Date;
}

class KYCService {
  private cache: CacheService;

  constructor() {
    this.cache = new CacheService();
  }

  // Simulate KYC verification (in production, integrate with actual KYC provider)
  async verifyKYC(walletAddress: string): Promise<KYCUser> {
    // Check cache first
    const cacheKey = `kyc:${walletAddress}`;
    const cached = await this.cache.get<KYCUser>(cacheKey);

    if (cached) {
      return cached;
    }

    // Simulate KYC check based on wallet characteristics (POC implementation)
    const simulatedUser: KYCUser = {
      id: `kyc_${Date.now()}`,
      walletAddress,
      kycStatus: this.simulateKYCStatus(walletAddress),
      kycLevel: 'basic',
      riskScore: this.calculateRiskScore(walletAddress),
      lastKycUpdate: new Date(),
    };

    // Cache for 1 hour
    await this.cache.set(cacheKey, simulatedUser, 3600);

    return simulatedUser;
  }

  // Simulate AML screening
  async performAMLCheck(walletAddress: string, amount: number): Promise<AMLCheck> {
    const cacheKey = `aml:${walletAddress}`;
    const cached = await this.cache.get<AMLCheck>(cacheKey);

    if (cached && this.isRecentCheck(cached.lastChecked)) {
      return cached;
    }

    const flags: string[] = [];
    let riskScore = 0;

    // Check transaction amount patterns (high amounts = higher risk)
    if (amount > 100) {
      riskScore += 20;
      flags.push('high_value_transaction');
    }

    // Check wallet age and activity (new wallets = higher risk)
    const walletAge = this.estimateWalletAge(walletAddress);
    if (walletAge < 30) {
      riskScore += 15;
      flags.push('new_wallet');
    }

    // Check for sanctioned addresses (simulated for POC)
    if (this.isSanctionedAddress(walletAddress)) {
      riskScore = 100;
      flags.push('sanctioned_address');
    }

    const amlResult: AMLCheck = {
      isClean: riskScore < 50,
      riskScore,
      flags,
      lastChecked: new Date(),
    };

    // Cache for 15 minutes
    await this.cache.set(cacheKey, amlResult, 900);

    return amlResult;
  }

  private simulateKYCStatus(walletAddress: string): KYCUser['kycStatus'] {
    // Simple hash-based simulation for consistent results
    const hash = this.simpleHash(walletAddress);
    if (hash % 10 === 0) return 'rejected';
    if (hash % 20 === 1) return 'pending';
    return 'verified';
  }

  private calculateRiskScore(walletAddress: string): number {
    // Generate consistent risk score based on wallet address
    const hash = this.simpleHash(walletAddress);
    return hash % 100;
  }

  private estimateWalletAge(walletAddress: string): number {
    // Simulated wallet age estimation for POC
    const hash = this.simpleHash(walletAddress);
    return (hash % 365) + 1; // 1-365 days
  }

  private isSanctionedAddress(walletAddress: string): boolean {
    // Simulated sanctioned address check for POC
    const sanctionedPatterns = ['SANCT', 'BLOCK', 'BANNED'];
    return sanctionedPatterns.some(pattern =>
      walletAddress.toUpperCase().includes(pattern)
    );
  }

  private isRecentCheck(lastChecked: Date): boolean {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    return lastChecked > fifteenMinutesAgo;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

const kycService = new KYCService();

// KYC verification middleware
export const kycMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const walletAddress = req.user?.walletAddress || req.body?.walletAddress;

    if (!walletAddress) {
      res.status(400).json({
        error: 'Wallet address required for KYC verification',
        code: 'WALLET_ADDRESS_REQUIRED'
      });
      return;
    }

    // Perform KYC check
    const kycResult = await kycService.verifyKYC(walletAddress);

    if (kycResult.kycStatus !== 'verified') {
      logger.warn(`KYC verification failed for wallet: ${walletAddress}`, {
        status: kycResult.kycStatus,
        riskScore: kycResult.riskScore
      });

      res.status(403).json({
        error: 'KYC verification required',
        code: 'KYC_VERIFICATION_FAILED',
        status: kycResult.kycStatus,
        details: 'Please complete identity verification to access this feature'
      });
      return;
    }

    // Add KYC info to request for downstream use
    req.kyc = kycResult;
    next();
  } catch (error) {
    logger.error('KYC middleware error:', error);
    res.status(500).json({
      error: 'KYC verification service unavailable',
      code: 'KYC_SERVICE_ERROR'
    });
  }
};

// AML screening middleware for financial transactions
export const amlMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const walletAddress = req.user?.walletAddress || req.body?.walletAddress;
    const amount = parseFloat(req.body?.amount || req.body?.amountSol || '0');

    if (!walletAddress) {
      res.status(400).json({
        error: 'Wallet address required for AML screening',
        code: 'WALLET_ADDRESS_REQUIRED'
      });
      return;
    }

    // Perform AML check
    const amlResult = await kycService.performAMLCheck(walletAddress, amount);

    if (!amlResult.isClean) {
      logger.warn(`AML screening failed for wallet: ${walletAddress}`, {
        riskScore: amlResult.riskScore,
        flags: amlResult.flags,
        amount
      });

      res.status(403).json({
        error: 'Transaction blocked by AML screening',
        code: 'AML_SCREENING_FAILED',
        riskScore: amlResult.riskScore,
        flags: amlResult.flags,
        details: 'This transaction has been flagged for manual review'
      });
      return;
    }

    // Add AML info to request for downstream use
    req.aml = amlResult;
    next();
  } catch (error) {
    logger.error('AML middleware error:', error);
    res.status(500).json({
      error: 'AML screening service unavailable',
      code: 'AML_SERVICE_ERROR'
    });
  }
};

// Enhanced KYC middleware for high-value operations
export const enhancedKYCMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const walletAddress = req.user?.walletAddress || req.body?.walletAddress;

    if (!walletAddress) {
      res.status(400).json({
        error: 'Wallet address required for enhanced KYC verification',
        code: 'WALLET_ADDRESS_REQUIRED'
      });
      return;
    }

    const kycResult = await kycService.verifyKYC(walletAddress);

    // Enhanced KYC requires verified status and low risk score
    if (kycResult.kycStatus !== 'verified' || kycResult.riskScore > 25) {
      logger.warn(`Enhanced KYC verification failed for wallet: ${walletAddress}`, {
        status: kycResult.kycStatus,
        riskScore: kycResult.riskScore
      });

      res.status(403).json({
        error: 'Enhanced KYC verification required',
        code: 'ENHANCED_KYC_REQUIRED',
        status: kycResult.kycStatus,
        riskScore: kycResult.riskScore,
        details: 'This operation requires enhanced identity verification'
      });
      return;
    }

    req.kyc = kycResult;
    next();
  } catch (error) {
    logger.error('Enhanced KYC middleware error:', error);
    res.status(500).json({
      error: 'Enhanced KYC verification service unavailable',
      code: 'ENHANCED_KYC_SERVICE_ERROR'
    });
  }
};
