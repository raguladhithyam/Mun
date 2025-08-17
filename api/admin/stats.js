const { getRegistrationStats } = require('../utils/firebase');

// Secure access key (in production, store this securely)
const SECURE_ACCESS_KEY = process.env.ADMIN_SECURE_ACCESS_KEY;

// Verify secure access key function
function verifySecureAccessKey(accessKey) {
  return accessKey === SECURE_ACCESS_KEY;
}

module.exports = async (req, res) => {
  console.log('📊 Stats endpoint called:', req.method, req.url);
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('📊 Handling OPTIONS request');
    res.status(200).end();
    return;
  }

  // Handle POST requests for access key verification
  if (req.method === 'POST') {
    try {
      const { accessKey } = req.body;
      
      if (!accessKey) {
        return res.status(400).json({
          success: false,
          message: 'Secure access key is required'
        });
      }
      
      const isValid = verifySecureAccessKey(accessKey);
      
      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid secure access key'
        });
      }
      
      res.json({
        success: true,
        message: 'Secure access key verified successfully'
      });
      
    } catch (error) {
      console.error('Verify access key error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify secure access key'
      });
    }
    return;
  }

  // Handle GET requests for statistics
  if (req.method === 'GET') {
    console.log('📊 Processing GET request for statistics');
    try {
      console.log('📊 Getting registration statistics');
      const stats = await getRegistrationStats();
      console.log('📊 Statistics retrieved successfully:', stats);
      
      res.status(200).json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
    return;
  }

  // Handle other HTTP methods
  console.log('📊 Method not allowed:', req.method);
  return res.status(405).json({
    success: false,
    message: 'Method not allowed'
  });
}; 