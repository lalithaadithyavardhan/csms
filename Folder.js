const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema({
  facultyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  facultyName: {
    type: String,
    required: true,
  },
  facultyEmail: {
    type: String,
    required: true,
  },
  department: {
    type: String,
    required: true,
    enum: ['CSE', 'ECE', 'MECH', 'CIVIL', 'EEE', 'IT', 'CHEM', 'BIOTECH'],
  },
  semester: {
    type: Number,
    required: true,
    min: 1,
    max: 8,
  },
  subject: {
    type: String,
    required: true,
    trim: true,
  },
  driveFolderId: {
    type: String,
    required: true,
    unique: true,
  },
  driveFolderLink: {
    type: String,
    required: true,
  },
  permissions: {
    type: String,
    enum: ['view', 'comment', 'edit'],
    default: 'view',
  },
  description: {
    type: String,
    default: '',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  viewCount: {
    type: Number,
    default: 0,
  },
  lastAccessed: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

// Indexes for efficient queries
folderSchema.index({ facultyId: 1 });
folderSchema.index({ department: 1, semester: 1 });
folderSchema.index({ subject: 'text' });
folderSchema.index({ driveFolderId: 1 });
folderSchema.index({ isActive: 1 });

// Method to increment view count
folderSchema.methods.incrementViewCount = async function() {
  this.viewCount += 1;
  this.lastAccessed = new Date();
  await this.save();
};

// Static method to get popular subjects
folderSchema.statics.getPopularSubjects = async function(limit = 10) {
  return this.aggregate([
    { $match: { isActive: true } },
    { $group: {
      _id: '$subject',
      totalViews: { $sum: '$viewCount' },
      folderCount: { $sum: 1 },
    }},
    { $sort: { totalViews: -1 } },
    { $limit: limit },
  ]);
};

// Static method to get active faculty
folderSchema.statics.getActiveFaculty = async function(limit = 10) {
  return this.aggregate([
    { $match: { isActive: true } },
    { $group: {
      _id: '$facultyId',
      facultyName: { $first: '$facultyName' },
      totalFolders: { $sum: 1 },
      totalViews: { $sum: '$viewCount' },
    }},
    { $sort: { totalViews: -1 } },
    { $limit: limit },
  ]);
};

module.exports = mongoose.model('Folder', folderSchema);
