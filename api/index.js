const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import routes
const formRoutes = require('./routes/formRoutes');
const adminRoutes = require('./routes/adminRoutes');
const mailerRoutes = require('./routes/mailerRoutes');

const app = express();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"]
        }
    }
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/', limiter);

// CORS configuration
app.use(cors({
    origin: '*',
    credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`🔍 API Request: ${req.method} ${req.url}`);
  console.log(`📍 Original URL: ${req.originalUrl}`);
  console.log(`🛣️ Path: ${req.path}`);
  next();
});

// API routes - Fixed to match frontend expectations
// Frontend makes requests to /api/submit and /api/admin/send-mail
// Since this is the /api handler, we mount routes at /submit and /admin
app.use('/submit', formRoutes);
app.use('/', adminRoutes);
app.use('/', mailerRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ 
        success: false, 
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// 404 handler for API routes
app.use('*', (req, res) => {
    console.log('404 - API endpoint not found:', req.method, req.url);
    res.status(404).json({ 
        success: false, 
        message: 'API endpoint not found',
        path: req.url,
        method: req.method
    });
});

// Export for Vercel serverless function
module.exports = app;

// For Vercel serverless functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = app;
} 