const { google } = require('googleapis');
const { oauth2Client } = require('../config/googleAuth');

/**
 * Create a folder in Google Drive
 */
const createFolder = async (folderName, accessToken, refreshToken) => {
  try {
    // Set credentials
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const fileMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    };

    const folder = await drive.files.create({
      resource: fileMetadata,
      fields: 'id, name, webViewLink',
    });

    return {
      id: folder.data.id,
      name: folder.data.name,
      link: folder.data.webViewLink,
    };
  } catch (error) {
    console.error('Error creating folder:', error);
    throw new Error('Failed to create folder in Google Drive');
  }
};

/**
 * Set folder permissions
 */
const setFolderPermissions = async (folderId, permission, accessToken, refreshToken) => {
  try {
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Permission mapping
    const permissionMap = {
      view: 'reader',
      comment: 'commenter',
      edit: 'writer',
    };

    const permissionResource = {
      type: 'anyone',
      role: permissionMap[permission] || 'reader',
    };

    await drive.permissions.create({
      fileId: folderId,
      resource: permissionResource,
    });

    return true;
  } catch (error) {
    console.error('Error setting permissions:', error);
    throw new Error('Failed to set folder permissions');
  }
};

/**
 * Delete a folder from Google Drive
 */
const deleteFolder = async (folderId, accessToken, refreshToken) => {
  try {
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    await drive.files.delete({
      fileId: folderId,
    });

    return true;
  } catch (error) {
    console.error('Error deleting folder:', error);
    throw new Error('Failed to delete folder from Google Drive');
  }
};

/**
 * Check if folder exists
 */
const checkFolderExists = async (folderId, accessToken, refreshToken) => {
  try {
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const response = await drive.files.get({
      fileId: folderId,
      fields: 'id, name, trashed',
    });

    return !response.data.trashed;
  } catch (error) {
    if (error.code === 404) {
      return false;
    }
    console.error('Error checking folder:', error);
    return false;
  }
};

/**
 * Get folder details
 */
const getFolderDetails = async (folderId, accessToken, refreshToken) => {
  try {
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const response = await drive.files.get({
      fileId: folderId,
      fields: 'id, name, webViewLink, createdTime, modifiedTime',
    });

    return response.data;
  } catch (error) {
    console.error('Error getting folder details:', error);
    throw new Error('Failed to get folder details');
  }
};

module.exports = {
  createFolder,
  setFolderPermissions,
  deleteFolder,
  checkFolderExists,
  getFolderDetails,
};
