import React, { useState, useEffect } from 'react';
import './Notification.css';

const Notification = ({ message, type, onClose }) => {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false);
            setTimeout(() => {
                onClose();
            }, 300); // Wait for fade-out animation before removing
        }, 5000);

        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`notification ${type} ${visible ? 'visible' : 'hidden'}`}>
            <div className="notification-content">
                <span>{message}</span>
                <button className="close-btn" onClick={() => setVisible(false)}>×</button>
            </div>
        </div>
    );
};

export default Notification;
