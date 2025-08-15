import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with initial data...');

  // Create sample users
  const user1 = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      id: 'user_alice_123',
      username: 'Alice_Player',
      email: 'alice@example.com',
      address: '7KjqZzUCjGHJGmq8FdGPyoWGLzeLhEJk8XbLGxKJK4m2',
      publicKey: '7KjqZzUCjGHJGmq8FdGPyoWGLzeLhEJk8XbLGxKJK4m2',
      level: 5,
      experience: 1250,
      winRate: 0.75,
      totalGames: 20,
      isActive: true,
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      id: 'user_bob_456',
      username: 'Bob_Strategist',
      email: 'bob@example.com',
      address: '9MnZzVJXLdGpwxXmD4JyxR5QW8kLmEHw2YpGKxJK5m3',
      publicKey: '9MnZzVJXLdGpwxXmD4JyxR5QW8kLmEHw2YpGKxJK5m3',
      level: 3,
      experience: 800,
      winRate: 0.6,
      totalGames: 15,
      isActive: true,
    },
  });

  // Create a sample game
  const game = await prisma.game.create({
    data: {
      id: 'game_sample_789',
      status: 'COMPLETED',
      player1Id: user1.id,
      player2Id: user2.id,
      winnerId: user1.id,
      betAmount: 0.5,
      boardState: {
        pieces: [],
        turn: 'player1',
        status: 'completed'
      },
      moveHistory: [
        { move: 1, player: 'player1', from: 'a1', to: 'a2', piece: 'pawn' },
        { move: 2, player: 'player2', from: 'b7', to: 'b6', piece: 'pawn' }
      ],
      startedAt: new Date('2024-01-01T10:00:00Z'),
      completedAt: new Date('2024-01-01T10:45:00Z'),
    },
  });

  // Create sample moves for the game
  await prisma.move.createMany({
    data: [
      {
        gameId: game.id,
        playerId: user1.id,
        fromX: 0,
        fromY: 0,
        toX: 0,
        toY: 1,
        piece: 'pawn',
        moveNumber: 1,
      },
      {
        gameId: game.id,
        playerId: user2.id,
        fromX: 1,
        fromY: 6,
        toX: 1,
        toY: 5,
        piece: 'pawn',
        moveNumber: 2,
      },
    ],
  });

  // Create sample bets
  const bet = await prisma.bet.create({
    data: {
      userId: user2.id,
      gameId: game.id,
      amount: 0.1,
      odds: 2.0,
      status: 'LOST',
      payout: null,
      settledAt: new Date('2024-01-01T10:45:00Z'),
    },
  });

  // Create sample NFTs
  await prisma.nFT.createMany({
    data: [
      {
        tokenId: 'nft_gungi_piece_001',
        ownerId: user1.id,
        name: 'Golden Commander',
        description: 'A rare golden commander piece with special abilities',
        image: 'https://example.com/nfts/golden_commander.png',
        attributes: {
          rarity: 'legendary',
          power: 95,
          defense: 88,
          special: 'double_move'
        },
        price: 5.0,
        isListed: true,
        listedAt: new Date(),
      },
      {
        tokenId: 'nft_gungi_piece_002',
        ownerId: user2.id,
        name: 'Silver Fortress',
        description: 'A defensive piece with high durability',
        image: 'https://example.com/nfts/silver_fortress.png',
        attributes: {
          rarity: 'rare',
          power: 70,
          defense: 95,
          special: 'shield_wall'
        },
        price: null,
        isListed: false,
      },
    ],
  });

  // Create sample notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: user1.id,
        type: 'GAME_END',
        title: 'Victory!',
        message: 'You won your game against Bob_Strategist',
        data: {
          gameId: game.id,
          winnings: '0.5 SOL'
        },
      },
      {
        userId: user2.id,
        type: 'BET_LOST',
        title: 'Bet Result',
        message: 'Your bet on the Alice vs Bob game was not successful',
        data: {
          gameId: game.id,
          betAmount: '0.1 SOL'
        },
      },
    ],
  });

  // Create sample training results
  await prisma.trainingResult.create({
    data: {
      sessionId: 'training_session_001',
      aiAgentId: 'ai_agent_alpha_001',
      userId: user1.id,
      configuration: {
        difficulty: 'medium',
        iterations: 1000,
        learningRate: 0.01
      },
      gameOutcome: {
        wins: 750,
        losses: 250,
        winRate: 0.75
      },
      performanceMetrics: {
        avgMoveTime: 0.5,
        accuracy: 0.88,
        strategicScore: 92
      },
    },
  });

  // Create sample sessions
  await prisma.session.create({
    data: {
      userId: user1.id,
      token: 'session_token_alice_secure_xyz789',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    },
  });

  console.log('Database seeded successfully!');
  console.log({
    users: 2,
    games: 1,
    moves: 2,
    bets: 1,
    nfts: 2,
    notifications: 2,
    trainingResults: 1,
    sessions: 1,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
