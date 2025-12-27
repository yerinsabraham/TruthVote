// scripts/updateCategories.ts
import * as dotenv from 'dotenv';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
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

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

const categoriesWithSubcategories = [
  {
    id: 'politics',
    name: 'Politics',
    description: 'Elections, policies, and political events',
    icon: '🏛️',
    color: '#3B82F6',
    isActive: true,
    predictionCount: 0,
    order: 1,
    subcategories: ['Elections', 'Policy', 'International Relations', 'US Politics', 'Global Politics']
  },
  {
    id: 'sports',
    name: 'Sports',
    description: 'Games, tournaments, and athletic competitions',
    icon: '⚽',
    color: '#10B981',
    isActive: true,
    predictionCount: 0,
    order: 2,
    subcategories: ['Football', 'Basketball', 'Tennis', 'World Cup', 'Olympics', 'NFL', 'NBA']
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    description: 'Movies, music, awards, and pop culture',
    icon: '🎬',
    color: '#A855F7',
    isActive: true,
    predictionCount: 0,
    order: 3,
    subcategories: ['Movies', 'Music', 'Awards', 'Streaming', 'TV Shows', 'Celebrities']
  },
  {
    id: 'technology',
    name: 'Technology',
    description: 'Tech releases, innovations, and industry trends',
    icon: '💻',
    color: '#F59E0B',
    isActive: true,
    predictionCount: 0,
    order: 4,
    subcategories: ['AI', 'Crypto', 'Blockchain', 'Web3', 'Fintech', 'Software', 'Hardware']
  },
  {
    id: 'finance',
    name: 'Finance',
    description: 'Markets, crypto, and economic predictions',
    icon: '📈',
    color: '#EAB308',
    isActive: true,
    predictionCount: 0,
    order: 5,
    subcategories: ['Stocks', 'Crypto', 'Economy', 'Markets', 'Bitcoin', 'ETH', 'Trading']
  },
  {
    id: 'science',
    name: 'Science',
    description: 'Scientific discoveries and research',
    icon: '🔬',
    color: '#06B6D4',
    isActive: true,
    predictionCount: 0,
    order: 6,
    subcategories: ['Space', 'Climate', 'Research', 'Health', 'Medicine', 'Physics', 'Biology']
  },
  {
    id: 'world-events',
    name: 'World Events',
    description: 'Global news and significant events',
    icon: '🌍',
    color: '#EC4899',
    isActive: true,
    predictionCount: 0,
    order: 7,
    subcategories: ['Breaking News', 'Natural Disasters', 'Geopolitics', 'Social Issues', 'Environment']
  },
];

async function updateCategories() {
  console.log('Starting category update with subcategories...');

  try {
    for (const category of categoriesWithSubcategories) {
      const categoryRef = doc(db, 'categories', category.id);
      await setDoc(categoryRef, category, { merge: true });
      console.log(`✓ Updated category: ${category.name} with ${category.subcategories.length} subcategories`);
    }

    console.log('\n✅ All categories updated successfully!');
    console.log(`Total categories: ${categoriesWithSubcategories.length}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating categories:', error);
    process.exit(1);
  }
}

updateCategories();
