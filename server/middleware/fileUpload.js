const multer = require('multer');

// Use memory storage instead of disk storage for Cloudinary
const storage = multer.memoryStorage();

// File filter for image uploads
const fileFilter = (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

// Set up multer for QR code uploads - using memory storage for Cloudinary
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 2 // 2MB max file size
    },
    fileFilter: fileFilter
});

module.exports = { upload };
