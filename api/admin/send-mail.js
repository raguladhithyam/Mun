const { getCollection, COLLECTIONS } = require('../utils/firebase');
const nodemailer = require('nodemailer');

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
    const { 
      recipients, 
      subject, 
      message, 
      smtpProvider = 'gmail',
      emailType = 'bulk'
    } = req.body;

    // Validate required fields
    if (!recipients || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'recipients, subject, and message are required'
      });
    }

    // Handle different recipient formats
    let selectedRecipients = [];
    
    if (typeof recipients === 'string') {
      // Single email address - allow sending to any email
      selectedRecipients = [{
        email: recipients,
        name: recipients.split('@')[0] // Use email prefix as name
      }];
    } else if (Array.isArray(recipients)) {
      // Array of recipient groups or registration IDs
      const registrations = await getCollection(COLLECTIONS.REGISTRATIONS);
      
      // Check if recipients are registration IDs or group names
      const isRegistrationIds = recipients.every(id => typeof id === 'string' && id.length > 10);
      
      if (isRegistrationIds) {
        // Recipients are registration IDs
        selectedRecipients = registrations.filter(reg => recipients.includes(reg.id));
      } else {
        // Recipients are group names (all, pending, accepted, rejected)
        selectedRecipients = registrations.filter(reg => {
          if (recipients.includes('all')) return true;
          if (recipients.includes('pending') && reg.status === 'pending') return true;
          if (recipients.includes('accepted') && reg.status === 'accepted') return true;
          if (recipients.includes('rejected') && reg.status === 'rejected') return true;
          return false;
        });
      }
    }

    if (selectedRecipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid recipients found'
      });
    }

    // Configure SMTP
    const smtpConfig = {
      gmail: {
        host: process.env.SMTP_HOST_GMAIL,
        port: process.env.SMTP_PORT_GMAIL,
        secure: false, // Use STARTTLS
        auth: {
          user: process.env.SMTP_USER_GMAIL,
          pass: process.env.SMTP_PASS_GMAIL
        },
        tls: {
          rejectUnauthorized: false
        }
      },
      outlook: {
        host: process.env.SMTP_HOST_OUTLOOK,
        port: process.env.SMTP_PORT_OUTLOOK,
        secure: false, // Use STARTTLS
        auth: {
          user: process.env.SMTP_USER_OUTLOOK,
          pass: process.env.SMTP_PASS_OUTLOOK
        },
        tls: {
          rejectUnauthorized: false
        }
      }
    };

    // Check if SMTP configuration is available
    const selectedConfig = smtpConfig[smtpProvider];
    if (!selectedConfig || !selectedConfig.auth.user || !selectedConfig.auth.pass) {
      return res.status(500).json({
        success: false,
        message: `SMTP configuration for ${smtpProvider} is not properly set up`
      });
    }

    const transporter = nodemailer.createTransport(selectedConfig);

    // Use custom subject and message
    const emailSubject = subject;
    const emailBody = (reg) => `Dear ${reg.name},

${message}

Best regards,
KMUN'25 Team`;

    // Send emails
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (const recipient of selectedRecipients) {
      try {
        const mailOptions = {
          from: process.env[`SMTP_USER_${smtpProvider.toUpperCase()}`],
          to: recipient.email,
          subject: emailSubject,
          text: emailBody(recipient)
        };

        await transporter.sendMail(mailOptions);
        results.success++;
        
        console.log(`✅ Email sent to ${recipient.email}`);
      } catch (error) {
        results.failed++;
        results.errors.push(`Failed to send email to ${recipient.email}: ${error.message}`);
        console.error(`❌ Email error for ${recipient.email}:`, error);
      }
    }

    res.status(200).json({
      success: true,
      message: `Email campaign completed. ${results.success} sent, ${results.failed} failed.`,
      results: results
    });

  } catch (error) {
    console.error('Send mail error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send emails',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}; 