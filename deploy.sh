#!/bin/bash

# KMUN'25 Deployment Script for Vercel
echo "🚀 KMUN'25 Deployment Script"
echo "=============================="

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create one from env.example"
    echo "cp env.example .env"
    echo "Then fill in your environment variables."
    exit 1
fi

# Check if all required environment variables are set
echo "🔍 Checking environment variables..."
source .env

required_vars=(
    "VITE_CLOUDINARY_API_KEY"
    "VITE_CLOUDINARY_API_SECRET"
    "VITE_CLOUDINARY_CLOUD_NAME"
    "VITE_CLOUDINARY_UPLOAD_PRESET"
    "ADMIN_SECURE_ACCESS_KEY"
    "FIREBASE_API_KEY"
    "FIREBASE_AUTH_DOMAIN"
    "FIREBASE_PROJECT_ID"
    "FIREBASE_STORAGE_BUCKET"
    "FIREBASE_MESSAGING_SENDER_ID"
    "FIREBASE_APP_ID"
    "SMTP_HOST_GMAIL"
    "SMTP_PORT_GMAIL"
    "SMTP_USER_GMAIL"
    "SMTP_PASS_GMAIL"
)

missing_vars=()
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    echo "❌ Missing required environment variables:"
    for var in "${missing_vars[@]}"; do
        echo "   - $var"
    done
    echo "Please update your .env file and try again."
    exit 1
fi

echo "✅ All environment variables are set"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Test the API locally
echo "🧪 Testing API locally..."
node test-api.js

if [ $? -eq 0 ]; then
    echo "✅ Local API test passed"
else
    echo "❌ Local API test failed. Please fix issues before deploying."
    exit 1
fi

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod

if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Go to your Vercel dashboard"
    echo "2. Navigate to Settings > Environment Variables"
    echo "3. Add all variables from your .env file"
    echo "4. Redeploy if needed: vercel --prod"
    echo ""
    echo "🌐 Your application should now be live!"
else
    echo "❌ Deployment failed. Please check the error messages above."
    exit 1
fi 