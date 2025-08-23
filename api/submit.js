// Load environment variables
require('dotenv').config();

const { addDocument, COLLECTIONS } = require('./utils/firebase');
const { uploadToCloudinary } = require('./utils/cloudinaryUploader');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

// Configure multer for file uploads
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    // Check file type
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 3 * 1024 * 1024, // 3MB max file size
        files: 3 // Maximum 3 files
    }
});

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
    console.log('Form submission received');
    console.log('Content-Type:', req.headers['content-type']);
            console.log('Environment check:', {
          hasFirebaseKey: !!process.env.FIREBASE_API_KEY,
          hasCloudinaryCloudName: !!process.env.VITE_CLOUDINARY_CLOUD_NAME,
          hasCloudinaryApiKey: !!process.env.VITE_CLOUDINARY_API_KEY,
          hasCloudinaryApiSecret: !!process.env.VITE_CLOUDINARY_API_SECRET,
          cloudName: process.env.VITE_CLOUDINARY_CLOUD_NAME
        });
    
    // Handle multipart form data
    if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
      console.log('Processing multipart form data...');
      
      try {
        // Use multer to parse multipart form data
        const uploadMiddleware = upload.fields([
          { name: 'idCard', maxCount: 1 },
          { name: 'munCertificates', maxCount: 1 },
          { name: 'chairingResume', maxCount: 1 }
        ]);

        // Wrap multer middleware in a promise
        await new Promise((resolve, reject) => {
          uploadMiddleware(req, res, (err) => {
            if (err) {
              console.error('Multer error:', err);
              reject(err);
            } else {
              resolve();
            }
          });
        });

        console.log('Files:', req.files);
        console.log('Body:', req.body);

        // Validate required fields
        const requiredFields = ['name', 'email', 'phone', 'college', 'department', 'year'];
        for (const field of requiredFields) {
          if (!req.body[field]) {
            return res.status(400).json({
              success: false,
              message: `Missing required field: ${field}`
            });
          }
        }

        // Validate required file
        if (!req.files || !req.files.idCard) {
          return res.status(400).json({
            success: false,
            message: 'ID Card is required'
          });
        }

        // Parse checkbox values
        let committees = [];
        let positions = [];

        try {
          if (req.body.committees) {
            committees = JSON.parse(req.body.committees);
          }
          if (req.body.positions) {
            positions = JSON.parse(req.body.positions);
          }
        } catch (error) {
          console.error('Error parsing checkbox values:', error);
          committees = req.body.committees ? [req.body.committees] : [];
          positions = req.body.positions ? [req.body.positions] : [];
        }

        // Validate checkbox selections
        if (!Array.isArray(committees) || committees.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Please select at least one committee preference'
          });
        }

        if (!Array.isArray(positions) || positions.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Please select at least one position preference'
          });
        }

        console.log('Starting file uploads...');

        // Upload files to Cloudinary
        const fileUrls = {};
        const uploadPromises = [];

        // Upload ID Card
        if (req.files.idCard) {
          const idCardFile = req.files.idCard[0];
          // Remove file extension from originalname to prevent double extensions
          const originalNameWithoutExt = idCardFile.originalname.replace(/\.pdf$/i, '');
          const fileName = `${Date.now()}_id-card_${originalNameWithoutExt}`;
          console.log('Uploading ID card:', fileName);
          uploadPromises.push(
            uploadToCloudinary(idCardFile.buffer, fileName, idCardFile.mimetype)
              .then(url => { 
                console.log('ID card uploaded successfully:', url);
                fileUrls.idCardUrl = url; 
              })
              .catch(error => {
                console.error('Error uploading ID card:', error);
                throw new Error('Failed to upload ID card');
              })
          );
        }

        // Upload MUN Certificates (optional)
        if (req.files.munCertificates) {
          const certFile = req.files.munCertificates[0];
          // Remove file extension from originalname to prevent double extensions
          const originalNameWithoutExt = certFile.originalname.replace(/\.pdf$/i, '');
          const fileName = `${Date.now()}_certificates_${originalNameWithoutExt}`;
          console.log('Uploading MUN certificates:', fileName);
          uploadPromises.push(
            uploadToCloudinary(certFile.buffer, fileName, certFile.mimetype)
              .then(url => { 
                console.log('MUN certificates uploaded successfully:', url);
                fileUrls.munCertificatesUrl = url; 
              })
              .catch(error => {
                console.error('Error uploading MUN certificates:', error);
                // Don't fail the entire submission for optional files
              })
          );
        }

        // Upload Chairing Resume (optional)
        if (req.files.chairingResume) {
          const resumeFile = req.files.chairingResume[0];
          // Remove file extension from originalname to prevent double extensions
          const originalNameWithoutExt = resumeFile.originalname.replace(/\.pdf$/i, '');
          const fileName = `${Date.now()}_resume_${originalNameWithoutExt}`;
          console.log('Uploading chairing resume:', fileName);
          uploadPromises.push(
            uploadToCloudinary(resumeFile.buffer, fileName, resumeFile.mimetype)
              .then(url => { 
                console.log('Chairing resume uploaded successfully:', url);
                fileUrls.chairingResumeUrl = url; 
              })
              .catch(error => {
                console.error('Error uploading chairing resume:', error);
                // Don't fail the entire submission for optional files
              })
          );
        }

        console.log('Waiting for all uploads to complete...');

        // Wait for all file uploads to complete
        await Promise.all(uploadPromises);

        console.log('All uploads completed. File URLs:', fileUrls);

        // Prepare data for Firestore
        const formData = {
          name: req.body.name,
          email: req.body.email,
          phone: req.body.phone,
          college: req.body.college,
          department: req.body.department,
          year: req.body.year,
          munsParticipated: parseInt(req.body.munsParticipated) || 0,
          munsWithAwards: parseInt(req.body.munsWithAwards) || 0,
          organizingExperience: req.body.organizingExperience,
          munsChaired: parseInt(req.body.munsChaired) || 0,
          committees: committees,
          positions: positions,
          idCardUrl: fileUrls.idCardUrl,
          munCertificatesUrl: fileUrls.munCertificatesUrl || null,
          chairingResumeUrl: fileUrls.chairingResumeUrl || null,
          // Store original filenames for better file type detection
          idCardFilename: req.files.idCard ? req.files.idCard[0].originalname : null,
          munCertificatesFilename: req.files.munCertificates ? req.files.munCertificates[0].originalname : null,
          chairingResumeFilename: req.files.chairingResume ? req.files.chairingResume[0].originalname : null,
          submittedAt: new Date().toISOString()
        };

        console.log('Saving to Firestore:', formData);

        // Save to Firestore
        const docRef = await addDocument(COLLECTIONS.REGISTRATIONS, formData);

        console.log('Document saved with ID:', docRef.id);

        res.status(201).json({
          success: true,
          message: 'Application submitted successfully!',
          data: {
            id: docRef.id,
            submittedAt: formData.submittedAt
          }
        });

      } catch (multerError) {
        console.error('Multer processing error:', multerError);
        return res.status(400).json({
          success: false,
          message: 'File upload error',
          error: multerError.message
        });
      }

    } else {
      console.log('Processing JSON data...');
      
      // Handle JSON data (fallback for backward compatibility)
      const formData = req.body;
      
      // Validate required fields
      const requiredFields = ['name', 'email', 'phone', 'college', 'department', 'year'];
      for (const field of requiredFields) {
        if (!formData[field]) {
          return res.status(400).json({
            success: false,
            message: `${field} is required`
          });
        }
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format'
        });
      }

      // Validate numeric fields
      const numericFields = ['munsParticipated', 'munsWithAwards', 'munsChaired', 'year'];
      for (const field of numericFields) {
        if (formData[field] !== undefined) {
          const value = parseInt(formData[field]);
          if (isNaN(value) || value < 0) {
            return res.status(400).json({
              success: false,
              message: `${field} must be a non-negative number`
            });
          }
          formData[field] = value;
        }
      }

      // Process file uploads if any
      let fileUrls = {};
      if (formData.files && typeof formData.files === 'object') {
        for (const [fieldName, fileData] of Object.entries(formData.files)) {
          if (fileData && fileData.data) {
            try {
              const buffer = Buffer.from(fileData.data, 'base64');
              const fileName = `${Date.now()}_${fieldName}_${fileData.name}`;
              const fileUrl = await uploadToCloudinary(buffer, fileName, fileData.type);
              fileUrls[fieldName] = fileUrl;
            } catch (uploadError) {
              console.error(`File upload error for ${fieldName}:`, uploadError);
              return res.status(500).json({
                success: false,
                message: `Failed to upload ${fieldName} file`
              });
            }
          }
        }
      }

      // Prepare registration data
      const registrationData = {
        ...formData,
        files: fileUrls,
        status: 'pending',
        submittedAt: new Date().toISOString(),
        email: formData.email.toLowerCase()
      };

      // Save to Firestore
      const docRef = await addDocument(COLLECTIONS.REGISTRATIONS, registrationData);

      res.status(201).json({
        success: true,
        message: 'Registration submitted successfully',
        data: {
          id: docRef.id,
          submittedAt: registrationData.submittedAt
        }
      });
    }

  } catch (error) {
    console.error('Registration submission error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to submit registration',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}; 