const express = require('express');
const router = express.Router();
const {
  verifyDepartmentCode,
  getMaterials,
  accessFolder,
  getDepartments,
  getFacultyList,
  getSemesterMaterials,
} = require('../controllers/studentController');
const { protect, isStudent } = require('../middleware/auth');
const { validateDepartmentCode } = require('../middleware/validation');

// All routes require authentication and student role
router.use(protect, isStudent);

router.post('/verify-code', validateDepartmentCode, verifyDepartmentCode);
router.get('/materials', getMaterials);
router.post('/access/:folderId', accessFolder);
router.get('/departments', getDepartments);
router.get('/faculty', getFacultyList);
router.get('/semesters/:department', getSemesterMaterials);

module.exports = router;
