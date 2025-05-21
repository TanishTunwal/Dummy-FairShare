# Cloudinary Integration for FairShare

## Overview

This update migrates QR code storage from local server storage to Cloudinary cloud storage, offering better scalability, reliability, and performance.

## Setup Instructions

### 1. Create a Cloudinary Account

- Sign up for a free account at [Cloudinary](https://cloudinary.com/users/register/free)
- After signing up, you'll get your cloud name, API key, and API secret from your dashboard

### 2. Configure Environment Variables

- Create a `.env` file in the server directory by copying `.env.example`
- Fill in your Cloudinary credentials:
  ```
  CLOUDINARY_CLOUD_NAME=your_cloud_name
  CLOUDINARY_API_KEY=your_api_key
  CLOUDINARY_API_SECRET=your_api_secret
  ```

### 3. Changes Made

#### Server-side:

- Added Cloudinary package for Node.js
- Created Cloudinary configuration
- Updated file upload middleware to use memory storage instead of disk storage
- Modified user controller to upload files to Cloudinary
- Added cloudinaryPublicId field to the User model to track Cloudinary resources
- Updated delete QR code functionality to also remove from Cloudinary

#### Benefits:

- Improved scalability - no local storage limits
- Better performance - images served from CDN
- Enhanced reliability - cloud storage is more reliable than local storage
- Simplified deployment - no need to manage local file uploads directory

## Usage

The application will now automatically use Cloudinary for QR code storage. No changes are needed to the frontend code as the QR codes are still accessed via URLs.
