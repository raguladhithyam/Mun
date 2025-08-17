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

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    const templates = {
      welcome: {
        subject: 'Welcome to KMUN\'25 Executive Board Recruitment',
        body: `Dear {{name}},

Thank you for your interest in joining the KMUN'25 Executive Board! We have received your application and are excited to review your profile.

Your application details:
- Name: {{name}}
- Email: {{email}}
- College: {{college}}
- Department: {{department}}
- Year: {{year}}

We will review your application and get back to you soon with further details about the selection process.

Best regards,
KMUN'25 Team`
      },
      bulk: {
        subject: 'Important Update from KMUN\'25',
        body: `Dear {{name}},

{{message}}

Best regards,
KMUN'25 Team`
      },
      rejection: {
        subject: 'KMUN\'25 Executive Board Application Update',
        body: `Dear {{name}},

Thank you for your interest in joining the KMUN'25 Executive Board. After careful consideration of your application, we regret to inform you that we are unable to move forward with your application at this time.

We appreciate your interest and wish you the best in your future endeavors.

Best regards,
KMUN'25 Team`
      },
      acceptance: {
        subject: 'Congratulations! Welcome to KMUN\'25 Executive Board',
        body: `Dear {{name}},

Congratulations! We are delighted to inform you that your application for the KMUN'25 Executive Board has been accepted!

Your application details:
- Name: {{name}}
- Email: {{email}}
- College: {{college}}
- Department: {{department}}
- Year: {{year}}

We will be in touch soon with further details about your role and next steps.

Welcome to the team!

Best regards,
KMUN'25 Team`
      }
    };

    res.status(200).json({
      success: true,
      data: templates
    });

  } catch (error) {
    console.error('Templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch templates',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}; 