const express = require('express');
const router = express.Router();
const {
  createNewFolder,
  getMyFolders,
  deleteFolderById,
  updateFolder,
  getFolderStats,
} = require('../controllers/folderController');
const { protect, isFaculty } = require('../middleware/auth');
const { validateFolderCreation } = require('../middleware/validation');

// All routes require authentication and faculty role
router.use(protect, isFaculty);

router.route('/')
  .post(validateFolderCreation, createNewFolder);

router.get('/my-folders', getMyFolders);
router.get('/stats', getFolderStats);

router.route('/:id')
  .put(updateFolder)
  .delete(deleteFolderById);

module.exports = router;
