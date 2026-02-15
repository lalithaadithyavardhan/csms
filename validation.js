const { body, validationResult } = require('express-validator');

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors: errors.array(),
    });
  }
  
  next();
};

/**
 * Validate folder creation
 */
const validateFolderCreation = [
  body('department')
    .trim()
    .notEmpty()
    .withMessage('Department is required')
    .isIn(['CSE', 'ECE', 'MECH', 'CIVIL', 'EEE', 'IT', 'CHEM', 'BIOTECH'])
    .withMessage('Invalid department'),
  
  body('semester')
    .isInt({ min: 1, max: 8 })
    .withMessage('Semester must be between 1 and 8'),
  
  body('subject')
    .trim()
    .notEmpty()
    .withMessage('Subject name is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Subject name must be between 3 and 100 characters'),
  
  body('permissions')
    .optional()
    .isIn(['view', 'comment', 'edit'])
    .withMessage('Invalid permission type'),
  
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  
  handleValidationErrors,
];

/**
 * Validate department code
 */
const validateDepartmentCode = [
  body('departmentCode')
    .trim()
    .notEmpty()
    .withMessage('Department code is required')
    .isLength({ min: 6, max: 20 })
    .withMessage('Department code must be between 6 and 20 characters'),
  
  handleValidationErrors,
];

/**
 * Validate user update
 */
const validateUserUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('department')
    .optional()
    .isIn(['CSE', 'ECE', 'MECH', 'CIVIL', 'EEE', 'IT', 'CHEM', 'BIOTECH', ''])
    .withMessage('Invalid department'),
  
  handleValidationErrors,
];

/**
 * Validate role change
 */
const validateRoleChange = [
  body('role')
    .isIn(['student', 'faculty', 'admin'])
    .withMessage('Invalid role'),
  
  handleValidationErrors,
];

module.exports = {
  validateFolderCreation,
  validateDepartmentCode,
  validateUserUpdate,
  validateRoleChange,
  handleValidationErrors,
};
