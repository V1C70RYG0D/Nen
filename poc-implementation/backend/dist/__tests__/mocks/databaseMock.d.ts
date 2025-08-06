/**
 * Mock Implementation for Database Connections
 */
interface MockQueryResult {
    rows: any[];
    rowCount: number;
}
export declare class MockDatabaseClient {
    private tables;
    constructor();
    query(text: string, params?: any[]): Promise<MockQueryResult>;
    private handleSelect;
    private handleInsert;
    private handleUpdate;
    private handleDelete;
    private createRecordFromParams;
    connect(): Promise<void>;
    end(): Promise<void>;
    addTestData(tableName: string, data: any[]): void;
    getTestData(tableName: string): any[];
    clearTestData(tableName?: string): void;
}
export declare const createMockDatabaseClient: () => MockDatabaseClient;
export {};
//# sourceMappingURL=databaseMock.d.ts.map