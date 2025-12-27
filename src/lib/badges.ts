// src/lib/badges.ts
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from './firebase/config';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const BADGES: Badge[] = [
  {
    id: 'first_vote',
    name: 'First Vote',
    description: 'Cast your first prediction',
    icon: '🎯'
  },
  {
    id: 'correct_5',
    name: 'Sharp Shooter',
    description: 'Get 5 predictions correct',
    icon: '🎪'
  },
  {
    id: 'correct_10',
    name: 'Oracle',
    description: 'Get 10 predictions correct',
    icon: '🔮'
  },
  {
    id: 'correct_25',
    name: 'Sage',
    description: 'Get 25 predictions correct',
    icon: '🧙‍♂️'
  },
  {
    id: 'correct_50',
    name: 'Prophet',
    description: 'Get 50 predictions correct',
    icon: '⚡'
  },
  {
    id: 'streak_3',
    name: 'Hot Streak',
    description: '3 correct predictions in a row',
    icon: '🔥'
  },
  {
    id: 'streak_5',
    name: 'On Fire',
    description: '5 correct predictions in a row',
    icon: '🌟'
  },
  {
    id: 'votes_10',
    name: 'Active Voter',
    description: 'Cast 10 votes',
    icon: '📊'
  },
  {
    id: 'votes_50',
    name: 'Dedicated',
    description: 'Cast 50 votes',
    icon: '💪'
  },
  {
    id: 'votes_100',
    name: 'Legend',
    description: 'Cast 100 votes',
    icon: '👑'
  },
  {
    id: 'accuracy_80',
    name: 'Sharpshooter',
    description: 'Maintain 80% accuracy with 20+ votes',
    icon: '🎯'
  },
  {
    id: 'early_adopter',
    name: 'Early Adopter',
    description: 'One of the first 100 users',
    icon: '🚀'
  }
];

export async function checkAndAwardBadges(userId: string, userStats: {
  totalVotes: number;
  correctVotes: number;
  accuracyRate: number;
  currentBadges: string[];
}) {
  const newBadges: string[] = [];

  // First vote
  if (userStats.totalVotes === 1 && !userStats.currentBadges.includes('first_vote')) {
    newBadges.push('first_vote');
  }

  // Correct predictions milestones
  if (userStats.correctVotes >= 5 && !userStats.currentBadges.includes('correct_5')) {
    newBadges.push('correct_5');
  }
  if (userStats.correctVotes >= 10 && !userStats.currentBadges.includes('correct_10')) {
    newBadges.push('correct_10');
  }
  if (userStats.correctVotes >= 25 && !userStats.currentBadges.includes('correct_25')) {
    newBadges.push('correct_25');
  }
  if (userStats.correctVotes >= 50 && !userStats.currentBadges.includes('correct_50')) {
    newBadges.push('correct_50');
  }

  // Total votes milestones
  if (userStats.totalVotes >= 10 && !userStats.currentBadges.includes('votes_10')) {
    newBadges.push('votes_10');
  }
  if (userStats.totalVotes >= 50 && !userStats.currentBadges.includes('votes_50')) {
    newBadges.push('votes_50');
  }
  if (userStats.totalVotes >= 100 && !userStats.currentBadges.includes('votes_100')) {
    newBadges.push('votes_100');
  }

  // Accuracy milestone
  if (userStats.totalVotes >= 20 && userStats.accuracyRate >= 80 && !userStats.currentBadges.includes('accuracy_80')) {
    newBadges.push('accuracy_80');
  }

  // Award new badges
  if (newBadges.length > 0) {
    try {
      await updateDoc(doc(db, 'users', userId), {
        badges: arrayUnion(...newBadges)
      });
      return newBadges;
    } catch (error) {
      console.error('Error awarding badges:', error);
    }
  }

  return [];
}

export function getBadgeInfo(badgeId: string): Badge | undefined {
  return BADGES.find(b => b.id === badgeId);
}
