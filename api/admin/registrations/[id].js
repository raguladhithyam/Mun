const { 
  getDocument, 
  deleteDocument, 
  COLLECTIONS 
} = require('../../utils/firebase');
const { deleteFromCloudinary, getPublicIdFromUrl } = require('../../utils/cloudinaryUploader');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow DELETE requests
  if (req.method !== 'DELETE') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Registration ID is required'
      });
    }

    // Get registration to access file URLs
    const registration = await getDocument(COLLECTIONS.REGISTRATIONS, id);
    
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    // Delete associated files from Cloudinary
    if (registration.files) {
      try {
        await deleteRegistrationFiles(registration.files);
      } catch (fileDeleteError) {
        console.error('File deletion error:', fileDeleteError);
        // Continue with registration deletion even if file deletion fails
      }
    }

    // Delete registration from Firestore
    await deleteDocument(COLLECTIONS.REGISTRATIONS, id);

    res.json({
      success: true,
      message: 'Registration deleted successfully'
    });

  } catch (error) {
    console.error('Delete registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete registration'
    });
  }
};

// Helper function to delete registration files
async function deleteRegistrationFiles(files) {
  if (!files || typeof files !== 'object') return;
  
  const deletePromises = Object.values(files).map(async (fileUrl) => {
    if (typeof fileUrl === 'string') {
      const publicId = getPublicIdFromUrl(fileUrl);
      if (publicId) {
        try {
          await deleteFromCloudinary(publicId);
        } catch (error) {
          console.error('Error deleting file:', error);
        }
      }
    }
  });
  
  await Promise.all(deletePromises);
} 