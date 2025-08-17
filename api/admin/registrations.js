const { getCollection, getDocument, updateDocument, deleteDocument, COLLECTIONS } = require('../utils/firebase');
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

  // Debug: Log the request details
  console.log('📋 Registrations endpoint called:', req.method, req.url);
  
  // Extract registration ID from URL if present
  // For Vercel serverless functions with regex routing, the ID might be in the URL
  let registrationId = null;
  
  // Check if there's an ID in the URL path
  // Only treat as ID if the URL is not empty and not just '/'
  if (req.url && req.url !== '/' && req.url !== '') {
    const urlParts = req.url.split('/').filter(part => part.length > 0);
    console.log('📋 URL parts:', urlParts);
    
    // Only treat as ID if there are actual URL parts and it looks like an ID
    if (urlParts.length > 0) {
      const potentialId = urlParts[0];
      // Check if it looks like a Firebase document ID (alphanumeric, at least 10 chars)
      if (potentialId && potentialId.length >= 10 && /^[a-zA-Z0-9]+$/.test(potentialId)) {
        registrationId = potentialId;
      }
    }
  }
  
  console.log('📋 Registration ID:', registrationId);

  // Handle individual registration operations (GET, PUT, DELETE by ID)
  if (registrationId) {
    console.log('📋 Handling individual registration:', registrationId);
    return handleIndividualRegistration(req, res, registrationId);
  }

  // Handle collection operations (GET all registrations)
  if (req.method === 'GET') {
    console.log('📋 Handling GET all registrations');
    return handleGetAllRegistrations(req, res);
  }

  // Method not allowed for collection endpoint
  return res.status(405).json({
    success: false,
    message: 'Method not allowed'
  });
};

// Handle individual registration operations
async function handleIndividualRegistration(req, res, registrationId) {
  try {
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
    console.error(`Error handling registration ${registrationId}:`, error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

// Get specific registration
async function handleGetRegistration(req, res, registrationId) {
  try {
    const registration = await getDocument(COLLECTIONS.REGISTRATIONS, registrationId);
    
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    res.status(200).json({
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

// Update specific registration
async function handleUpdateRegistration(req, res, registrationId) {
  try {
    const updateData = req.body;
    
    // Get the current registration to handle file deletions
    const currentRegistration = await getDocument(COLLECTIONS.REGISTRATIONS, registrationId);
    if (!currentRegistration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    // Handle file deletions if files are being updated
    if (updateData.files && currentRegistration.files) {
      const currentFiles = currentRegistration.files;
      const newFiles = updateData.files;
      
      // Find files that were removed
      const removedFiles = Object.keys(currentFiles).filter(key => !newFiles[key]);
      
      // Delete removed files from Cloudinary
      for (const fileKey of removedFiles) {
        const fileUrl = currentFiles[fileKey];
        if (typeof fileUrl === 'string') {
          const publicId = getPublicIdFromUrl(fileUrl);
          if (publicId) {
            try {
              await deleteFromCloudinary(publicId);
              console.log(`Deleted file from Cloudinary: ${publicId}`);
            } catch (error) {
              console.error('Error deleting file from Cloudinary:', error);
            }
          }
        }
      }
    }

    // Update the registration
    await updateDocument(COLLECTIONS.REGISTRATIONS, registrationId, updateData);
    
    // Get the updated registration
    const updatedRegistration = await getDocument(COLLECTIONS.REGISTRATIONS, registrationId);

    res.status(200).json({
      success: true,
      data: updatedRegistration,
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

// Delete specific registration
async function handleDeleteRegistration(req, res, registrationId) {
  try {
    // Get the registration to handle file deletions
    const registration = await getDocument(COLLECTIONS.REGISTRATIONS, registrationId);
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    // Delete associated files from Cloudinary
    if (registration.files) {
      const deletePromises = Object.values(registration.files).map(async (fileUrl) => {
        if (typeof fileUrl === 'string') {
          const publicId = getPublicIdFromUrl(fileUrl);
          if (publicId) {
            try {
              await deleteFromCloudinary(publicId);
              console.log(`Deleted file from Cloudinary: ${publicId}`);
            } catch (error) {
              console.error('Error deleting file from Cloudinary:', error);
            }
          }
        }
      });
      
      await Promise.all(deletePromises);
    }

    // Delete the registration from Firestore
    await deleteDocument(COLLECTIONS.REGISTRATIONS, registrationId);

    res.status(200).json({
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

// Handle get all registrations (existing functionality)
async function handleGetAllRegistrations(req, res) {
  console.log('📋 handleGetAllRegistrations called');
  try {
    const { 
      page = 1, 
      limit = 50, 
      search, 
      committee, 
      position, 
      year,
      status 
    } = req.query;

    let registrations = await getCollection(COLLECTIONS.REGISTRATIONS, 'submittedAt', 'desc');

    // Apply filters
    if (search) {
      const searchTerm = search.toLowerCase();
      registrations = registrations.filter(reg => 
        reg.name.toLowerCase().includes(searchTerm) ||
        reg.email.toLowerCase().includes(searchTerm) ||
        reg.phone.includes(searchTerm) ||
        reg.college.toLowerCase().includes(searchTerm)
      );
    }

    if (committee) {
      registrations = registrations.filter(reg => {
        const committees = Array.isArray(reg.committees) 
          ? reg.committees 
          : JSON.parse(reg.committees || '[]');
        return committees.includes(committee);
      });
    }

    if (position) {
      registrations = registrations.filter(reg => {
        const positions = Array.isArray(reg.positions) 
          ? reg.positions 
          : JSON.parse(reg.positions || '[]');
        return positions.includes(position);
      });
    }

    if (year) {
      registrations = registrations.filter(reg => reg.year === year);
    }

    if (status) {
      registrations = registrations.filter(reg => reg.status === status);
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedRegistrations = registrations.slice(startIndex, endIndex);

    res.status(200).json({
      success: true,
      data: paginatedRegistrations,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(registrations.length / limit),
        totalRecords: registrations.length,
        hasNext: endIndex < registrations.length,
        hasPrev: startIndex > 0
      }
    });

  } catch (error) {
    console.error('Get registrations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch registrations',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
} 