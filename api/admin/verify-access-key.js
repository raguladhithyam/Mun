const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// CORS configuration
app.use(cors({
    origin: '*',
    credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Secure access key (in production, store this securely)
const SECURE_ACCESS_KEY = process.env.ADMIN_SECURE_ACCESS_KEY;

// Verify secure access key function
function verifySecureAccessKey(accessKey) {
  return accessKey === SECURE_ACCESS_KEY;
}

// Verify secure access key endpoint
app.post('/', async (req, res) => {
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
});

// Handle other HTTP methods
app.use('*', (req, res) => {
  res.status(405).json({
    success: false,
    message: 'Method not allowed'
  });
});

// Export for Vercel serverless function
module.exports = app; 