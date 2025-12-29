import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();

interface RankFields {
  currentRank: string;
  rankPercentage: number;
  totalResolvedPredictions: number;
  contrarianWinsCount: number;
  weeklyActivityCount: number;
  inactivityStreaks: number;
  currentRankStartDate: Timestamp;
  lastRankUpdateAt: Timestamp;
}

/**
 * Seeds initial rank data for all existing users
 * Defaults all users to Novice rank with 0% progress
 */
async function seedRankData() {
  console.log('Starting rank data seeding...\n');

  const now = Timestamp.now();
  let processedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  try {
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    console.log(`Found ${usersSnapshot.size} users\n`);

    // Process in batches of 500 (Firestore batch limit)
    const BATCH_SIZE = 500;
    const users = usersSnapshot.docs;

    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const batchUsers = users.slice(i, Math.min(i + BATCH_SIZE, users.length));

      for (const userDoc of batchUsers) {
        try {
          processedCount++;
          const userId = userDoc.id;
          const userData = userDoc.data();

          // Skip if user already has rank data
          if (userData.currentRank && userData.rankPercentage !== undefined) {
            console.log(`⏭️  Skipping ${userId} - already has rank data`);
            skippedCount++;
            continue;
          }

          // Calculate initial rank fields
          const accountCreatedAt = userData.accountCreatedAt || 
            userData.createdAt || 
            now;

          // Count resolved predictions from votes collection
          const votesSnapshot = await db
            .collection('votes')
            .where('userId', '==', userId)
            .where('isCorrect', '!=', null)
            .get();

          const totalResolvedPredictions = votesSnapshot.size;
          const correctPredictions = votesSnapshot.docs.filter(
            doc => doc.data().isCorrect === true
          ).length;

          // Count contrarian wins (need to check prediction data)
          let contrarianWinsCount = 0;
          for (const voteDoc of votesSnapshot.docs) {
            const voteData = voteDoc.data();
            if (voteData.isCorrect && voteData.wasContrarian) {
              contrarianWinsCount++;
            }
          }

          // Calculate weekly activity (last 8 weeks)
          const eightWeeksAgo = new Date();
          eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
          
          const recentVotesSnapshot = await db
            .collection('votes')
            .where('userId', '==', userId)
            .where('votedAt', '>=', Timestamp.fromDate(eightWeeksAgo))
            .get();

          // Count unique weeks with activity
          const weeksWithActivity = new Set<number>();
          recentVotesSnapshot.docs.forEach(doc => {
            const votedAt = doc.data().votedAt.toDate();
            const weekNumber = Math.floor(
              (Date.now() - votedAt.getTime()) / (7 * 24 * 60 * 60 * 1000)
            );
            weeksWithActivity.add(weekNumber);
          });

          const weeklyActivityCount = weeksWithActivity.size;

          // Check for inactivity (last activity > 30 days ago)
          const lastActive = userData.lastActive || now;
          const daysSinceActive = Math.floor(
            (now.toMillis() - lastActive.toMillis()) / (1000 * 60 * 60 * 24)
          );
          const inactivityStreaks = daysSinceActive >= 30 ? 
            Math.floor(daysSinceActive / 30) : 
            0;

          // Prepare rank fields
          const rankFields: Partial<RankFields> = {
            currentRank: 'Novice',
            rankPercentage: 0,
            totalResolvedPredictions,
            contrarianWinsCount,
            weeklyActivityCount,
            inactivityStreaks,
            currentRankStartDate: accountCreatedAt,
            lastRankUpdateAt: now,
          };

          batch.update(userDoc.ref, rankFields);
          updatedCount++;

          console.log(
            `✅ ${userId}: ${totalResolvedPredictions} resolved, ` +
            `${correctPredictions} correct, ${contrarianWinsCount} contrarian wins, ` +
            `${weeklyActivityCount} active weeks, ${inactivityStreaks} inactive periods`
          );

        } catch (error) {
          console.error(`❌ Error processing user ${userDoc.id}:`, error);
          errorCount++;
        }
      }

      // Commit batch
      if (updatedCount > 0) {
        await batch.commit();
        console.log(`\n📦 Committed batch ${Math.floor(i / BATCH_SIZE) + 1}\n`);
      }
    }

    console.log('\n=== Rank Data Seeding Complete ===');
    console.log(`Total users: ${usersSnapshot.size}`);
    console.log(`Processed: ${processedCount}`);
    console.log(`Updated: ${updatedCount}`);
    console.log(`Skipped: ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);

  } catch (error) {
    console.error('\n❌ Fatal error during seeding:', error);
    process.exit(1);
  }
}

/**
 * Create initial leaderboard cache documents
 */
async function initializeLeaderboards() {
  console.log('\n\nInitializing leaderboard cache...\n');

  const ranks = ['Novice', 'Amateur', 'Analyst', 'Professional', 'Expert', 'Master'];
  const now = Timestamp.now();

  try {
    for (const rank of ranks) {
      const leaderboardRef = db.collection('leaderboards').doc(`${rank}_TOP10`);
      
      await leaderboardRef.set({
        rank,
        data: [],
        generatedAt: now,
        expiresAt: new Date(Date.now() + 3600000), // 1 hour TTL
      });

      console.log(`✅ Created leaderboard cache for ${rank}`);
    }

    console.log('\n✅ Leaderboard cache initialized');

  } catch (error) {
    console.error('❌ Error initializing leaderboards:', error);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   TruthVote Rank Data Seeding Script v1.0     ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  await seedRankData();
  await initializeLeaderboards();

  console.log('\n✅ All seeding operations complete!\n');
  process.exit(0);
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { seedRankData, initializeLeaderboards };
