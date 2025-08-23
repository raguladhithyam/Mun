const { getCollection, getDocument, deleteDocument, updateDocument, COLLECTIONS } = require('../utils/firebase');

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

  // Handle DELETE requests for registration deletion
  if (req.method === 'DELETE') {
    try {
      // Extract ID from URL path - handle Vercel routing
      let id;
      
      // For Vercel routing, the ID is captured in the route pattern
      // The URL might be like "/ZFPfpfYmRHYATEkl8dsn" when routed
      const urlParts = req.url.split('/');
      id = urlParts[urlParts.length - 1];
      
      // If the last part is empty or doesn't look like an ID, try the second to last
      if (!id || id === '' || id === 'registrations') {
        id = urlParts[urlParts.length - 2];
      }
      
      // Additional fallback: try to extract from the full URL
      if (!id || id === 'registrations') {
        const fullUrl = req.url;
        const match = fullUrl.match(/([a-zA-Z0-9]{20,})/);
        if (match) {
          id = match[1];
        }
      }
      

      
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

      // Delete registration from database
      await deleteDocument(COLLECTIONS.REGISTRATIONS, id);
      
      res.status(200).json({
        success: true,
        message: 'Registration deleted successfully'
      });

    } catch (error) {
      console.error('Delete registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete registration',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
    return;
  }

  // Handle PUT requests for registration updates
  if (req.method === 'PUT') {
    try {
      // Extract ID from URL path - handle Vercel routing
      let id;
      
      // For Vercel routing, the ID is captured in the route pattern
      const urlParts = req.url.split('/');
      id = urlParts[urlParts.length - 1];
      
      // If the last part is empty or doesn't look like an ID, try the second to last
      if (!id || id === '' || id === 'registrations') {
        id = urlParts[urlParts.length - 2];
      }
      
      // Additional fallback: try to extract from the full URL
      if (!id || id === 'registrations') {
        const fullUrl = req.url;
        const match = fullUrl.match(/([a-zA-Z0-9]{20,})/);
        if (match) {
          id = match[1];
        }
      }
      

      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Registration ID is required'
        });
      }

      // Check if registration exists
      const existingRegistration = await getDocument(COLLECTIONS.REGISTRATIONS, id);
      
      if (!existingRegistration) {
        return res.status(404).json({
          success: false,
          message: 'Registration not found'
        });
      }

      // Validate required fields
      const requiredFields = ['name', 'email', 'phone', 'college', 'department', 'year'];
      for (const field of requiredFields) {
        if (!req.body[field] || req.body[field].toString().trim() === '') {
          return res.status(400).json({
            success: false,
            message: `${field} is required`
          });
        }
      }

      // Validate committees and positions
      if (!req.body.committees || req.body.committees.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one committee is required'
        });
      }

      if (!req.body.positions || req.body.positions.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one position is required'
        });
      }

      // Prepare update data
      const updateData = {
        name: req.body.name.trim(),
        email: req.body.email.trim().toLowerCase(),
        phone: req.body.phone.trim(),
        college: req.body.college.trim(),
        department: req.body.department.trim(),
        year: parseInt(req.body.year),
        committees: req.body.committees,
        positions: req.body.positions,
        munsParticipated: parseInt(req.body.munsParticipated) || 0,
        munsWithAwards: parseInt(req.body.munsWithAwards) || 0,
        munsChaired: parseInt(req.body.munsChaired) || 0,
        experience: req.body.experience || '',
        achievements: req.body.achievements || '',
        status: req.body.status || existingRegistration.status || 'pending'
      };

      // Update registration in database
      await updateDocument(COLLECTIONS.REGISTRATIONS, id, updateData);
      
      res.status(200).json({
        success: true,
        message: 'Registration updated successfully'
      });

    } catch (error) {
      console.error('Update registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update registration',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
    return;
  }

  // Only allow GET requests for fetching registrations
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

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
}; 