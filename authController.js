const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const { createLog } = require('../utils/logger');
const {
  getAuthUrl,
  getTokens,
  getUserInfo,
  refreshAccessToken,
} = require('../config/googleAuth');

/**
 * @desc    Get Google OAuth URL
 * @route   GET /api/auth/google
 * @access  Public
 */
const getGoogleAuthURL = async (req, res) => {
  try {
    const url = getAuthUrl();
    
    res.status(200).json({
      success: true,
      url,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error generating authentication URL',
      error: error.message,
    });
  }
};

/**
 * @desc    Google OAuth Callback
 * @route   GET /api/auth/google/callback
 * @access  Public
 */
const googleCallback = async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Authorization code not provided',
      });
    }

    // Get tokens from Google
    const tokens = await getTokens(code);

    // Get user info from Google
    const userInfo = await getUserInfo(tokens.access_token);

    // Check if user exists
    let user = await User.findOne({ email: userInfo.email });

    if (user) {
      // Update existing user
      user.googleTokens = {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || user.googleTokens.refreshToken,
        expiryDate: tokens.expiry_date,
      };
      user.lastLogin = new Date();
      user.profilePicture = userInfo.picture || user.profilePicture;
      
      await user.save();
    } else {
      // Create new user
      user = new User({
        name: userInfo.name,
        email: userInfo.email,
        googleId: userInfo.id,
        profilePicture: userInfo.picture || '',
        role: userInfo.email === process.env.ADMIN_EMAIL ? 'admin' : 'student',
        googleTokens: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiryDate: tokens.expiry_date,
        },
      });

      await user.save();
    }

    // Create log entry
    await createLog(
      user._id,
      user.name,
      user.email,
      'login',
      { method: 'google_oauth' },
      req
    );

    // Generate JWT token
    const jwtToken = generateToken(user._id, user.email, user.role);

    // Redirect to frontend with token
    const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?token=${jwtToken}&role=${user.role}`;
    res.redirect(redirectUrl);

  } catch (error) {
    console.error('Google callback error:', error);
    const errorUrl = `${process.env.FRONTEND_URL}/auth/error?message=${encodeURIComponent(error.message)}`;
    res.redirect(errorUrl);
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-googleTokens');

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user profile',
      error: error.message,
    });
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateProfile = async (req, res) => {
  try {
    const { name, department } = req.body;

    const user = await User.findById(req.user._id);

    if (name) user.name = name;
    if (department) user.department = department;

    await user.save();

    // Create log entry
    await createLog(
      user._id,
      user.name,
      user.email,
      'update_profile',
      { updatedFields: Object.keys(req.body) },
      req
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message,
    });
  }
};

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = async (req, res) => {
  try {
    // Create log entry
    await createLog(
      req.user._id,
      req.user.name,
      req.user.email,
      'logout',
      {},
      req
    );

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error logging out',
      error: error.message,
    });
  }
};

/**
 * @desc    Refresh Google access token
 * @route   POST /api/auth/refresh-token
 * @access  Private (Faculty only)
 */
const refreshGoogleToken = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user.googleTokens.refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'No refresh token available. Please re-authenticate.',
      });
    }

    const newTokens = await refreshAccessToken(user.googleTokens.refreshToken);

    user.googleTokens.accessToken = newTokens.access_token;
    user.googleTokens.expiryDate = newTokens.expiry_date;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error refreshing token',
      error: error.message,
    });
  }
};

module.exports = {
  getGoogleAuthURL,
  googleCallback,
  getMe,
  updateProfile,
  logout,
  refreshGoogleToken,
};
