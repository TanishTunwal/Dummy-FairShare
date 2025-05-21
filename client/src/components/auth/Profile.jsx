import { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import AuthContext from '../../context/AuthContext';
import './Profile.css';

const Profile = () => {
    const { user, setUser } = useContext(AuthContext);
    const passwordSectionRef = useRef(null);
    const qrCodeInputRef = useRef(null);
    const profileTopRef = useRef(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [qrCodeFile, setQRCodeFile] = useState(null);
    const [qrCodePreview, setQRCodePreview] = useState('');
    const [isUploadingQR, setIsUploadingQR] = useState(false);

    // Get user's first initial for profile avatar
    const getUserInitial = () => {
        if (user && user.name) {
            return user.name.charAt(0).toUpperCase();
        }
        return 'U';
    };

    // Auto-clear message after 3 seconds
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => {
                setMessage(null);
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [message]);

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || '',
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
            setLoading(false);
        }
    }, [user]);

    const onChange = e => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setMessage(null);

        try {
            // Only name can be updated
            const updateData = {
                name: formData.name
            };

            const res = await axios.put('/users/profile', updateData);

            // Update global user state
            setUser(res.data);
            setMessage({
                type: 'success',
                text: 'Profile updated successfully'
            });

            setIsEditing(false);
        } catch (err) {
            console.error('Error updating profile:', err);
            setMessage({
                type: 'error',
                text: err.response?.data?.message || 'Error updating profile'
            });
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setMessage(null);

        // Validate passwords
        if (formData.newPassword !== formData.confirmPassword) {
            setMessage({
                type: 'error',
                text: 'New passwords do not match'
            });
            return;
        }

        if (formData.newPassword.length < 6) {
            setMessage({
                type: 'error',
                text: 'Password must be at least 6 characters'
            });
            return;
        }

        try {
            await axios.put('/users/password', {
                currentPassword: formData.currentPassword,
                newPassword: formData.newPassword
            });

            setMessage({
                type: 'success',
                text: 'Password changed successfully'
            });

            // Reset password fields
            setFormData({
                ...formData,
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });

            setIsChangingPassword(false);

            // Scroll back to top
            profileTopRef.current?.scrollIntoView({ behavior: 'smooth' });
        } catch (err) {
            console.error('Error changing password:', err);
            setMessage({
                type: 'error',
                text: err.response?.data?.message || 'Error changing password'
            });
        }
    };    // Handle QR code file input change
    const handleQRCodeChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setQRCodeFile(file);
            // No longer creating preview
        }
    };

    // Upload QR code
    const handleQRCodeUpload = async (e) => {
        e.preventDefault();
        if (!qrCodeFile) return;

        setIsUploadingQR(true);
        setMessage(null);

        try {
            const formData = new FormData();
            formData.append('qrcode', qrCodeFile);

            const res = await axios.post('/users/qrcode', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            // Update global user state
            setUser(res.data);
            setMessage({
                type: 'success',
                text: 'QR code uploaded successfully'
            });

            // Reset file input
            setQRCodeFile(null);
            setIsUploadingQR(false);
        } catch (err) {
            console.error('Error uploading QR code:', err);
            setMessage({
                type: 'error',
                text: err.response?.data?.message || 'Error uploading QR code'
            });
            setIsUploadingQR(false);
        }
    };

    // Delete QR code
    const handleQRCodeDelete = async () => {
        if (!user.paymentQRCode) return;

        if (!window.confirm('Are you sure you want to remove your payment QR code?')) {
            return;
        }

        setMessage(null);

        try {
            const res = await axios.delete('/users/qrcode');

            // Update global user state
            setUser(res.data);
            setMessage({
                type: 'success',
                text: 'QR code removed successfully'
            });

            // Clear preview
            setQRCodePreview('');
        } catch (err) {
            console.error('Error removing QR code:', err);
            setMessage({
                type: 'error',
                text: err.response?.data?.message || 'Error removing QR code'
            });
        }
    };

    // Scroll to password section when changing password
    useEffect(() => {
        if (isChangingPassword && passwordSectionRef.current) {
            passwordSectionRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [isChangingPassword]);

    if (loading) {
        return <div className="container">Loading...</div>;
    }

    return (
        <section className="container" ref={profileTopRef}>
            <h1 className="profile-title">Your Profile</h1>

            {message && !isChangingPassword && (
                <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-danger'}`}>
                    {message.text}
                </div>
            )}

            <div className="profile-card">
                <div className="profile-header">
                    <div className="profile-avatar large-avatar">
                        {getUserInitial()}
                    </div>
                    <h2 className="profile-name">{user.name}</h2>
                </div>

                {!isEditing ? (
                    <div className="profile-info">
                        <div className="info-item">
                            <i className="fas fa-envelope"></i>
                            <span>{user.email}</span>
                        </div>
                        <div className="info-item">
                            <i className="fas fa-phone"></i>
                            <span>{user.phone}</span>
                        </div>
                        <div className="info-item">
                            <i className="fas fa-calendar-alt"></i>
                            <span>Member since: {new Date(user.createdAt).toLocaleDateString()}</span>
                        </div>

                        {/* Payment QR Code Section */}
                        <div className="qr-code-section">
                            <h3><i className="fas fa-qrcode"></i> Payment QR Code</h3>

                            {user.paymentQRCode ? (
                                <div className="qr-code-container">
                                    <div className="qr-code-status">
                                        <i className="fas fa-check-circle text-success"></i>
                                        <p>QR code has been uploaded and will be visible to other group members when they choose to pay you.</p>
                                    </div>
                                    <button
                                        className="btn btn-danger btn-sm"
                                        onClick={handleQRCodeDelete}
                                    >
                                        <i className="fas fa-trash-alt"></i> Remove QR Code
                                    </button>
                                </div>
                            ) : (
                                <div className="qr-code-upload">
                                    <p>No payment QR code uploaded yet.</p>
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => qrCodeInputRef.current?.click()}
                                    >
                                        <i className="fas fa-upload"></i> Upload QR Code
                                    </button>                                    {/* Hidden file input for QR code upload */}
                                    <input
                                        type="file"
                                        ref={qrCodeInputRef}
                                        onChange={handleQRCodeChange}
                                        style={{ display: 'none' }}
                                        accept="image/*"
                                    />

                                    {qrCodeFile && (
                                        <div className="qr-code-preview">
                                            <p>QR code selected and ready to upload</p>
                                            <div className="qr-preview-actions">
                                                <button
                                                    className="btn btn-success btn-sm"
                                                    onClick={handleQRCodeUpload}
                                                    disabled={isUploadingQR}
                                                >
                                                    {isUploadingQR ? (
                                                        <>Uploading...</>
                                                    ) : (
                                                        <><i className="fas fa-check"></i> Save QR Code</>
                                                    )}
                                                </button>
                                                <button
                                                    className="btn btn-light btn-sm"
                                                    onClick={() => {
                                                        setQRCodeFile(null);
                                                        setQRCodePreview('');
                                                    }}
                                                    disabled={isUploadingQR}
                                                >
                                                    <i className="fas fa-times"></i> Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <button
                            className="btn btn-primary"
                            onClick={() => {
                                setIsEditing(true);
                                setMessage(null);
                            }}
                        >
                            <i className="fas fa-edit"></i> Edit Profile
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={() => {
                                setIsChangingPassword(true);
                                setMessage(null);
                                // Use setTimeout to ensure the password section is rendered before scrolling
                                setTimeout(() => {
                                    passwordSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
                                }, 100);
                            }}
                        >
                            <i className="fas fa-key"></i> Change Password
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleProfileUpdate} className="profile-form">
                        <div className="form-group">
                            <label htmlFor="name">Name</label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={onChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="email">Email</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                disabled
                                className="disabled-input"
                            />
                            <small className="form-text">Email cannot be changed</small>
                        </div>
                        <div className="form-group">
                            <label htmlFor="phone">Phone Number</label>
                            <input
                                type="tel"
                                id="phone"
                                name="phone"
                                value={formData.phone}
                                disabled
                                className="disabled-input"
                            />
                            <small className="form-text">Phone number cannot be changed</small>
                        </div>

                        <div className="form-actions">
                            <button type="submit" className="btn btn-success">
                                <i className="fas fa-save"></i> Save Changes
                            </button>
                            <button
                                type="button"
                                className="btn btn-light"
                                onClick={() => {
                                    setIsEditing(false);
                                    setMessage(null);
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                )}

                {isChangingPassword && (
                    <div className="password-change-card" ref={passwordSectionRef}>
                        <h3>Change Password</h3>
                        {message && isChangingPassword && (
                            <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-danger'}`}>
                                {message.text}
                            </div>
                        )}
                        <form onSubmit={handlePasswordChange}>
                            <div className="form-group">
                                <label htmlFor="currentPassword">Current Password</label>
                                <input
                                    type="password"
                                    id="currentPassword"
                                    name="currentPassword"
                                    value={formData.currentPassword}
                                    onChange={onChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="newPassword">New Password</label>
                                <input
                                    type="password"
                                    id="newPassword"
                                    name="newPassword"
                                    value={formData.newPassword}
                                    onChange={onChange}
                                    required
                                    minLength="6"
                                />
                                <small className="form-text">Must be at least 6 characters</small>
                            </div>
                            <div className="form-group">
                                <label htmlFor="confirmPassword">Confirm New Password</label>
                                <input
                                    type="password"
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={onChange}
                                    required
                                    minLength="6"
                                />
                            </div>
                            <div className="form-actions">
                                <button type="submit" className="btn btn-success">
                                    <i className="fas fa-key"></i> Update Password
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-light"
                                    onClick={() => {
                                        setIsChangingPassword(false);
                                        setMessage(null);
                                        // Reset password fields
                                        setFormData({
                                            ...formData,
                                            currentPassword: '',
                                            newPassword: '',
                                            confirmPassword: ''
                                        });
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </section>
    );
};

export default Profile;
