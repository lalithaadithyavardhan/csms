const mongoose = require('mongoose');
const CryptoJS = require('crypto-js');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
  },
  googleId: {
    type: String,
    required: true,
    unique: true,
  },
  role: {
    type: String,
    enum: ['student', 'faculty', 'admin'],
    default: 'student',
  },
  department: {
    type: String,
    required: function() {
      return this.role === 'student' || this.role === 'faculty';
    },
    enum: ['CSE', 'ECE', 'MECH', 'CIVIL', 'EEE', 'IT', 'CHEM', 'BIOTECH', ''],
  },
  departmentCode: {
    type: String,
    required: function() {
      return this.role === 'faculty';
    },
  },
  profilePicture: {
    type: String,
    default: '',
  },
  googleTokens: {
    accessToken: String,
    refreshToken: String,
    expiryDate: Number,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastLogin: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Encrypt department code before saving
userSchema.pre('save', function(next) {
  if (this.isModified('departmentCode') && this.departmentCode) {
    this.departmentCode = CryptoJS.AES.encrypt(
      this.departmentCode,
      process.env.ENCRYPTION_KEY
    ).toString();
  }
  next();
});

// Method to decrypt department code
userSchema.methods.getDecryptedDepartmentCode = function() {
  if (!this.departmentCode) return null;
  
  const bytes = CryptoJS.AES.decrypt(this.departmentCode, process.env.ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

// Method to verify department code
userSchema.methods.verifyDepartmentCode = function(code) {
  const decryptedCode = this.getDecryptedDepartmentCode();
  return decryptedCode === code;
};

// Index for faster queries
userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 });
userSchema.index({ department: 1, role: 1 });

module.exports = mongoose.model('User', userSchema);
