const Folder = require('../models/Folder');
const User = require('../models/User');
const CryptoJS = require('crypto-js');
const { createLog } = require('../utils/logger');

/**
 * @desc    Verify department code
 * @route   POST /api/students/verify-code
 * @access  Private (Student only)
 */
const verifyDepartmentCode = async (req, res) => {
  try {
    const { departmentCode, department } = req.body;

    // Find faculty with matching department
    const faculties = await User.find({
      role: 'faculty',
      department,
      isActive: true,
    });

    if (faculties.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No faculty found for this department',
      });
    }

    // Check if any faculty has this department code
    let isValid = false;
    for (const faculty of faculties) {
      try {
        const decryptedCode = faculty.getDecryptedDepartmentCode();
        if (decryptedCode === departmentCode) {
          isValid = true;
          break;
        }
      } catch (error) {
        continue;
      }
    }

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid department code',
      });
    }

    // Update student's department if not set
    if (!req.user.department || req.user.department === '') {
      const student = await User.findById(req.user._id);
      student.department = department;
      await student.save();
    }

    res.status(200).json({
      success: true,
      message: 'Department code verified successfully',
      department,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error verifying department code',
      error: error.message,
    });
  }
};

/**
 * @desc    Get materials by department
 * @route   GET /api/students/materials
 * @access  Private (Student only)
 */
const getMaterials = async (req, res) => {
  try {
    const { department, semester, faculty, search } = req.query;

    // Build query
    const query = { isActive: true };

    if (department) {
      query.department = department;
    }

    if (semester) {
      query.semester = parseInt(semester);
    }

    if (faculty) {
      query.facultyName = { $regex: faculty, $options: 'i' };
    }

    if (search) {
      query.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const folders = await Folder.find(query)
      .sort({ createdAt: -1 })
      .select('-__v')
      .lean();

    res.status(200).json({
      success: true,
      count: folders.length,
      data: folders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching materials',
      error: error.message,
    });
  }
};

/**
 * @desc    Access folder (increment view count)
 * @route   POST /api/students/access/:folderId
 * @access  Private (Student only)
 */
const accessFolder = async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.folderId);

    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found',
      });
    }

    if (!folder.isActive) {
      return res.status(400).json({
        success: false,
        message: 'This folder is no longer available',
      });
    }

    // Increment view count
    await folder.incrementViewCount();

    // Create log entry
    await createLog(
      req.user._id,
      req.user.name,
      req.user.email,
      'view_folder',
      {
        folderId: folder._id,
        subject: folder.subject,
        department: folder.department,
        semester: folder.semester,
      },
      req
    );

    res.status(200).json({
      success: true,
      message: 'Folder accessed',
      data: {
        link: folder.driveFolderLink,
        subject: folder.subject,
        facultyName: folder.facultyName,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error accessing folder',
      error: error.message,
    });
  }
};

/**
 * @desc    Get available departments
 * @route   GET /api/students/departments
 * @access  Private (Student only)
 */
const getDepartments = async (req, res) => {
  try {
    const departments = await Folder.distinct('department', { isActive: true });

    res.status(200).json({
      success: true,
      data: departments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching departments',
      error: error.message,
    });
  }
};

/**
 * @desc    Get all faculty for a department
 * @route   GET /api/students/faculty
 * @access  Private (Student only)
 */
const getFacultyList = async (req, res) => {
  try {
    const { department } = req.query;

    const query = { isActive: true };
    if (department) {
      query.department = department;
    }

    const facultyList = await Folder.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$facultyId',
          facultyName: { $first: '$facultyName' },
          facultyEmail: { $first: '$facultyEmail' },
          department: { $first: '$department' },
          totalFolders: { $sum: 1 },
        },
      },
      { $sort: { facultyName: 1 } },
    ]);

    res.status(200).json({
      success: true,
      count: facultyList.length,
      data: facultyList,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching faculty list',
      error: error.message,
    });
  }
};

/**
 * @desc    Get materials by semester
 * @route   GET /api/students/semesters/:department
 * @access  Private (Student only)
 */
const getSemesterMaterials = async (req, res) => {
  try {
    const { department } = req.params;

    const materials = await Folder.aggregate([
      {
        $match: {
          department,
          isActive: true,
        },
      },
      {
        $group: {
          _id: '$semester',
          subjects: {
            $push: {
              id: '$_id',
              subject: '$subject',
              facultyName: '$facultyName',
              viewCount: '$viewCount',
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: materials,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching semester materials',
      error: error.message,
    });
  }
};

module.exports = {
  verifyDepartmentCode,
  getMaterials,
  accessFolder,
  getDepartments,
  getFacultyList,
  getSemesterMaterials,
};
