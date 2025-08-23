const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.VITE_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.VITE_CLOUDINARY_API_KEY,
  api_secret: process.env.VITE_CLOUDINARY_API_SECRET
});

// Upload file to Cloudinary
async function uploadToCloudinary(fileBuffer, fileName, contentType) {
  try {
    console.log(`Uploading file to Cloudinary: ${fileName}`);
    console.log('Cloudinary Configuration:', {
      cloudName: process.env.VITE_CLOUDINARY_CLOUD_NAME,
      hasApiKey: !!process.env.VITE_CLOUDINARY_API_KEY,
      hasApiSecret: !!process.env.VITE_CLOUDINARY_API_SECRET,
      uploadPreset: process.env.VITE_CLOUDINARY_UPLOAD_PRESET
    });

    // Convert buffer to base64 string
    const base64String = fileBuffer.toString('base64');
    const dataURI = `data:${contentType};base64,${base64String}`;

    // Determine resource type based on content type
    let resourceType = 'auto';
    
    // Preserve file extension in public_id for better file type detection
    const fileExtension = fileName.includes('.') ? fileName.split('.').pop() : '';
    const fileNameWithoutExt = fileName.includes('.') ? fileName.substring(0, fileName.lastIndexOf('.')) : fileName;
    
    let uploadOptions = {
      public_id: `pdf_form_uploads/${Date.now()}_${fileNameWithoutExt}${fileExtension ? '.' + fileExtension : ''}`,
      folder: 'pdf_form_uploads',
      use_filename: true,
      unique_filename: true,
      access_mode: 'public',
      type: 'upload'
    };

    // For PDFs, use 'raw' resource type
    if (contentType === 'application/pdf') {
      resourceType = 'raw';
    }
    // For images, use 'image' resource type
    else if (contentType.startsWith('image/')) {
      resourceType = 'image';
    }
    // For other files, use 'raw' resource type
    else {
      resourceType = 'raw';
    }

    uploadOptions.resource_type = resourceType;

    // Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(dataURI, uploadOptions);

    console.log(`File uploaded successfully: ${fileName}`);
    console.log('Upload result:', {
      public_id: uploadResult.public_id,
      secure_url: uploadResult.secure_url,
      format: uploadResult.format,
      bytes: uploadResult.bytes,
      resource_type: uploadResult.resource_type
    });

    // Return the secure URL
    return uploadResult.secure_url;

  } catch (error) {
    console.error('Cloudinary upload error details:', {
      message: error.message,
      code: error.code,
      statusCode: error.http_code,
      cloudName: process.env.VITE_CLOUDINARY_CLOUD_NAME
    });
    throw new Error(`Failed to upload file to Cloudinary: ${error.message}`);
  }
}

// Delete file from Cloudinary
async function deleteFromCloudinary(publicId) {
  try {
    console.log(`Deleting file from Cloudinary: ${publicId}`);
    
    const deleteResult = await cloudinary.uploader.destroy(publicId);
    
    console.log(`File deleted successfully: ${publicId}`);
    console.log('Delete result:', deleteResult);
    
    return true;

  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error(`Failed to delete file from Cloudinary: ${error.message}`);
  }
}

// Extract public ID from Cloudinary URL
function getPublicIdFromUrl(url) {
  try {
    // Extract public ID from Cloudinary URL
    // Example: https://res.cloudinary.com/dt2ifuuit/image/upload/v1234567890/pdf_form_uploads/filename.pdf
    const urlParts = url.split('/');
    const uploadIndex = urlParts.findIndex(part => part === 'upload');
    
    if (uploadIndex !== -1 && uploadIndex + 2 < urlParts.length) {
      // Skip the version part and get the rest as public ID
      const publicIdParts = urlParts.slice(uploadIndex + 2);
      return publicIdParts.join('/').split('.')[0]; // Remove file extension
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting public ID from URL:', error);
    return null;
  }
}

// Generate signed URL for secure file access
function generateSignedUrl(publicId, resourceType = 'raw') {
  try {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      { 
        public_id: publicId, 
        resource_type: resourceType,
        timestamp: timestamp 
      }, 
      process.env.VITE_CLOUDINARY_API_SECRET
    );

    return cloudinary.url(publicId, {
      resource_type: resourceType,
      sign_url: true,
      type: 'upload',
      version: timestamp,
      signature: signature
    });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return null;
  }
}

module.exports = {
  uploadToCloudinary,
  deleteFromCloudinary,
  getPublicIdFromUrl,
  generateSignedUrl
}; 