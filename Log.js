const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  userName: {
    type: String,
    required: true,
  },
  userEmail: {
    type: String,
    required: true,
  },
  action: {
    type: String,
    required: true,
    enum: [
      'login',
      'logout',
      'create_folder',
      'delete_folder',
      'view_folder',
      'update_profile',
      'change_role',
      'deactivate_user',
      'activate_user',
      'update_department_code',
    ],
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  ipAddress: {
    type: String,
    default: '',
  },
  userAgent: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
});

// Indexes for efficient queries
logSchema.index({ userId: 1, createdAt: -1 });
logSchema.index({ action: 1, createdAt: -1 });
logSchema.index({ createdAt: -1 });

// Static method to get daily active users
logSchema.statics.getDailyActiveUsers = async function(days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        action: 'login',
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
        },
        uniqueUsers: { $addToSet: '$userId' },
      },
    },
    {
      $project: {
        date: '$_id',
        count: { $size: '$uniqueUsers' },
      },
    },
    { $sort: { date: 1 } },
  ]);
};

// Static method to get action statistics
logSchema.statics.getActionStatistics = async function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);
};

// Static method to get user login history
logSchema.statics.getUserLoginHistory = async function(userId, limit = 10) {
  return this.find({
    userId,
    action: 'login',
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('createdAt ipAddress userAgent');
};

module.exports = mongoose.model('Log', logSchema);
