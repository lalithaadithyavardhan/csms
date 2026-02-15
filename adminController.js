const User = require('../models/User');
const Folder = require('../models/Folder');
const Log = require('../models/Log');
const { createLog } = require('../utils/logger');
const CryptoJS = require('crypto-js');

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/admin/stats
 * @access  Private (Admin only)
 */
const getDashboardStats = async (req, res) => {
  try {
    // Total users by role
    const totalUsers = await User.countDocuments({ isActive: true });
    const totalFaculty = await User.countDocuments({ role: 'faculty', isActive: true });
    const totalStudents = await User.countDocuments({ role: 'student', isActive: true });
    const totalAdmins = await User.countDocuments({ role: 'admin', isActive: true });

    // Total departments
    const departments = await Folder.distinct('department', { isActive: true });
    const totalDepartments = departments.length;

    // Total materials
    const totalMaterials = await Folder.countDocuments({ isActive: true });

    // Most accessed subjects
    const popularSubjects = await Folder.getPopularSubjects(10);

    // Most active faculty
    const activeFaculty = await Folder.getActiveFaculty(10);

    // Daily active users (last 7 days)
    const dailyActiveUsers = await Log.getDailyActiveUsers(7);

    // Recent activities
    const recentActivities = await Log.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .select('userName userEmail action details createdAt')
      .lean();

    // Department-wise distribution
    const departmentDistribution = await Folder.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$department',
          totalFolders: { $sum: 1 },
          totalViews: { $sum: '$viewCount' },
        },
      },
      { $sort: { totalFolders: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalFaculty,
          totalStudents,
          totalAdmins,
          totalDepartments,
          totalMaterials,
        },
        popularSubjects,
        activeFaculty,
        dailyActiveUsers,
        recentActivities,
        departmentDistribution,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics',
      error: error.message,
    });
  }
};

/**
 * @desc    Get all users
 * @route   GET /api/admin/users
 * @access  Private (Admin only)
 */
const getAllUsers = async (req, res) => {
  try {
    const { role, department, isActive, search, page = 1, limit = 50 } = req.query;

    const query = {};

    if (role) query.role = role;
    if (department) query.department = department;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .select('-googleTokens -departmentCode')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message,
    });
  }
};

/**
 * @desc    Change user role
 * @route   PUT /api/admin/users/:id/role
 * @access  Private (Admin only)
 */
const changeUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Prevent changing own role
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change your own role',
      });
    }

    const oldRole = user.role;
    user.role = role;
    await user.save();

    // Create log entry
    await createLog(
      req.user._id,
      req.user.name,
      req.user.email,
      'change_role',
      {
        targetUserId: user._id,
        targetUserName: user.name,
        oldRole,
        newRole: role,
      },
      req
    );

    res.status(200).json({
      success: true,
      message: 'User role updated successfully',
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error changing user role',
      error: error.message,
    });
  }
};

/**
 * @desc    Deactivate user account
 * @route   PUT /api/admin/users/:id/deactivate
 * @access  Private (Admin only)
 */
const deactivateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Prevent deactivating own account
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate your own account',
      });
    }

    user.isActive = false;
    await user.save();

    // Create log entry
    await createLog(
      req.user._id,
      req.user.name,
      req.user.email,
      'deactivate_user',
      {
        targetUserId: user._id,
        targetUserName: user.name,
        targetUserEmail: user.email,
      },
      req
    );

    res.status(200).json({
      success: true,
      message: 'User deactivated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deactivating user',
      error: error.message,
    });
  }
};

/**
 * @desc    Activate user account
 * @route   PUT /api/admin/users/:id/activate
 * @access  Private (Admin only)
 */
const activateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.isActive = true;
    await user.save();

    // Create log entry
    await createLog(
      req.user._id,
      req.user.name,
      req.user.email,
      'activate_user',
      {
        targetUserId: user._id,
        targetUserName: user.name,
        targetUserEmail: user.email,
      },
      req
    );

    res.status(200).json({
      success: true,
      message: 'User activated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error activating user',
      error: error.message,
    });
  }
};

/**
 * @desc    Update department code for faculty
 * @route   PUT /api/admin/faculty/:id/department-code
 * @access  Private (Admin only)
 */
const updateDepartmentCode = async (req, res) => {
  try {
    const { departmentCode } = req.body;
    const { id } = req.params;

    const faculty = await User.findById(id);

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Faculty not found',
      });
    }

    if (faculty.role !== 'faculty') {
      return res.status(400).json({
        success: false,
        message: 'User is not a faculty member',
      });
    }

    faculty.departmentCode = departmentCode;
    await faculty.save();

    // Create log entry
    await createLog(
      req.user._id,
      req.user.name,
      req.user.email,
      'update_department_code',
      {
        facultyId: faculty._id,
        facultyName: faculty.name,
      },
      req
    );

    res.status(200).json({
      success: true,
      message: 'Department code updated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating department code',
      error: error.message,
    });
  }
};

/**
 * @desc    Get all folders (admin view)
 * @route   GET /api/admin/folders
 * @access  Private (Admin only)
 */
const getAllFolders = async (req, res) => {
  try {
    const { department, semester, isActive, page = 1, limit = 50 } = req.query;

    const query = {};

    if (department) query.department = department;
    if (semester) query.semester = parseInt(semester);
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const folders = await Folder.find(query)
      .populate('facultyId', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await Folder.countDocuments(query);

    res.status(200).json({
      success: true,
      count: folders.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: folders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching folders',
      error: error.message,
    });
  }
};

/**
 * @desc    Get login history
 * @route   GET /api/admin/login-history
 * @access  Private (Admin only)
 */
const getLoginHistory = async (req, res) => {
  try {
    const { userId, limit = 50 } = req.query;

    const query = { action: 'login' };
    if (userId) query.userId = userId;

    const history = await Log.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('userName userEmail createdAt ipAddress userAgent')
      .lean();

    res.status(200).json({
      success: true,
      count: history.length,
      data: history,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching login history',
      error: error.message,
    });
  }
};

/**
 * @desc    Get system analytics
 * @route   GET /api/admin/analytics
 * @access  Private (Admin only)
 */
const getAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Action statistics
    const actionStats = await Log.getActionStatistics(start, end);

    // User growth
    const userGrowth = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Folder creation trend
    const folderTrend = await Folder.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        actionStats,
        userGrowth,
        folderTrend,
        dateRange: { start, end },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics',
      error: error.message,
    });
  }
};

module.exports = {
  getDashboardStats,
  getAllUsers,
  changeUserRole,
  deactivateUser,
  activateUser,
  updateDepartmentCode,
  getAllFolders,
  getLoginHistory,
  getAnalytics,
};
