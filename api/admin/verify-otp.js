const crypto = require('crypto');

// OTP storage (in-memory for serverless - will reset on each function call)
// In production, you might want to use a database or Redis
let otpStore = new Map();

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
        const { email, otp } = req.body;
        
        if (!email || !otp) {
            return res.status(400).json({ success: false, message: 'Email and OTP are required' });
        }
        
        // Check if email is in admin users list
        const adminUsers = process.env.ADMIN_USERS_AUTH?.split(',').map(e => e.trim()) || [];
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
        
    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.status(500).json({ success: false, message: 'Failed to verify OTP' });
    }
}; 