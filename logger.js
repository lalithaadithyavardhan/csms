const Log = require('../models/Log');

/**
 * Create a log entry
 */
const createLog = async (userId, userName, userEmail, action, details = {}, req = null) => {
  try {
    const logData = {
      userId,
      userName,
      userEmail,
      action,
      details,
    };

    // Extract IP and User Agent if request object is provided
    if (req) {
      logData.ipAddress = req.ip || req.connection.remoteAddress || '';
      logData.userAgent = req.get('user-agent') || '';
    }

    const log = new Log(logData);
    await log.save();
    
    return log;
  } catch (error) {
    console.error('Error creating log:', error);
    // Don't throw error to prevent breaking main functionality
    return null;
  }
};

/**
 * Get logs for a specific user
 */
const getUserLogs = async (userId, limit = 50) => {
  try {
    return await Log.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit);
  } catch (error) {
    console.error('Error fetching user logs:', error);
    return [];
  }
};

/**
 * Get recent logs (admin function)
 */
const getRecentLogs = async (limit = 100, action = null) => {
  try {
    const query = action ? { action } : {};
    return await Log.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('userId', 'name email role');
  } catch (error) {
    console.error('Error fetching recent logs:', error);
    return [];
  }
};

module.exports = {
  createLog,
  getUserLogs,
  getRecentLogs,
};
