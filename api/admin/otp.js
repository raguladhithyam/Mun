const nodemailer = require('nodemailer');
const crypto = require('crypto');

// OTP storage (in-memory for serverless - will reset on each function call)
// In production, you might want to use a database or Redis
let otpStore = new Map();

// Email transporter
const transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER_GMAIL,
        pass: process.env.SMTP_PASS_GMAIL
    }
});

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
        const { action, email, otp } = req.body;
        
        if (!action) {
            return res.status(400).json({ success: false, message: 'Action is required (send or verify)' });
        }

        // Check if email is in admin users list
        const adminUsers = process.env.ADMIN_USERS_AUTH?.split(',').map(e => e.trim()) || [];
        
        if (action === 'send') {
            if (!email) {
                return res.status(400).json({ success: false, message: 'Email is required' });
            }
            
            if (!adminUsers.includes(email)) {
                return res.status(403).json({ 
                    success: false, 
                    message: `Access denied. Email '${email}' not authorized.` 
                });
            }
            
            // Generate 6-digit OTP
            const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
            const expiresAt = Date.now() + (10 * 60 * 1000); // 10 minutes
            
            // Store OTP
            otpStore.set(email, { otp: otpCode, expiresAt });
            
            // Send email
            const mailOptions = {
                from: process.env.SMTP_USER_GMAIL,
                to: email,
                subject: 'Admin Access OTP - Kumaraguru MUN',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #3b82f6;">Admin Access OTP</h2>
                        <p>You have requested access to the Kumaraguru MUN Admin Dashboard.</p>
                        <p>Your OTP code is: <strong style="font-size: 24px; color: #3b82f6;">${otpCode}</strong></p>
                        <p>This code will expire in 10 minutes.</p>
                        <p>If you didn't request this access, please ignore this email.</p>
                        <hr>
                        <p style="color: #666; font-size: 12px;">Kumaraguru MUN Team</p>
                    </div>
                `
            };
            
            await transporter.sendMail(mailOptions);
            
            res.status(200).json({ success: true, message: 'OTP sent successfully' });
            
        } else if (action === 'verify') {
            if (!email || !otp) {
                return res.status(400).json({ success: false, message: 'Email and OTP are required' });
            }
            
            if (!adminUsers.includes(email)) {
                return res.status(403).json({ 
                    success: false, 
                    message: `Access denied. Email '${email}' not authorized.` 
                });
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
            
            res.status(200).json({ 
                success: true, 
                message: 'OTP verified successfully',
                token: token
            });
            
        } else {
            return res.status(400).json({ success: false, message: 'Invalid action. Use "send" or "verify"' });
        }
        
    } catch (error) {
        console.error('Error in OTP function:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}; 