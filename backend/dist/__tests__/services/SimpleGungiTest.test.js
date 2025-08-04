"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const GungiGameEngine_1 = require("../../services/GungiGameEngine");
describe('Simple Test', () => {
    test('should create game engine', () => {
        const engine = new GungiGameEngine_1.GungiGameEngine('test');
        expect(engine).toBeDefined();
    });
});
//# sourceMappingURL=SimpleGungiTest.test.js.map