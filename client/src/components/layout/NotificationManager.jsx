/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useContext } from 'react';
import AuthContext from '../../context/AuthContext';
import Notification from './Notification';
import axios from 'axios';

const NotificationManager = () => {
    const [notifications, setNotifications] = useState([]);
    const { socket, user } = useContext(AuthContext);

    useEffect(() => {
        if (socket && user) {
            // Listen for new invitation notifications
            socket.on('invitation_received', (data) => {
                if (data.invitedEmail === user.email) {
                    const notification = {
                        id: new Date().getTime(),
                        message: `You've been invited to join group "${data.groupName}" by ${data.inviterName}. Check your dashboard for details.`,
                        type: 'info'
                    };
                    setNotifications(prevNotifications => [...prevNotifications, notification]);

                    // Force refresh pending invitations in the background
                    axios.get('/groups/invitations/pending')
                        .catch(err => console.error('Error fetching invitations:', err));
                }
            });

            // Listen for invitation responses
            socket.on('invitation_response', (data) => {
                const notification = {
                    id: new Date().getTime(),
                    message: `${data.userName} has ${data.status === 'accept' ? 'accepted' : 'declined'} your invitation to join the group.`,
                    type: data.status === 'accept' ? 'success' : 'error'
                };
                setNotifications(prevNotifications => [...prevNotifications, notification]);
            });

            // Listen for member added event
            socket.on('member_added', (data) => {
                const notification = {
                    id: new Date().getTime(),
                    message: `${data.userName} has joined one of your groups.`,
                    type: 'success'
                };
                setNotifications(prevNotifications => [...prevNotifications, notification]);
            });            // Listen for expense notifications
            socket.on('expense_added', () => {
                const notification = {
                    id: new Date().getTime(),
                    message: `New expense added in a group you belong to.`,
                    type: 'info'
                };
                setNotifications(prevNotifications => [...prevNotifications, notification]);
            });// Listen for expense settlement notifications
            socket.on('settlement_update', (data) => {
                if (data.expense) {
                    // If the current user is the one who paid and someone requested settlement
                    if (data.expense.paidBy && data.expense.paidBy.user === user._id) {
                        // Find the user who requested settlement
                        const pendingSettlementSplit = data.expense.splitAmong.find(
                            split => split.pendingSettlement && split.user !== user._id
                        );
                        if (pendingSettlementSplit) {
                            const notification = {
                                id: new Date().getTime(),
                                message: `${pendingSettlementSplit.name} has marked their payment as settled for "${data.expense.description}". Please confirm if you received the payment.`,
                                type: 'info'
                            };
                            setNotifications(prevNotifications => [...prevNotifications, notification]);
                        }

                        // Find the user who got their settlement confirmed
                        const settledSplit = data.expense.splitAmong.find(
                            split => split.settled && !split.pendingSettlement && split.user !== user._id
                        );
                        if (settledSplit) {
                            const notification = {
                                id: new Date().getTime(),
                                message: `You have confirmed that you received payment from ${settledSplit.name} for "${data.expense.description}".`,
                                type: 'success'
                            };
                            setNotifications(prevNotifications => [...prevNotifications, notification]);
                        }
                    }

                    // If the current user is the one who requested settlement and got a response
                    const userSplit = data.expense.splitAmong.find(split => split.user === user._id);
                    if (userSplit) {
                        if (userSplit.settled) {
                            const notification = {
                                id: new Date().getTime(),
                                message: `${data.expense.paidBy.name} has confirmed your payment for "${data.expense.description}".`,
                                type: 'success'
                            };
                            setNotifications(prevNotifications => [...prevNotifications, notification]);
                        } else if (!userSplit.pendingSettlement && !userSplit.settled) {
                            // This means a settlement request was rejected
                            const notification = {
                                id: new Date().getTime(),
                                message: `${data.expense.paidBy.name} has marked your payment as not settled for "${data.expense.description}". Please try again or contact them directly.`,
                                type: 'error'
                            };
                            setNotifications(prevNotifications => [...prevNotifications, notification]);
                        }
                    }
                }
            });

            // Listen for expense deleted notifications
            socket.on('expense_deleted', (data) => {
                const notification = {
                    id: new Date().getTime(),
                    message: `An expense has been deleted in one of your groups.`,
                    type: 'info'
                };
                setNotifications(prevNotifications => [...prevNotifications, notification]);
            });
        }

        return () => {
            if (socket) {
                socket.off('invitation_received');
                socket.off('invitation_response');
                socket.off('member_added');
                socket.off('expense_added');
                socket.off('settlement_update');
                socket.off('expense_deleted');
            }
        };
    }, [socket, user]);

    const removeNotification = (id) => {
        setNotifications(notifications.filter(notification => notification.id !== id));
    };

    return (
        <div className="notification-container">
            {notifications.map(notification => (
                <Notification
                    key={notification.id}
                    message={notification.message}
                    type={notification.type}
                    onClose={() => removeNotification(notification.id)}
                />
            ))}
        </div>
    );
};

export default NotificationManager;
