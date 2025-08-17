require('dotenv').config();

// Secure access key (in production, store this securely)
const SECURE_ACCESS_KEY = process.env.ADMIN_SECURE_ACCESS_KEY;

// Verify secure access key function
function verifySecureAccessKey(accessKey) {
  return accessKey === SECURE_ACCESS_KEY;
}

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

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

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
}; 