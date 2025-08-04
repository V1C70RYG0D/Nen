import { BettingService } from '../../backend/src/services/EnhancedBettingService';
import { KYCProvider } from '../../backend/src/services/kyc';
import { AMLChecker } from '../../backend/src/services/aml';

// Define mock user data
const mockUser = (id: string, kycStatus: string) => ({ id, kycStatus });
const bettingService = new BettingService();
const kycProvider = new KYCProvider();
const amlChecker = new AMLChecker();

// Test suite for enhanced betting compliance

describe('Enhanced Betting Compliance Tests', () => {

    it('should enforce KYC before allowing betting', async () => {
        const user = mockUser('user-1', 'pending');

        const result = await bettingService.placeBet({
            userId: user.id,
            amount: 100,
            matchId: 'match-1'
        });

        expect(result.success).toBeFalsy();
        expect(result.error).toContain('KYC required');
    });

    it('should enforce AML screening on high-value bets', async () => {
        const user = mockUser('user-2', 'verified');

        const transaction = {
            userId: user.id,
            amount: 10000, // High-value transaction
            matchId: 'match-1'
        };

        const amlResult = await amlChecker.checkTransaction(transaction);
        expect(amlResult.flagged).toBeTruthy();
        expect(amlResult.reason).toBeDefined();
    });

    it('should handle multi-signature escrow securely', async () => {
        const bet = {
            userId: 'user-verified',
            amount: 500,
            matchId: 'match-active'
        };

        const escrowResult = await bettingService.createEscrow(bet);
        expect(escrowResult.escrowAddress).toBeDefined();
        expect(escrowResult.signatures.length).toBeGreaterThan(1);
    });
});
