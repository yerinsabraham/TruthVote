// scripts/clearAllData.ts
import * as dotenv from 'dotenv';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

console.log('Firebase Config:', {
  projectId: firebaseConfig.projectId,
  hasApiKey: !!firebaseConfig.apiKey,
});

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

async function deleteCollection(collectionName: string) {
  console.log(`\n🗑️  Clearing ${collectionName}...`);
  
  try {
    const snapshot = await getDocs(collection(db, collectionName));
    console.log(`Found ${snapshot.size} documents in ${collectionName}`);
    
    if (snapshot.size === 0) {
      console.log(`✓ ${collectionName} is already empty`);
      return;
    }

    // Delete in batches of 500 (Firestore limit)
    const batchSize = 500;
    let deletedCount = 0;

    for (let i = 0; i < snapshot.docs.length; i += batchSize) {
      const batch = writeBatch(db);
      const batchDocs = snapshot.docs.slice(i, i + batchSize);
      
      batchDocs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      deletedCount += batchDocs.length;
      console.log(`✓ Deleted ${deletedCount}/${snapshot.size} documents from ${collectionName}`);
    }
    
    console.log(`✅ Successfully cleared ${collectionName}!`);
  } catch (error) {
    console.error(`❌ Error clearing ${collectionName}:`, error);
    throw error;
  }
}

async function clearAllData() {
  console.log('🚨 WARNING: This will delete ALL data from your Firebase database!');
  console.log('Starting in 3 seconds...\n');
  
  // Wait 3 seconds to allow cancellation
  await new Promise(resolve => setTimeout(resolve, 3000));

  try {
    // Delete all collections
    const collections = [
      'predictions',
      'votes',
      'comments',
      'users',
      'bookmarks',
      'follows',
      'notifications',
      'reports',
      'activities',
      // Keep categories if you want to preserve them
      // Otherwise uncomment the line below:
      // 'categories',
    ];

    for (const collectionName of collections) {
      await deleteCollection(collectionName);
    }

    console.log('\n✅ All mock data cleared successfully!');
    console.log('\n📝 Summary:');
    console.log(`   - Predictions: Deleted`);
    console.log(`   - Votes: Deleted`);
    console.log(`   - Comments: Deleted`);
    console.log(`   - Users: Deleted`);
    console.log(`   - Bookmarks: Deleted`);
    console.log(`   - Follows: Deleted`);
    console.log(`   - Notifications: Deleted`);
    console.log(`   - Reports: Deleted`);
    console.log(`   - Activities: Deleted`);
    console.log(`   - Categories: Preserved (uncomment to delete)`);
    
  } catch (error) {
    console.error('\n❌ Error clearing data:', error);
    process.exit(1);
  }
}

// Run the clear function
clearAllData();
