export { MultisigVaultService } from './MultisigVaultService';
export { TransactionProposalService } from './TransactionProposalService';
export declare function initializeServices(): Promise<void>;
export declare function getServiceStatus(): {
    database: boolean;
    redis: boolean;
    aiService: boolean;
};
export declare function healthCheck(): Promise<{
    healthy: boolean;
    services: {
        database: boolean;
        redis: boolean;
        aiService: boolean;
    };
    timestamp: string;
}>;
//# sourceMappingURL=index.d.ts.map