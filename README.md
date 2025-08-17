# KMUN'25 Executive Board Recruitment System

A comprehensive web application for managing executive board recruitment for KMUN'25, built with Node.js, Express, and Firebase.

## Features

- **Application Form**: Multi-step form with file uploads (ID Card, Certificates, Resume)
- **Admin Dashboard**: View, manage, and export registrations
- **Email System**: Send bulk emails to applicants
- **File Management**: Secure file uploads to AWS S3
- **Data Storage**: Firebase Firestore for data persistence

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: Firebase Firestore
- **File Storage**: AWS S3
- **Email**: Nodemailer with SMTP
- **Frontend**: HTML, CSS, JavaScript
- **Deployment**: Vercel

## Local Development

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Firebase project
- AWS S3 bucket
- SMTP email credentials

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Mun
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Variables**
   Copy `env.example` to `.env` and fill in your credentials:
   ```bash
   cp env.example .env
   ```

   Required environment variables:
   ```env
   # AWS S3
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   AWS_REGION=your_region
   AWS_S3_BUCKET=your_bucket_name

   # Firebase
   FIREBASE_API_KEY=your_api_key
   FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   FIREBASE_APP_ID=your_app_id

   # SMTP Gmail
   SMTP_HOST_GMAIL=smtp.gmail.com
   SMTP_PORT_GMAIL=587
   SMTP_USER_GMAIL=your_email@gmail.com
   SMTP_PASS_GMAIL=your_app_password

   # SMTP Outlook
   SMTP_HOST_OUTLOOK=smtp-mail.outlook.com
   SMTP_PORT_OUTLOOK=587
   SMTP_USER_OUTLOOK=your_email@outlook.com
   SMTP_PASS_OUTLOOK=your_password
   ```

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Access the application**
   - Landing page: http://localhost:3000
   - Application form: http://localhost:3000/form
   - Admin dashboard: http://localhost:3000/admin

## Vercel Deployment

### Prerequisites

- Vercel account
- All environment variables configured

### Deployment Steps

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy to Vercel**
   ```bash
   vercel --prod
   ```

4. **Set Environment Variables**
   In your Vercel dashboard, go to Settings > Environment Variables and add all the variables from your `.env` file.

### Vercel Configuration

The `vercel.json` file is configured to:
- Route `/api/*` requests to the serverless function
- Serve static files from the `public` directory
- Handle routing for `/form` and `/admin` pages
- Set function timeout to 30 seconds

## API Endpoints

### Form Submission
- `POST /api/submit` - Submit application form
- `GET /api/submit/validation-rules` - Get form validation rules
- `POST /api/submit/check-email` - Check if email already exists

### Admin Dashboard
- `GET /api/admin/stats` - Get dashboard statistics
- `GET /api/admin/registrations` - Get all registrations
- `GET /api/admin/registrations/:id` - Get single registration
- `PUT /api/admin/registrations/:id` - Update registration
- `DELETE /api/admin/registrations/:id` - Delete registration
- `POST /api/admin/registrations/bulk-action` - Bulk operations
- `GET /api/admin/export` - Export registrations

### Email System
- `POST /api/admin/send-mail` - Send bulk emails
- `POST /api/admin/send-welcome` - Send welcome emails
- `GET /api/admin/templates` - Get email templates

## Troubleshooting

### Common Issues

1. **"API endpoint not found" Error**
   - Ensure Vercel deployment is complete
   - Check that environment variables are set in Vercel
   - Verify the `vercel.json` configuration

2. **File Upload Issues**
   - Check AWS S3 credentials and bucket permissions
   - Ensure file size is within limits (2MB for ID Card, 3MB for Resume)
   - Verify file type is PDF

3. **Email Sending Issues**
   - Check SMTP credentials
   - Ensure email provider allows less secure apps
   - Verify SMTP port and host settings

4. **Database Connection Issues**
   - Verify Firebase project configuration
   - Check Firebase security rules
   - Ensure Firestore is enabled

### Testing API Endpoints

Run the test script to verify API functionality:
```bash
node test-api.js
```

### Environment Variable Checklist

Before deployment, ensure these are set in Vercel:
- [ ] AWS S3 credentials
- [ ] Firebase configuration
- [ ] SMTP email settings
- [ ] NODE_ENV=production

## File Structure

```
Mun/
├── api/
│   ├── index.js              # Main API serverless function
│   ├── routes/
│   │   ├── formRoutes.js     # Form submission routes
│   │   ├── adminRoutes.js    # Admin dashboard routes
│   │   └── mailerRoutes.js   # Email system routes
│   └── utils/
│       ├── firebase.js       # Firebase utilities
│       └── s3Uploader.js     # S3 upload utilities
├── public/                   # Static files
│   ├── index.html           # Landing page
│   ├── form.html            # Application form
│   ├── admin.html           # Admin dashboard
│   ├── scripts.js           # Frontend JavaScript
│   └── styles.css           # Frontend styles
├── server.js                # Local development server
├── vercel.json              # Vercel configuration
├── package.json             # Dependencies
└── env.example              # Environment variables template
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
