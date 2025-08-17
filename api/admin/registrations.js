const { 
  getDocument, 
  updateDocument, 
  deleteDocument,
  COLLECTIONS 
} = require('../utils/firebase');
const { deleteFromCloudinary, getPublicIdFromUrl } = require('../utils/cloudinaryUploader');

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

  try {
    // Extract registration ID from URL
    const urlParts = req.url.split('/');
    const registrationId = urlParts[urlParts.length - 1];
    
    console.log(`🔍 Registration operation: ${req.method} for ID: ${registrationId}`);
    console.log(`📍 Request URL: ${req.url}`);
    console.log(`🛣️ Request path: ${req.path}`);

    if (!registrationId) {
      return res.status(400).json({
        success: false,
        message: 'Registration ID is required'
      });
    }

    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        return await handleGetRegistration(req, res, registrationId);
      case 'PUT':
        return await handleUpdateRegistration(req, res, registrationId);
      case 'DELETE':
        return await handleDeleteRegistration(req, res, registrationId);
      default:
        return res.status(405).json({
          success: false,
          message: 'Method not allowed'
        });
    }

  } catch (error) {
    console.error('Registration operation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
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

// GET registration
async function handleGetRegistration(req, res, id) {
  try {
    const registration = await getDocument(COLLECTIONS.REGISTRATIONS, id);

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    res.json({
      success: true,
      data: registration
    });

  } catch (error) {
    console.error('Get registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch registration'
    });
  }
}

// UPDATE registration
async function handleUpdateRegistration(req, res, id) {
  try {
    const updateData = req.body;

    // Remove fields that shouldn't be updated
    delete updateData.id;
    delete updateData.submittedAt;
    delete updateData.createdAt;

    // Validate email if being updated
    if (updateData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updateData.email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format'
        });
      }
      updateData.email = updateData.email.toLowerCase();
    }

    // Validate numeric fields if being updated
    const numericFields = ['munsParticipated', 'munsWithAwards', 'munsChaired', 'year'];
    for (const field of numericFields) {
      if (updateData[field] !== undefined) {
        const value = parseInt(updateData[field]);
        if (isNaN(value) || value < 0) {
          return res.status(400).json({
            success: false,
            message: `${field} must be a non-negative number`
          });
        }
        updateData[field] = value;
      }
    }

    const success = await updateDocument(COLLECTIONS.REGISTRATIONS, id, updateData);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    res.json({
      success: true,
      message: 'Registration updated successfully'
    });

  } catch (error) {
    console.error('Update registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update registration'
    });
  }
}

// DELETE registration
async function handleDeleteRegistration(req, res, id) {
  try {
    console.log(`🗑️ DELETE registration request for ID: ${id}`);

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
} 