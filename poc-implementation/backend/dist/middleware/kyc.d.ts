import { Request, Response, NextFunction } from 'express';
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
    riskScore: number;
    country?: string;
    lastKycUpdate: Date;
}
export interface AMLCheck {
    isClean: boolean;
    riskScore: number;
    flags: string[];
    lastChecked: Date;
}
export declare const kycMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const amlMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const enhancedKYCMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=kyc.d.ts.map