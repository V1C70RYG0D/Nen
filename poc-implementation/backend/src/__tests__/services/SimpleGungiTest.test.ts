import { GungiGameEngine, PieceType, Player } from '../../services/GungiGameEngine';

describe('Simple Test', () => {
  test('should create game engine', () => {
    const engine = new GungiGameEngine('test');
    expect(engine).toBeDefined();
  });
});
