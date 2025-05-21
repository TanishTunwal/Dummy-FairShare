const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register a new user
exports.registerUser = async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;

        // Check if user already exists with the same email
        let userByEmail = await User.findOne({ email });
        if (userByEmail) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        // Check if user already exists with the same phone
        let userByPhone = await User.findOne({ phone });
        if (userByPhone) {
            return res.status(400).json({ message: 'User with this phone number already exists' });
        }

        // Create new user
        user = new User({
            name,
            email,
            phone,
            password
        });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        // Save user to database
        await user.save();

        // Create JWT token
        const payload = {
            user: {
                id: user.id
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '24h' },
            (err, token) => {
                if (err) throw err;
                res.json({ token });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Login user
exports.loginUser = async (req, res) => {
    try {
        const { email, phone, password } = req.body;

        if (!email && !phone) {
            return res.status(400).json({ message: 'Email or phone number is required' });
        }

        // Check if user exists by email or phone
        let user;
        if (email) {
            user = await User.findOne({ email });
        } else if (phone) {
            user = await User.findOne({ phone });
        }

        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Create JWT token
        const payload = {
            user: {
                id: user.id
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '24h' },
            (err, token) => {
                if (err) throw err;
                res.json({ token });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Get user profile
exports.getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Get all users
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Get user by ID
exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // If user has uploaded a QR code, ensure the URL is complete
        if (user.paymentQRCode) {
            // Use environment variable or default to localhost
            const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
            if (!user.paymentQRCode.startsWith('http')) {
                user.paymentQRCode = `${baseUrl}${user.paymentQRCode}`;
            }
        }

        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Update user profile
exports.updateProfile = async (req, res) => {
    try {
        const { name } = req.body;

        // Build update object
        const updateFields = {};
        if (name) updateFields.name = name;

        // Email and phone updates are not allowed as per requirement

        // Update user
        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { $set: updateFields },
            { new: true }
        ).select('-password');

        // If name is updated, update name in all groups where user is a member
        if (name) {
            const Group = require('../models/Group');
            await Group.updateMany(
                { 'members.user': req.user.id },
                { $set: { 'members.$.name': name } }
            );

            // Also update name in pending invitations (both sent and received)
            await Group.updateMany(
                { 'invitations.user': req.user.id },
                { $set: { 'invitations.$.name': name } }
            );
        }

        res.json(updatedUser);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Change password
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Find user
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);

        // Save user with new password
        await user.save();

        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Upload payment QR code
exports.uploadQRCode = async (req, res) => {
    try {
        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Import cloudinary config
        const { cloudinary } = require('../config/cloudinary');

        // Create a data URI for the image
        const fileStr = req.file.buffer.toString('base64');
        const fileType = req.file.mimetype;
        const dataURI = `data:${fileType};base64,${fileStr}`;

        // Upload to Cloudinary with user ID in folder path for organization
        const uploadResult = await cloudinary.uploader.upload(dataURI, {
            folder: 'fairshare/qrcodes',
            public_id: `user_${req.user.id}_${Date.now()}`,
            overwrite: true
        });

        // Update user's QR code field with Cloudinary URL
        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            {
                $set: {
                    paymentQRCode: uploadResult.secure_url,
                    cloudinaryPublicId: uploadResult.public_id
                }
            },
            { new: true }
        ).select('-password');

        res.json(updatedUser);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Delete payment QR code
exports.deleteQRCode = async (req, res) => {
    try {
        // Get the current user to check for Cloudinary public ID
        const user = await User.findById(req.user.id);

        // If there's a Cloudinary public ID, delete the image from Cloudinary
        if (user.cloudinaryPublicId) {
            // Import cloudinary config
            const { cloudinary } = require('../config/cloudinary');
            await cloudinary.uploader.destroy(user.cloudinaryPublicId);
        }

        // Update user to remove QR code and Cloudinary ID
        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { $set: { paymentQRCode: '', cloudinaryPublicId: '' } },
            { new: true }
        ).select('-password');

        res.json(updatedUser);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};