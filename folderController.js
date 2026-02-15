const Folder = require('../models/Folder');
const User = require('../models/User');
const { createLog } = require('../utils/logger');
const {
  createFolder,
  setFolderPermissions,
  deleteFolder,
  checkFolderExists,
} = require('../services/driveService');

/**
 * @desc    Create new folder
 * @route   POST /api/folders
 * @access  Private (Faculty only)
 */
const createNewFolder = async (req, res) => {
  try {
    const { department, semester, subject, permissions, description } = req.body;

    // Get faculty user with tokens
    const faculty = await User.findById(req.user._id);

    if (!faculty.googleTokens || !faculty.googleTokens.accessToken) {
      return res.status(400).json({
        success: false,
        message: 'Google Drive not connected. Please reconnect your account.',
      });
    }

    // Create folder name
    const folderName = `${department}_SEM${semester}_${subject}`;

    // Create folder in Google Drive
    const driveFolder = await createFolder(
      folderName,
      faculty.googleTokens.accessToken,
      faculty.googleTokens.refreshToken
    );

    // Set folder permissions
    await setFolderPermissions(
      driveFolder.id,
      permissions || 'view',
      faculty.googleTokens.accessToken,
      faculty.googleTokens.refreshToken
    );

    // Save folder metadata to database
    const folder = new Folder({
      facultyId: faculty._id,
      facultyName: faculty.name,
      facultyEmail: faculty.email,
      department,
      semester,
      subject,
      driveFolderId: driveFolder.id,
      driveFolderLink: driveFolder.link,
      permissions: permissions || 'view',
      description: description || '',
    });

    await folder.save();

    // Create log entry
    await createLog(
      faculty._id,
      faculty.name,
      faculty.email,
      'create_folder',
      {
        folderId: folder._id,
        department,
        semester,
        subject,
      },
      req
    );

    res.status(201).json({
      success: true,
      message: 'Folder created successfully',
      data: folder,
    });
  } catch (error) {
    console.error('Create folder error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating folder',
      error: error.message,
    });
  }
};

/**
 * @desc    Get all folders created by faculty
 * @route   GET /api/folders/my-folders
 * @access  Private (Faculty only)
 */
const getMyFolders = async (req, res) => {
  try {
    const folders = await Folder.find({
      facultyId: req.user._id,
      isActive: true,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: folders.length,
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
 * @desc    Delete folder
 * @route   DELETE /api/folders/:id
 * @access  Private (Faculty only)
 */
const deleteFolderById = async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id);

    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found',
      });
    }

    // Check if user is the owner
    if (folder.facultyId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this folder',
      });
    }

    // Get faculty with tokens
    const faculty = await User.findById(req.user._id);

    // Delete from Google Drive
    try {
      await deleteFolder(
        folder.driveFolderId,
        faculty.googleTokens.accessToken,
        faculty.googleTokens.refreshToken
      );
    } catch (error) {
      console.error('Error deleting from Drive:', error);
      // Continue even if Drive deletion fails
    }

    // Mark as inactive instead of deleting
    folder.isActive = false;
    await folder.save();

    // Create log entry
    await createLog(
      faculty._id,
      faculty.name,
      faculty.email,
      'delete_folder',
      {
        folderId: folder._id,
        subject: folder.subject,
      },
      req
    );

    res.status(200).json({
      success: true,
      message: 'Folder deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting folder',
      error: error.message,
    });
  }
};

/**
 * @desc    Update folder details
 * @route   PUT /api/folders/:id
 * @access  Private (Faculty only)
 */
const updateFolder = async (req, res) => {
  try {
    const { subject, permissions, description } = req.body;

    const folder = await Folder.findById(req.params.id);

    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found',
      });
    }

    // Check if user is the owner
    if (folder.facultyId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this folder',
      });
    }

    // Update fields
    if (subject) folder.subject = subject;
    if (description !== undefined) folder.description = description;
    
    // Update permissions if changed
    if (permissions && permissions !== folder.permissions) {
      const faculty = await User.findById(req.user._id);
      
      await setFolderPermissions(
        folder.driveFolderId,
        permissions,
        faculty.googleTokens.accessToken,
        faculty.googleTokens.refreshToken
      );
      
      folder.permissions = permissions;
    }

    await folder.save();

    res.status(200).json({
      success: true,
      message: 'Folder updated successfully',
      data: folder,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating folder',
      error: error.message,
    });
  }
};

/**
 * @desc    Get folder statistics for faculty
 * @route   GET /api/folders/stats
 * @access  Private (Faculty only)
 */
const getFolderStats = async (req, res) => {
  try {
    const stats = await Folder.aggregate([
      {
        $match: {
          facultyId: req.user._id,
          isActive: true,
        },
      },
      {
        $group: {
          _id: null,
          totalFolders: { $sum: 1 },
          totalViews: { $sum: '$viewCount' },
          departments: { $addToSet: '$department' },
        },
      },
    ]);

    const recentViews = await Folder.find({
      facultyId: req.user._id,
      isActive: true,
      lastAccessed: { $ne: null },
    })
      .sort({ lastAccessed: -1 })
      .limit(10)
      .select('subject department semester viewCount lastAccessed');

    res.status(200).json({
      success: true,
      data: {
        overview: stats[0] || { totalFolders: 0, totalViews: 0, departments: [] },
        recentViews,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message,
    });
  }
};

module.exports = {
  createNewFolder,
  getMyFolders,
  deleteFolderById,
  updateFolder,
  getFolderStats,
};
