const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getAllUsers,
  changeUserRole,
  deactivateUser,
  activateUser,
  updateDepartmentCode,
  getAllFolders,
  getLoginHistory,
  getAnalytics,
} = require('../controllers/adminController');
const { protect, isAdmin } = require('../middleware/auth');
const { validateRoleChange, validateDepartmentCode } = require('../middleware/validation');

// All routes require authentication and admin role
router.use(protect, isAdmin);

router.get('/stats', getDashboardStats);
router.get('/users', getAllUsers);
router.get('/folders', getAllFolders);
router.get('/login-history', getLoginHistory);
router.get('/analytics', getAnalytics);

router.put('/users/:id/role', validateRoleChange, changeUserRole);
router.put('/users/:id/deactivate', deactivateUser);
router.put('/users/:id/activate', activateUser);
router.put('/faculty/:id/department-code', validateDepartmentCode, updateDepartmentCode);

module.exports = router;
