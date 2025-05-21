const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const { upload } = require('../middleware/fileUpload');

// @route   POST /api/users/register
// @desc    Register a user
// @access  Public
router.post('/register', userController.registerUser);

// @route   POST /api/users/login
// @desc    Login user
// @access  Public
router.post('/login', userController.loginUser);

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', auth, userController.getUserProfile);

// @route   GET /api/users
// @desc    Get all users
// @access  Private
router.get('/', auth, userController.getAllUsers);

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', auth, userController.getUserById);

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, userController.updateProfile);

// @route   PUT /api/users/password
// @desc    Change user password
// @access  Private
router.put('/password', auth, userController.changePassword);

// @route   POST /api/users/qrcode
// @desc    Upload payment QR code
// @access  Private
router.post('/qrcode', auth, upload.single('qrcode'), userController.uploadQRCode);

// @route   DELETE /api/users/qrcode
// @desc    Delete payment QR code
// @access  Private
router.delete('/qrcode', auth, userController.deleteQRCode);

module.exports = router;