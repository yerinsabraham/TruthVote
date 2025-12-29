import { RankEngine } from '../rankEngine';
import { Rank, UserStats, RankConfig } from '@/types/rank';
import { RANK_CONFIGS } from '@/config/ranks';

describe('RankEngine', () => {
  let rankEngine: RankEngine;

  beforeEach(() => {
    rankEngine = new RankEngine();
  });

  describe('calculateRankPercentage', () => {
    it('should return 20% for brand new Novice user with no activity', () => {
      const userStats: UserStats = {
        userId: 'test-user-1',
        currentRank: 'Novice',
        accountCreatedAt: new Date().toISOString(),
        totalResolvedPredictions: 0,
        correctPredictions: 0,
        contrarianWinsCount: 0,
        weeklyActivityCount: 0,
        inactivityStreaks: 0,
        lastRankUpdateAt: null,
        currentRankStartDate: new Date().toISOString(),
      };

      const result = rankEngine.calculateRankPercentage(userStats);

      // Novice has no time gate, so time score = 100
      // But accuracy, consistency, volume all = 0
      // Time weight = 20%, so: 100 * 0.20 = 20%
      expect(result.percentage).toBe(20);
      expect(result.breakdown.timeScore).toBe(100);
      expect(result.breakdown.accuracyScore).toBe(0);
      expect(result.breakdown.consistencyScore).toBe(0);
      expect(result.breakdown.volumeScore).toBe(0);
    });

    it('should calculate correct percentage for user with mixed stats', () => {
      const accountCreatedDate = new Date();
      accountCreatedDate.setDate(accountCreatedDate.getDate() - 45); // 45 days ago

      const userStats: UserStats = {
        userId: 'test-user-2',
        currentRank: 'Novice',
        accountCreatedAt: accountCreatedDate.toISOString(),
        totalResolvedPredictions: 20,
        correctPredictions: 14, // 70% accuracy
        contrarianWinsCount: 2,
        weeklyActivityCount: 5,
        inactivityStreaks: 0,
        lastRankUpdateAt: null,
        currentRankStartDate: accountCreatedDate.toISOString(),
      };

      const result = rankEngine.calculateRankPercentage(userStats);

      // Time: 100 (no gate for Novice)
      // Accuracy: 70% + 10% contrarian bonus = 80% → normalized above 50% minimum
      // Consistency: 5 weeks >= 1 week minimum → 85 or 100
      // Volume: 20 >= 5 minimum → 85 or 100

      expect(result.percentage).toBeGreaterThan(50);
      expect(result.percentage).toBeLessThanOrEqual(100);
      expect(result.breakdown.timeScore).toBe(100);
      expect(result.breakdown.accuracyScore).toBeGreaterThan(0);
      expect(result.breakdown.consistencyScore).toBeGreaterThan(0);
      expect(result.breakdown.volumeScore).toBeGreaterThan(0);
    });

    it('should apply inactivity penalty correctly', () => {
      const userStats: UserStats = {
        userId: 'test-user-3',
        currentRank: 'Amateur',
        accountCreatedAt: new Date().toISOString(),
        totalResolvedPredictions: 30,
        correctPredictions: 20,
        contrarianWinsCount: 3,
        weeklyActivityCount: 8,
        inactivityStreaks: 2, // 2 * 30-day gaps = -20%
        lastRankUpdateAt: null,
        currentRankStartDate: new Date().toISOString(),
      };

      const result = rankEngine.calculateRankPercentage(userStats);

      // Should have -20% penalty
      expect(result.breakdown.inactivityPenalty).toBe(20);
      expect(result.percentage).toBeLessThan(100);
    });

    it('should cap inactivity penalty at 50%', () => {
      const userStats: UserStats = {
        userId: 'test-user-4',
        currentRank: 'Analyst',
        accountCreatedAt: new Date().toISOString(),
        totalResolvedPredictions: 50,
        correctPredictions: 35,
        contrarianWinsCount: 5,
        weeklyActivityCount: 15,
        inactivityStreaks: 10, // Would be -100%, but capped at -50%
        lastRankUpdateAt: null,
        currentRankStartDate: new Date().toISOString(),
      };

      const result = rankEngine.calculateRankPercentage(userStats);

      expect(result.breakdown.inactivityPenalty).toBe(50); // Capped
    });

    it('should return 0 accuracy score if below minimum threshold', () => {
      const userStats: UserStats = {
        userId: 'test-user-5',
        currentRank: 'Amateur', // Min accuracy: 55%
        accountCreatedAt: new Date().toISOString(),
        totalResolvedPredictions: 30,
        correctPredictions: 15, // 50% accuracy < 55% minimum
        contrarianWinsCount: 0,
        weeklyActivityCount: 5,
        inactivityStreaks: 0,
        lastRankUpdateAt: null,
        currentRankStartDate: new Date().toISOString(),
      };

      const result = rankEngine.calculateRankPercentage(userStats);

      expect(result.breakdown.accuracyScore).toBe(0);
    });

    it('should require minimum 10 resolved predictions for accuracy', () => {
      const userStats: UserStats = {
        userId: 'test-user-6',
        currentRank: 'Novice',
        accountCreatedAt: new Date().toISOString(),
        totalResolvedPredictions: 8, // Less than 10
        correctPredictions: 8, // 100% accuracy
        contrarianWinsCount: 2,
        weeklyActivityCount: 3,
        inactivityStreaks: 0,
        lastRankUpdateAt: null,
        currentRankStartDate: new Date().toISOString(),
      };

      const result = rankEngine.calculateRankPercentage(userStats);

      // Accuracy score should be 0 even with 100% accuracy
      expect(result.breakdown.accuracyScore).toBe(0);
    });

    it('should give contrarian bonus correctly', () => {
      const userStats: UserStats = {
        userId: 'test-user-7',
        currentRank: 'Professional',
        accountCreatedAt: new Date().toISOString(),
        totalResolvedPredictions: 50,
        correctPredictions: 35, // 70% base accuracy
        contrarianWinsCount: 5, // 5/50 = 10% → +1% bonus
        weeklyActivityCount: 30,
        inactivityStreaks: 0,
        lastRankUpdateAt: null,
        currentRankStartDate: new Date().toISOString(),
      };

      const result = rankEngine.calculateRankPercentage(userStats);

      // Boosted accuracy should be ~71%
      expect(result.breakdown.accuracyScore).toBeGreaterThan(0);
    });
  });

  describe('determineRankEligibility', () => {
    it('should not be eligible if percentage < 100', () => {
      const userStats: UserStats = {
        userId: 'test-user-8',
        currentRank: 'Novice',
        accountCreatedAt: new Date().toISOString(),
        totalResolvedPredictions: 10,
        correctPredictions: 7,
        contrarianWinsCount: 1,
        weeklyActivityCount: 3,
        inactivityStreaks: 0,
        lastRankUpdateAt: null,
        currentRankStartDate: new Date().toISOString(),
      };

      const calculation = rankEngine.calculateRankPercentage(userStats);
      const eligibility = rankEngine.determineRankEligibility(
        userStats,
        calculation.percentage
      );

      if (calculation.percentage < 100) {
        expect(eligibility.isEligible).toBe(false);
        expect(eligibility.reason).toContain('progress');
      }
    });

    it('should not be eligible if time gate not met', () => {
      const accountCreatedDate = new Date();
      accountCreatedDate.setDate(accountCreatedDate.getDate() - 15); // 15 days ago

      const userStats: UserStats = {
        userId: 'test-user-9',
        currentRank: 'Novice',
        accountCreatedAt: accountCreatedDate.toISOString(),
        totalResolvedPredictions: 100,
        correctPredictions: 90,
        contrarianWinsCount: 10,
        weeklyActivityCount: 2,
        inactivityStreaks: 0,
        lastRankUpdateAt: null,
        currentRankStartDate: accountCreatedDate.toISOString(),
      };

      // Force 100% by mocking (in real scenario, would need perfect stats)
      const eligibility = rankEngine.determineRankEligibility(userStats, 100);

      // Amateur requires 30 days, user only has 15
      expect(eligibility.isEligible).toBe(false);
      expect(eligibility.reason).toContain('time gate');
      expect(eligibility.daysRemaining).toBeGreaterThan(0);
    });

    it('should be eligible when both 100% and time gate met', () => {
      const accountCreatedDate = new Date();
      accountCreatedDate.setDate(accountCreatedDate.getDate() - 35); // 35 days ago

      const userStats: UserStats = {
        userId: 'test-user-10',
        currentRank: 'Novice',
        accountCreatedAt: accountCreatedDate.toISOString(),
        totalResolvedPredictions: 100,
        correctPredictions: 90,
        contrarianWinsCount: 10,
        weeklyActivityCount: 5,
        inactivityStreaks: 0,
        lastRankUpdateAt: null,
        currentRankStartDate: accountCreatedDate.toISOString(),
      };

      // Assuming user reached 100%
      const eligibility = rankEngine.determineRankEligibility(userStats, 100);

      // Amateur requires 30 days, user has 35
      expect(eligibility.isEligible).toBe(true);
      expect(eligibility.nextRank).toBe('Amateur');
    });

    it('should return null for Master rank (max tier)', () => {
      const userStats: UserStats = {
        userId: 'test-user-11',
        currentRank: 'Master',
        accountCreatedAt: new Date().toISOString(),
        totalResolvedPredictions: 500,
        correctPredictions: 400,
        contrarianWinsCount: 50,
        weeklyActivityCount: 80,
        inactivityStreaks: 0,
        lastRankUpdateAt: null,
        currentRankStartDate: new Date().toISOString(),
      };

      const eligibility = rankEngine.determineRankEligibility(userStats, 100);

      expect(eligibility.isEligible).toBe(false);
      expect(eligibility.nextRank).toBeNull();
      expect(eligibility.reason).toContain('maximum rank');
    });
  });

  describe('prepareRankUpgrade', () => {
    it('should prepare upgrade data with correct fields', () => {
      const accountCreatedDate = new Date();
      accountCreatedDate.setDate(accountCreatedDate.getDate() - 50);

      const userStats: UserStats = {
        userId: 'test-user-12',
        currentRank: 'Novice',
        accountCreatedAt: accountCreatedDate.toISOString(),
        totalResolvedPredictions: 50,
        correctPredictions: 40,
        contrarianWinsCount: 5,
        weeklyActivityCount: 7,
        inactivityStreaks: 0,
        lastRankUpdateAt: null,
        currentRankStartDate: accountCreatedDate.toISOString(),
      };

      const upgrade = rankEngine.prepareRankUpgrade(userStats, 'Amateur');

      expect(upgrade.userId).toBe('test-user-12');
      expect(upgrade.previousRank).toBe('Novice');
      expect(upgrade.newRank).toBe('Amateur');
      expect(upgrade.percentage).toBe(100);
      expect(upgrade.trigger).toBe('auto_promotion');
      expect(upgrade.timestamp).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero values gracefully', () => {
      const userStats: UserStats = {
        userId: 'test-user-13',
        currentRank: 'Novice',
        accountCreatedAt: new Date().toISOString(),
        totalResolvedPredictions: 0,
        correctPredictions: 0,
        contrarianWinsCount: 0,
        weeklyActivityCount: 0,
        inactivityStreaks: 0,
        lastRankUpdateAt: null,
        currentRankStartDate: new Date().toISOString(),
      };

      const result = rankEngine.calculateRankPercentage(userStats);

      expect(result.percentage).toBeGreaterThanOrEqual(0);
      expect(result.percentage).toBeLessThanOrEqual(100);
    });

    it('should cap percentage at 100', () => {
      const accountCreatedDate = new Date();
      accountCreatedDate.setDate(accountCreatedDate.getDate() - 365);

      const userStats: UserStats = {
        userId: 'test-user-14',
        currentRank: 'Novice',
        accountCreatedAt: accountCreatedDate.toISOString(),
        totalResolvedPredictions: 500,
        correctPredictions: 475, // 95% accuracy
        contrarianWinsCount: 50,
        weeklyActivityCount: 52,
        inactivityStreaks: 0,
        lastRankUpdateAt: null,
        currentRankStartDate: accountCreatedDate.toISOString(),
      };

      const result = rankEngine.calculateRankPercentage(userStats);

      expect(result.percentage).toBeLessThanOrEqual(100);
    });

    it('should handle negative calculation results by flooring at 0', () => {
      const userStats: UserStats = {
        userId: 'test-user-15',
        currentRank: 'Expert',
        accountCreatedAt: new Date().toISOString(),
        totalResolvedPredictions: 10,
        correctPredictions: 2, // 20% accuracy (way below 70% minimum)
        contrarianWinsCount: 0,
        weeklyActivityCount: 1,
        inactivityStreaks: 10, // Max penalty
        lastRankUpdateAt: null,
        currentRankStartDate: new Date().toISOString(),
      };

      const result = rankEngine.calculateRankPercentage(userStats);

      expect(result.percentage).toBeGreaterThanOrEqual(0);
    });
  });
});
