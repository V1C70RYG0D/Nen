export declare const testUtilities: {
    createMockUser: (userId: string) => {
        id: string;
        email: string;
        wallet_address: string;
        created_at: Date;
        total_winnings: string;
    };
    createMockTransaction: (userId: string, amount: number) => {
        id: string;
        user_id: string;
        amount: string;
        createdAt: Date;
        status: string;
    };
    wait: (ms: number) => Promise<unknown>;
};
//# sourceMappingURL=final-gap-closure.test.d.ts.map