const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Import routes
const formRoutes = require('./api/routes/formRoutes');
const adminRoutes = require('./api/routes/adminRoutes');
const mailerRoutes = require('./api/routes/mailerRoutes');

// OTP storage (in-memory for simplicity)
const otpStore = new Map();

// Email transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER_GMAIL,
        pass: process.env.SMTP_PASS_GMAIL
    }
});

const app = express();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            scriptSrcAttr: ["'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://res.cloudinary.com", "https://docs.google.com"],
            frameSrc: ["'self'", "https:", "data:"],
            objectSrc: ["'none'"]
        }
    }
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10000, // limit each IP to 10000 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
    origin: '*',
    credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// OTP Authentication Routes
app.post('/api/admin/send-otp', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }
        
        // Check if email is in admin users list
        const adminUsers = process.env.ADMIN_USERS_AUTH?.split(',').map(e => e.trim()) || [];
        if (!adminUsers.includes(email)) {
            return res.status(403).json({ success: false, message: 'Access denied. Email not authorized.' });
        }
        
        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + (10 * 60 * 1000); // 10 minutes
        
        // Store OTP
        otpStore.set(email, { otp, expiresAt });
        
        // Send email
        const mailOptions = {
            from: process.env.SMTP_USER_GMAIL,
            to: email,
            subject: 'Admin Access OTP - Kumaraguru MUN',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #3b82f6;">Admin Access OTP</h2>
                    <p>You have requested access to the Kumaraguru MUN Admin Dashboard.</p>
                    <p>Your OTP code is: <strong style="font-size: 24px; color: #3b82f6;">${otp}</strong></p>
                    <p>This code will expire in 10 minutes.</p>
                    <p>If you didn't request this access, please ignore this email.</p>
                    <hr>
                    <p style="color: #666; font-size: 12px;">Kumaraguru MUN Team</p>
                </div>
            `
        };
        
        await transporter.sendMail(mailOptions);
        
        res.json({ success: true, message: 'OTP sent successfully' });
        
    } catch (error) {
        console.error('Error sending OTP:', error);
        res.status(500).json({ success: false, message: 'Failed to send OTP' });
    }
});

app.post('/api/admin/verify-otp', (req, res) => {
    try {
        const { email, otp } = req.body;
        
        if (!email || !otp) {
            return res.status(400).json({ success: false, message: 'Email and OTP are required' });
        }
        
        // Check if email is in admin users list
        const adminUsers = process.env.ADMIN_USERS_AUTH?.split(',').map(e => e.trim()) || [];
        if (!adminUsers.includes(email)) {
            return res.status(403).json({ success: false, message: 'Access denied. Email not authorized.' });
        }
        
        // Get stored OTP
        const storedData = otpStore.get(email);
        if (!storedData) {
            return res.status(400).json({ success: false, message: 'OTP not found or expired' });
        }
        
        // Check if OTP is expired
        if (Date.now() > storedData.expiresAt) {
            otpStore.delete(email);
            return res.status(400).json({ success: false, message: 'OTP has expired' });
        }
        
        // Verify OTP
        if (storedData.otp !== otp) {
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }
        
        // Remove OTP from store
        otpStore.delete(email);
        
        // Generate session token
        const token = crypto.randomBytes(32).toString('hex');
        
        res.json({ 
            success: true, 
            message: 'OTP verified successfully',
            token: token
        });
        
    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.status(500).json({ success: false, message: 'Failed to verify OTP' });
    }
});

// API routes
app.use('/api/submit', formRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin', mailerRoutes);

// Route for serving the landing page (default route)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Route for serving the application form
app.get('/form', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/form.html'));
});

// Route for serving the admin dashboard
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/admin.html'));
});



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
app.use('/api/*', (req, res) => {
    res.status(404).json({ 
        success: false, 
        message: 'API endpoint not found' 
    });
});

// 404 handler for all other routes - serve landing page
app.use('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

const PORT = process.env.PORT || 3000;

// Only start the server if this file is run directly (not imported by Vercel)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📱 Landing page: http://localhost:${PORT}`);
        console.log(`📝 Application form: http://localhost:${PORT}/form`);
        console.log(`🔐 Admin dashboard: http://localhost:${PORT}/admin`);
    });
}

module.exports = app; 