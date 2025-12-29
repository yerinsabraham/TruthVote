// scripts/updateUserRanks.ts
// Script to add rank field to existing users who don't have it

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
if (getApps().length === 0) {
  const serviceAccount = require('../truthvote-1de81-firebase-adminsdk-fbsvc-f3f9239d18.json');
  initializeApp({
    credential: cert(serviceAccount),
    projectId: 'truthvote-1de81',
  });
}

const db = getFirestore();

async function updateUserRanks() {
  console.log('Starting user rank update...');
  
  try {
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    
    console.log(`Found ${usersSnapshot.size} users`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    const batch = db.batch();
    let batchCount = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      
      // Check if user already has a rank
      if (!userData.rank) {
        console.log(`Updating user ${userDoc.id} (${userData.email || 'no email'}) - adding rank: novice`);
        
        batch.update(userDoc.ref, {
          rank: 'novice',
          rankPercentage: 0,
          totalPoints: userData.totalPoints || userData.points || 0,
          totalPredictions: userData.totalPredictions || 0,
          correctPredictions: userData.correctPredictions || 0,
        });
        
        batchCount++;
        updatedCount++;
        
        // Firestore batch limit is 500
        if (batchCount >= 400) {
          console.log('Committing batch...');
          await batch.commit();
          batchCount = 0;
        }
      } else {
        console.log(`Skipping user ${userDoc.id} - already has rank: ${userData.rank}`);
        skippedCount++;
      }
    }
    
    // Commit remaining updates
    if (batchCount > 0) {
      console.log('Committing final batch...');
      await batch.commit();
    }
    
    console.log('\n=== Update Complete ===');
    console.log(`Updated: ${updatedCount} users`);
    console.log(`Skipped: ${skippedCount} users (already had rank)`);
    console.log(`Total: ${usersSnapshot.size} users`);
    
  } catch (error) {
    console.error('Error updating user ranks:', error);
    process.exit(1);
  }
}

updateUserRanks()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
