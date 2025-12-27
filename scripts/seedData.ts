// scripts/seedData.ts
import * as dotenv from 'dotenv';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, Timestamp } from 'firebase/firestore';
import * as path from 'path';

// Load environment variables from parent directory
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Initialize Firebase (use your actual config)
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

// Categories
const categories = [
  { id: 'politics', name: 'Politics', description: 'Elections, policies, and political events', icon: '🏛️', color: '#3B82F6', isActive: true, predictionCount: 0, order: 1 },
  { id: 'sports', name: 'Sports', description: 'Games, tournaments, and athletic competitions', icon: '⚽', color: '#10B981', isActive: true, predictionCount: 0, order: 2 },
  { id: 'entertainment', name: 'Entertainment', description: 'Movies, music, awards, and pop culture', icon: '🎬', color: '#A855F7', isActive: true, predictionCount: 0, order: 3 },
  { id: 'technology', name: 'Technology', description: 'Tech releases, innovations, and industry trends', icon: '💻', color: '#F59E0B', isActive: true, predictionCount: 0, order: 4 },
  { id: 'finance', name: 'Finance', description: 'Markets, crypto, and economic predictions', icon: '📈', color: '#EAB308', isActive: true, predictionCount: 0, order: 5 },
  { id: 'science', name: 'Science', description: 'Scientific discoveries and research', icon: '🔬', color: '#06B6D4', isActive: true, predictionCount: 0, order: 6 },
  { id: 'world-events', name: 'World Events', description: 'Global news and significant events', icon: '🌍', color: '#EC4899', isActive: true, predictionCount: 0, order: 7 },
];

// Sample predictions
const predictions = [
  {
    id: 'pred-001',
    question: 'Will Bitcoin reach $100,000 by December 31, 2025?',
    description: 'Bitcoin to hit six-figure milestone before year end',
    optionA: 'Yes',
    optionB: 'No',
    voteCountA: 450,  // 75% - Strong yes
    voteCountB: 150,
    category: 'finance',
    tags: ['crypto', 'bitcoin', '2025'],
    createdBy: 'admin',
    creatorName: 'TruthVote',
    status: 'active',
    endDate: new Date('2025-12-31'),
    isApproved: true,
    isFeatured: true,
    viewCount: 0,
    commentCount: 12,
    shareCount: 0,
    reportCount: 0,
  },
  {
    id: 'pred-002',
    question: 'Will AI surpass human intelligence by 2030?',
    description: 'AGI (Artificial General Intelligence) achievement prediction',
    optionA: 'Yes',
    optionB: 'No',
    voteCountA: 200,  // 40% - Evenly split, slight no
    voteCountB: 300,
    category: 'technology',
    tags: ['ai', 'agi', 'future'],
    createdBy: 'admin',
    creatorName: 'TruthVote',
    status: 'active',
    endDate: new Date('2030-01-01'),
    isApproved: true,
    isFeatured: true,
    viewCount: 0,
    commentCount: 28,
    shareCount: 0,
    reportCount: 0,
  },
  {
    id: 'pred-003',
    question: 'Will Manchester City win the Premier League 2025/26?',
    description: 'Premier League title prediction for 2025/26 season',
    optionA: 'Yes',
    optionB: 'No',
    voteCountA: 340,  // 60% - Moderate yes
    voteCountB: 230,
    category: 'sports',
    tags: ['football', 'premier-league', 'manchester-city'],
    createdBy: 'admin',
    creatorName: 'TruthVote',
    status: 'active',
    endDate: new Date('2026-05-31'),
    isApproved: true,
    isFeatured: false,
    viewCount: 0,
    commentCount: 18,
    shareCount: 0,
    reportCount: 0,
  },
  {
    id: 'pred-004',
    question: 'Will SpaceX successfully land humans on Mars by 2030?',
    description: 'First crewed Mars landing mission',
    optionA: 'Yes',
    optionB: 'No',
    voteCountA: 120,  // 20% - Strong no
    voteCountB: 480,
    category: 'science',
    tags: ['space', 'spacex', 'mars'],
    createdBy: 'admin',
    creatorName: 'TruthVote',
    status: 'active',
    endDate: new Date('2030-12-31'),
    isApproved: true,
    isFeatured: true,
    viewCount: 0,
    commentCount: 35,
    shareCount: 0,
    reportCount: 0,
  },
  {
    id: 'pred-005',
    question: 'Will a movie gross over $3 billion worldwide in 2025?',
    description: 'New box office record prediction',
    optionA: 'Yes',
    optionB: 'No',
    voteCountA: 275,  // 55% - Nearly even, slight yes
    voteCountB: 225,
    category: 'entertainment',
    tags: ['movies', 'box-office', 'records'],
    createdBy: 'admin',
    creatorName: 'TruthVote',
    status: 'active',
    endDate: new Date('2025-12-31'),
    isApproved: true,
    isFeatured: false,
    viewCount: 0,
    commentCount: 8,
    shareCount: 0,
    reportCount: 0,
  },
];

async function seedData() {
  console.log('Starting data seeding...');

  try {
    // Seed categories
    console.log('Seeding categories...');
    for (const category of categories) {
      await setDoc(doc(db, 'categories', category.id), category);
      console.log(`✓ Created category: ${category.name}`);
    }

    // Seed predictions
    console.log('\nSeeding predictions...');
    for (const prediction of predictions) {
      const predData = {
        ...prediction,
        createdAt: Timestamp.now(),
        startDate: Timestamp.now(),
        endDate: Timestamp.fromDate(prediction.endDate),
      };
      await setDoc(doc(db, 'predictions', prediction.id), predData);
      console.log(`✓ Created prediction: ${prediction.question}`);
    }

    console.log('\n✅ Seed data created successfully!');
    console.log(`- ${categories.length} categories`);
    console.log(`- ${predictions.length} predictions`);
    
  } catch (error) {
    console.error('❌ Error seeding data:', error);
  }
}

// Run the seed function
seedData();
