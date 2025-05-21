import { useState, useEffect, useRef, useContext } from "react";
import axios from "axios";
import AuthContext from "../../context/AuthContext";
import "./QRCodeModal.css"; // Base modal styles
import "./QRUploadModal.css"; // Additional styles for QR upload

const QRUploadModal = ({ isOpen, onClose, onSuccess }) => {
    const { user, setUser } = useContext(AuthContext);
    const [qrCodeFile, setQRCodeFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);
    const modalRef = useRef(null);

    // Close modal when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                handleClose();
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            // Prevent scrolling when modal is open
            document.body.style.overflow = "hidden";
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.body.style.overflow = "auto";
        };
    }, [isOpen]);

    // Close with Escape key
    useEffect(() => {
        const handleEscapeKey = (event) => {
            if (event.key === "Escape") {
                handleClose();
            }
        };

        if (isOpen) {
            document.addEventListener("keydown", handleEscapeKey);
        }

        return () => {
            document.removeEventListener("keydown", handleEscapeKey);
        };
    }, [isOpen]);

    const handleClose = () => {
        // Reset state when closing
        setQRCodeFile(null);
        setError(null);
        setIsUploading(false);
        if (typeof onClose === 'function') {
            onClose();
        }
    };

    // Handle file selection
    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setQRCodeFile(e.target.files[0]);
            setError(null);
        }
    };

    // Upload QR code
    const handleUpload = async (e) => {
        e.preventDefault();

        if (!qrCodeFile) {
            setError("Please select a QR code image");
            return;
        }

        setIsUploading(true);
        setError(null);

        try {
            console.log("Uploading QR code file:", qrCodeFile.name);

            const formData = new FormData();
            formData.append("qrcode", qrCodeFile);

            const res = await axios.post("/users/qrcode", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            console.log("QR code upload successful, response:", res.data);

            // Update global user state
            setUser(res.data);

            // Close modal and notify parent of success
            setIsUploading(false);
            if (typeof onSuccess === 'function') {
                onSuccess();
            }
            handleClose();
        } catch (err) {
            console.error("Error uploading QR code:", err);
            setError(err.response?.data?.message || "Error uploading QR code");
            setIsUploading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="qr-modal-overlay">
            <div className="qr-modal-container" ref={modalRef}>
                <div className="qr-modal-header">
                    <h2>Upload Payment QR Code</h2>
                    <button className="qr-modal-close" onClick={handleClose}>
                        <i className="fas fa-times"></i>
                    </button>
                </div>
                <div className="qr-modal-body">
                    <div className="qr-upload-content">
                        {error && (
                            <div className="alert alert-danger mb-3">
                                <i className="fas fa-exclamation-circle mr-2"></i>
                                {error}
                            </div>
                        )}

                        <p className="qr-upload-info mb-3">
                            <i className="fas fa-info-circle"></i> Upload a payment QR code
                            from your banking app or payment service to make it easier for
                            others to pay you.
                        </p>

                        <div className="qr-upload-actions">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                style={{ display: "none" }}
                                accept="image/*"
                            />

                            <button
                                className="btn btn-secondary mb-3"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                            >
                                <i className="fas fa-image"></i> Select QR Code Image
                            </button>

                            {qrCodeFile && (
                                <div className="qr-file-selected">
                                    <p>
                                        <i className="fas fa-check"></i> File selected:{" "}
                                        <span className="file-name">{qrCodeFile.name}</span>
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="qr-modal-footer">
                    <button
                        className="btn btn-success mr-2"
                        onClick={handleUpload}
                        disabled={!qrCodeFile || isUploading}
                    >
                        {isUploading ? (
                            <>
                                <i className="fas fa-spinner fa-spin"></i> Uploading...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-upload"></i> Upload QR Code
                            </>
                        )}
                    </button>
                    <button className="btn btn-secondary" onClick={handleClose}>
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QRUploadModal;
