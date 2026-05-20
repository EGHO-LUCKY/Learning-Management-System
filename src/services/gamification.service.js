const {
  UserAchievement, Leaderboard,
} = require('../models/index');
const Achievement = require('../models/Achievement.model');
const logger = require('../utils/logger');

/**
 * Gamification Service
 * Manages achievements, XP, points, and leaderboards
 */
class GamificationService {
  /**
   * Add XP to a user
   */
  static async addXp(userId, xp, leaderboardType = 'global') {
    try {
      let leaderboard = await Leaderboard.findOne({ user: userId, leaderboardType });

      if (!leaderboard) {
        leaderboard = new Leaderboard({
          user: userId,
          leaderboardType,
          totalXp: 0,
          currentStreak: 0,
          longestStreak: 0,
        });
      }

      // Update streak (only for global leaderboard)
      if (leaderboardType === 'global') {
        this._updateStreakInternal(leaderboard);
      }

      leaderboard.totalXp += xp;
      leaderboard.lastActivityAt = new Date();
      await leaderboard.save();

      // Enqueue rank recalculation (simulated as background task)
      this.enqueueRankRecalculation(leaderboardType);

      return leaderboard;
    } catch (error) {
      logger.error('Error adding XP:', error);
    }
  }

  /**
   * Internal helper to update streak on a leaderboard instance
   */
  static _updateStreakInternal(leaderboard) {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const lastActivity = leaderboard.lastActivityAt;

    if (lastActivity && lastActivity.toDateString() === yesterday.toDateString()) {
      leaderboard.currentStreak += 1;
      if (leaderboard.currentStreak > leaderboard.longestStreak) {
        leaderboard.longestStreak = leaderboard.currentStreak;
      }
    } else if (!lastActivity || lastActivity.toDateString() !== today.toDateString()) {
      leaderboard.currentStreak = 1;
    }
  }

  /**
   * Enqueue leaderboard rank recalculation
   */
  static enqueueRankRecalculation(leaderboardType) {
    // In a real app, this would push to a Redis queue or similar.
    // For now, we'll use a debounce-like mechanism or just a backgrounded call
    // to simulate non-blocking behavior for the main request.
    setImmediate(() => {
      this.recalculateLeaderboardRanks(leaderboardType).catch(err => 
        logger.error('Background rank recalculation error:', err)
      );
    });
  }

  /**
   * Add points for completing milestones
   */
  static async addPoints(userId, points, _action) {
    try {
      let leaderboard = await Leaderboard.findOne({ user: userId, leaderboardType: 'global' });

      if (!leaderboard) {
        leaderboard = new Leaderboard({
          user: userId,
          leaderboardType: 'global',
          totalPoints: 0,
          currentStreak: 0,
          longestStreak: 0,
        });
      }

      this._updateStreakInternal(leaderboard);

      leaderboard.totalPoints = (leaderboard.totalPoints || 0) + points;
      leaderboard.lastActivityAt = new Date();
      await leaderboard.save();

      return leaderboard;
    } catch (error) {
      logger.error('Error adding points:', error);
    }
  }

  /**
   * Recalculate leaderboard ranks based on XP
   */
  static async recalculateLeaderboardRanks(leaderboardType = 'global') {
    try {
      const topUsers = await Leaderboard.find({ leaderboardType })
        .sort({ totalXp: -1, lastActivityAt: 1 })
        .select('_id');

      const bulkOps = topUsers.map((user, index) => ({
        updateOne: {
          filter: { _id: user._id },
          update: { $set: { rank: index + 1 } },
        },
      }));

      if (bulkOps.length > 0) {
        await Leaderboard.bulkWrite(bulkOps);
      }
    } catch (error) {
      logger.error('Error recalculating ranks:', error);
    }
  }

  /**
   * Award an achievement to a user
   */
  static async awardAchievement(userId, achievementId) {
    try {
      const existing = await UserAchievement.findOne({
        user: userId,
        achievement: achievementId,
      });

      if (existing) return existing;

      const userAchievement = await UserAchievement.create({
        user: userId,
        achievement: achievementId,
        awardedAt: new Date(),
      });

      // Get achievement detail for XP
      const achievement = await Achievement.findById(achievementId);
      if (achievement) {
        await this.addXp(userId, achievement.xpReward);
      }

      return userAchievement;
    } catch (error) {
      logger.error('Error awarding achievement:', error);
    }
  }

  /**
   * Check for course completion achievements
   */
  static async checkCourseCompletionAchievements(_userId, _courseId) {
    // Logic to check if user completed their first course, etc.
    // Placeholder for extension
  }

  /**
   * Get user's current rank and global stats
   */
  static async getUserRank(userId) {
    return Leaderboard.findOne({ user: userId, leaderboardType: 'global' });
  }

  /**
   * Get top users for leaderboard
   */
  static async getLeaderboard(limit = 10, type = 'global') {
    return Leaderboard.find({ leaderboardType: type })
      .sort({ rank: 1 })
      .limit(limit)
      .populate('user', 'name avatar');
  }

  /**
   * Get user's complete gamification summary
   */
  static async getUserGamificationStats(userId) {
    try {
      const achievements = await UserAchievement.countDocuments({ user: userId });
      const leaderboard = await Leaderboard.findOne({
        user: userId,
        leaderboardType: 'global',
      }).lean();

      return {
        totalAchievements: achievements,
        totalXp: leaderboard?.totalXp || 0,
        totalPoints: leaderboard?.totalPoints || 0,
        currentStreak: leaderboard?.currentStreak || 0,
        longestStreak: leaderboard?.longestStreak || 0,
        rank: leaderboard?.rank || 0,
      };
    } catch (error) {
      logger.error('Error getting gamification stats:', error);
      throw error;
    }
  }
}

module.exports = GamificationService;
