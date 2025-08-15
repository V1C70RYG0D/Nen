/**
 * Mock Implementation for Database Connections
 */

interface MockQueryResult {
  rows: any[];
  rowCount: number;
}

export class MockDatabaseClient {
  private tables: Map<string, any[]> = new Map();

  constructor() {
    // Initialize common tables for testing
    this.tables.set('users', []);
    this.tables.set('matches', []);
    this.tables.set('games', []);
    this.tables.set('ai_agents', []);
  }

  async query(text: string, params?: any[]): Promise<MockQueryResult> {
    // Simple mock query implementation
    if (text.toLowerCase().includes('select')) {
      return this.handleSelect(text, params);
    } else if (text.toLowerCase().includes('insert')) {
      return this.handleInsert(text, params);
    } else if (text.toLowerCase().includes('update')) {
      return this.handleUpdate(text, params);
    } else if (text.toLowerCase().includes('delete')) {
      return this.handleDelete(text, params);
    }

    return { rows: [], rowCount: 0 };
  }

  private handleSelect(text: string, params?: any[]): MockQueryResult {
    // Extract table name from query (simple parsing)
    const tableMatch = text.match(/from\s+(\w+)/i);
    const tableName = tableMatch ? tableMatch[1] : '';

    const tableData = this.tables.get(tableName) || [];
    return { rows: tableData, rowCount: tableData.length };
  }

  private handleInsert(text: string, params?: any[]): MockQueryResult {
    // Extract table name and values
    const tableMatch = text.match(/into\s+(\w+)/i);
    const tableName = tableMatch ? tableMatch[1] : '';

    if (tableName && params) {
      const table = this.tables.get(tableName) || [];
      const newRecord = { id: Date.now().toString(), ...this.createRecordFromParams(params) };
      table.push(newRecord);
      this.tables.set(tableName, table);
      return { rows: [newRecord], rowCount: 1 };
    }

    return { rows: [], rowCount: 0 };
  }

  private handleUpdate(text: string, params?: any[]): MockQueryResult {
    // Simple update mock - just return success
    return { rows: [], rowCount: 1 };
  }

  private handleDelete(text: string, params?: any[]): MockQueryResult {
    // Simple delete mock - just return success
    return { rows: [], rowCount: 1 };
  }

  private createRecordFromParams(params: any[]): any {
    // Create a simple record from parameters
    const record: any = {};
    params.forEach((param, index) => {
      record[`field_${index}`] = param;
    });
    return record;
  }

  async connect(): Promise<void> {
    // Mock connection
  }

  async end(): Promise<void> {
    this.tables.clear();
  }

  // Add helper methods for test data management
  addTestData(tableName: string, data: any[]): void {
    this.tables.set(tableName, data);
  }

  getTestData(tableName: string): any[] {
    return this.tables.get(tableName) || [];
  }

  clearTestData(tableName?: string): void {
    if (tableName) {
      this.tables.set(tableName, []);
    } else {
      this.tables.clear();
    }
  }
}

export const createMockDatabaseClient = (): MockDatabaseClient => {
  return new MockDatabaseClient();
};
