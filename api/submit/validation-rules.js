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
    const validationRules = {
      requiredFields: [
        'name', 'email', 'phone', 'college', 'department', 'year',
        'munsParticipated', 'munsWithAwards', 'organizingExperience', 'munsChaired',
        'committees', 'positions', 'idCard'
      ],
      fileUpload: {
        maxSize: {
          idCard: '2MB',
          munCertificates: '2MB',
          chairingResume: '3MB'
        },
        allowedTypes: ['application/pdf'],
        required: ['idCard'],
        optional: ['munCertificates', 'chairingResume']
      },
      committees: [
        'UNSC', 'UNODC', 'LOK SABHA', 'CCC', 'IPC', 'DISEC'
      ],
      positions: [
        'Chairperson', 'Vice-Chairperson', 'Director'
      ],
      yearOptions: ['1', '2', '3', '4', '5']
    };

    res.status(200).json({
      success: true,
      data: validationRules
    });

  } catch (error) {
    console.error('Validation rules error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch validation rules',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}; 