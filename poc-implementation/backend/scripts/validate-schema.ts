import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function validateSchema() {
  console.log('🔍 Validating database schema and queries...\n');

  try {
    // Test User model
    console.log('Testing User model...');
    const users = await prisma.user.findMany({
      take: 2,
      include: {
        bets: true,
        gamesAsPlayer1: true,
        gamesAsPlayer2: true,
        wonGames: true,
        nfts: true,
        notifications: true,
        trainingResults: true
      }
    });
    console.log(`✅ Found ${users.length} users with all relations`);

    // Test Game model
    console.log('Testing Game model...');
    const games = await prisma.game.findMany({
      take: 2,
      include: {
        player1: true,
        player2: true,
        winner: true,
        bets: true,
        moves: true
      }
    });
    console.log(`✅ Found ${games.length} games with all relations`);

    // Test Bet model
    console.log('Testing Bet model...');
    const bets = await prisma.bet.findMany({
      take: 2,
      include: {
        user: true,
        game: true
      }
    });
    console.log(`✅ Found ${bets.length} bets with all relations`);

    // Test Move model
    console.log('Testing Move model...');
    const moves = await prisma.move.findMany({
      take: 2,
      include: {
        game: true
      }
    });
    console.log(`✅ Found ${moves.length} moves with game relation`);

    // Test NFT model
    console.log('Testing NFT model...');
    const nfts = await prisma.nFT.findMany({
      take: 2,
      include: {
        owner: true
      }
    });
    console.log(`✅ Found ${nfts.length} NFTs with owner relation`);

    // Test Notification model
    console.log('Testing Notification model...');
    const notifications = await prisma.notification.findMany({
      take: 2,
      include: {
        user: true
      }
    });
    console.log(`✅ Found ${notifications.length} notifications with user relation`);

    // Test TrainingResult model
    console.log('Testing TrainingResult model...');
    const trainingResults = await prisma.trainingResult.findMany({
      take: 2,
      include: {
        agent: true
      }
    });
    console.log(`✅ Found ${trainingResults.length} training results with agent relation`);

    // Test Session model
    console.log('Testing Session model...');
    const sessions = await prisma.session.findMany({
      take: 2
    });
    console.log(`✅ Found ${sessions.length} sessions`);

    // Test complex query with multiple joins
    console.log('Testing complex query...');
    const userWithStats = await prisma.user.findFirst({
      where: { email: 'alice@example.com' },
      include: {
        bets: {
          where: { status: { in: ['WON', 'LOST'] } },
          include: { game: true }
        },
        gamesAsPlayer1: {
          where: { status: 'COMPLETED' },
          include: { player2: true }
        },
        wonGames: true,
        nfts: { where: { isListed: true } }
      }
    });
    console.log(`✅ Complex query successful for user: ${userWithStats?.username}`);

    console.log('\n🎉 All schema validations passed successfully!');
    
    // Show some statistics
    console.log('\n📊 Database Statistics:');
    const stats = {
      totalUsers: await prisma.user.count(),
      totalGames: await prisma.game.count(),
      totalBets: await prisma.bet.count(),
      totalMoves: await prisma.move.count(),
      totalNFTs: await prisma.nFT.count(),
      totalNotifications: await prisma.notification.count(),
      totalTrainingResults: await prisma.trainingResult.count(),
      totalSessions: await prisma.session.count(),
    };
    
    Object.entries(stats).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });

  } catch (error) {
    console.error('❌ Schema validation failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

validateSchema();
