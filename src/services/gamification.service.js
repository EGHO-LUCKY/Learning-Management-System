const {
  UserAchievement, Leaderboard,
} = require('../models/index');
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
      const leaderboard = await Leaderboard.findOneAndUpdate(
        { user: userId, leaderboardType },
        {
          $inc: { totalXp: xp },
          lastActivityAt: new Date(),
        },
        { upsert: true, new: true }
      );

      // Recalculate rank
      await this.recalculateLeaderboardRanks(leaderboardType);

      return leaderboard;
    } catch (error) {
      logger.error('Error adding XP:', error);
    }
  }

  /**
   * Add points for completing milestones
   */
  static async addPoints(userId, points, _action) {
    try {
      const leaderboard = await Leaderboard.findOneAndUpdate(
        { user: userId, leaderboardType: 'global' },
        {
          $inc: { totalPoints: points },
          lastActivityAt: new Date(),
        },
        { upsert: true, new: true }
      );

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
      const achievement = await require('../models/Achievement.model').findById(
        achievementId
      );
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
   * Update user's daily streak
   */
  static async updateDailyStreak(userId) {
    try {
      const leaderboard = await Leaderboard.findOne({
        user: userId,
        leaderboardType: 'global',
      });

      if (!leaderboard) return;

      const lastActivity = leaderboard.lastActivityAt;
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      if (
        lastActivity &&
        lastActivity.toDateString() === yesterday.toDateString()
      ) {
        leaderboard.currentStreak += 1;
        if (leaderboard.currentStreak > leaderboard.longestStreak) {
          leaderboard.longestStreak = leaderboard.currentStreak;
        }
      } else if (
        !lastActivity ||
        lastActivity.toDateString() !== today.toDateString()
      ) {
        leaderboard.currentStreak = 1;
      }

      leaderboard.lastActivityAt = today;
      await leaderboard.save();
    } catch (error) {
      logger.error('Error updating daily streak:', error);
    }
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

      await UserAchievement.find({ user: userId })
        .populate('achievement', 'xpReward')
        .lean();

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
