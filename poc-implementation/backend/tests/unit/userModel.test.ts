import { User } from '../../src/models';

describe('User Model', () => {
  test('should have required properties', () => {
    const user: User = {
      id: '123',
      publicKey: 'abc',
      address: '123 Street',
      level: 1,
      experience: 0,
      winRate: 0.5,
      totalGames: 10,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('publicKey');
    expect(user).toHaveProperty('address');
    expect(user.createdAt).toBeInstanceOf(Date);
  });
});
