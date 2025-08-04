"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMockDatabaseClient = exports.MockDatabaseClient = void 0;
class MockDatabaseClient {
    tables = new Map();
    constructor() {
        this.tables.set('users', []);
        this.tables.set('matches', []);
        this.tables.set('games', []);
        this.tables.set('ai_agents', []);
    }
    async query(text, params) {
        if (text.toLowerCase().includes('select')) {
            return this.handleSelect(text, params);
        }
        else if (text.toLowerCase().includes('insert')) {
            return this.handleInsert(text, params);
        }
        else if (text.toLowerCase().includes('update')) {
            return this.handleUpdate(text, params);
        }
        else if (text.toLowerCase().includes('delete')) {
            return this.handleDelete(text, params);
        }
        return { rows: [], rowCount: 0 };
    }
    handleSelect(text, params) {
        const tableMatch = text.match(/from\s+(\w+)/i);
        const tableName = tableMatch ? tableMatch[1] : '';
        const tableData = this.tables.get(tableName) || [];
        return { rows: tableData, rowCount: tableData.length };
    }
    handleInsert(text, params) {
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
    handleUpdate(text, params) {
        return { rows: [], rowCount: 1 };
    }
    handleDelete(text, params) {
        return { rows: [], rowCount: 1 };
    }
    createRecordFromParams(params) {
        const record = {};
        params.forEach((param, index) => {
            record[`field_${index}`] = param;
        });
        return record;
    }
    async connect() {
    }
    async end() {
        this.tables.clear();
    }
    addTestData(tableName, data) {
        this.tables.set(tableName, data);
    }
    getTestData(tableName) {
        return this.tables.get(tableName) || [];
    }
    clearTestData(tableName) {
        if (tableName) {
            this.tables.set(tableName, []);
        }
        else {
            this.tables.clear();
        }
    }
}
exports.MockDatabaseClient = MockDatabaseClient;
const createMockDatabaseClient = () => {
    return new MockDatabaseClient();
};
exports.createMockDatabaseClient = createMockDatabaseClient;
//# sourceMappingURL=databaseMock.js.map