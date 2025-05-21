import { useEffect, useRef } from 'react';
import './QRCodeModal.css';

const QRCodeModal = ({ isOpen, onClose, title, qrCodeUrl, userName, selectedUser }) => {
    const modalRef = useRef(null);

    // Close modal when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            // Prevent scrolling when modal is open
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.body.style.overflow = 'auto';
        };
    }, [isOpen, onClose]);

    // Close with Escape key
    useEffect(() => {
        const handleEscapeKey = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscapeKey);
        }

        return () => {
            document.removeEventListener('keydown', handleEscapeKey);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="qr-modal-overlay">
            <div className="qr-modal-container" ref={modalRef}>
                <div className="qr-modal-header">
                    <h2>{title || 'Payment QR Code'}</h2>
                    <button className="qr-modal-close" onClick={onClose}>
                        <i className="fas fa-times"></i>
                    </button>
                </div>
                <div className="qr-modal-body">
                    {selectedUser?.loading ? (
                        <div className="qr-modal-loading">
                            <i className="fas fa-circle-notch fa-spin"></i>
                            <p>Loading QR code...</p>
                        </div>
                    ) : selectedUser?.error ? (
                        <div className="qr-modal-no-qr">
                            <i className="fas fa-exclamation-triangle"></i>
                            <p>Error loading QR code. Please try again.</p>
                        </div>
                    ) : selectedUser?.paymentQRCode ? (
                        <div className="qr-modal-content">
                            <p className="qr-modal-username">Scan {userName}'s payment QR code</p>
                            <div className="qr-modal-image-container">
                                <img
                                    src={selectedUser.paymentQRCode}
                                    alt={`${userName}'s Payment QR Code`}
                                    className="qr-modal-image"
                                    onError={(e) => {
                                        console.error("QR code image failed to load");
                                        e.target.onerror = null;
                                        e.target.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSI1MCIgeT0iNTAiIGZvbnQtc2l6ZT0iMTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGFsaWdubWVudC1iYXNlbGluZT0ibWlkZGxlIiBmb250LWZhbWlseT0ibW9ub3NwYWNlLCBzYW5zLXNlcmlmIiBmaWxsPSIjOTk5OTk5Ij5RUiBDb2RlPC90ZXh0Pjwvc3ZnPg==";
                                    }}
                                />
                            </div>
                            <p className="qr-modal-instructions">
                                <i className="fas fa-info-circle"></i> Use your banking app to scan this QR code and pay
                            </p>
                        </div>
                    ) : (
                        <div className="qr-modal-no-qr">
                            <i className="fas fa-exclamation-circle"></i>
                            <p>{userName} hasn't uploaded a payment QR code yet.</p>
                        </div>
                    )}
                </div>
                <div className="qr-modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QRCodeModal;
