import { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../../context/AuthContext';
import QRCodeModal from '../layout/QRCodeModal';
import './GroupDetail.css';
import './GroupErrorStyles.css';

const GroupDetail = () => {
    const { id } = useParams();
    const { user, socket } = useContext(AuthContext);
    const [group, setGroup] = useState(null);
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [newMemberEmail, setNewMemberEmail] = useState('');
    const [newMemberPhone, setNewMemberPhone] = useState('');
    const [inviteMethod, setInviteMethod] = useState('email');
    const [qrModalOpen, setQrModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    // Fetch group details and expenses
    useEffect(() => {
        const fetchGroupData = async () => {
            try {
                // Get group details
                const groupRes = await axios.get(`/groups/${id}`);
                setGroup(groupRes.data);                // Get group expenses
                const expensesRes = await axios.get(`/expenses/group/${id}`);
                // Sort expenses by date in descending order (newest first)
                const sortedExpenses = expensesRes.data.sort((a, b) => new Date(b.date) - new Date(a.date));
                setExpenses(sortedExpenses);

                setLoading(false);
            } catch (err) {
                setError('Error fetching group data');
                console.error('Error fetching group data:', err);
                setLoading(false);
            }
        };

        fetchGroupData();        // Set up a periodic refresh for group data to ensure we have the latest members
        const intervalId = setInterval(() => {
            console.log('Refreshing group data...');
            axios.get(`/groups/${id}`)
                .then(res => setGroup(res.data))
                .catch(err => console.error('Error refreshing group data:', err));

            // Also refresh expenses with proper sorting
            axios.get(`/expenses/group/${id}`)
                .then(res => {
                    const sortedExpenses = res.data.sort((a, b) => new Date(b.date) - new Date(a.date));
                    setExpenses(sortedExpenses);
                })
                .catch(err => console.error('Error refreshing expenses:', err));
        }, 10000); // Refresh every 10 seconds

        return () => clearInterval(intervalId);
    }, [id]);    // Join socket room for this group
    useEffect(() => {
        if (socket && socket.connected && group) {
            socket.emit('join_group', id);
            console.log(`Joined group socket room: ${id}`);

            // Listen for new expenses
            socket.on('expense_added', (data) => {
                setExpenses(prevExpenses => {
                    const updatedExpenses = [...prevExpenses, data.expense];
                    // Sort by date in descending order (newest first)
                    return updatedExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));
                });
            });

            // Listen for settlement updates
            socket.on('settlement_update', (data) => {
                setExpenses(prevExpenses =>
                    prevExpenses.map(expense =>
                        expense._id === data.expenseId ? data.expense : expense
                    )
                );
            });

            // Listen for expense deletions
            socket.on('expense_deleted', (data) => {
                setExpenses(prevExpenses =>
                    prevExpenses.filter(expense => expense._id !== data.expenseId)
                );
            });

            // Listen for member removals
            socket.on('member_removed', (data) => {
                if (data.groupId === id) {
                    console.log('Member removed:', data);
                    setGroup(prevGroup => ({
                        ...prevGroup,
                        members: prevGroup.members.filter(member => member.user !== data.userId)
                    }));
                }
            });

            // Listen for invitation responses
            socket.on('invitation_response', (data) => {
                if (data.groupId === id) {
                    console.log('Invitation response received:', data);

                    // If accepted, update members list
                    if (data.status === 'accepted') {
                        setGroup(prevGroup => {
                            // Check if the member is already in the group to avoid duplicates
                            const memberExists = prevGroup.members.some(member =>
                                member.user === data.userId
                            );

                            if (!memberExists) {
                                return {
                                    ...prevGroup,
                                    members: [...prevGroup.members, {
                                        user: data.userId,
                                        name: data.userName,
                                        email: data.userEmail
                                    }]
                                };
                            }
                            return prevGroup;
                        });
                    }

                    // Update invitations list
                    setGroup(prevGroup => ({
                        ...prevGroup,
                        invitations: prevGroup.invitations ?
                            prevGroup.invitations.filter(invite =>
                                !(invite.user === data.userId && invite.status === 'pending')
                            ) : []
                    }));

                    // Force a refresh of the group data to ensure all clients are in sync
                    axios.get(`/groups/${id}`)
                        .then(res => setGroup(res.data))
                        .catch(err => console.error('Error refreshing group after invitation response:', err));
                }
            });

            // Listen for member added events
            socket.on('member_added', (data) => {
                if (data.groupId === id) {
                    console.log('Member added to group:', data);

                    // Force a refresh of the group data
                    axios.get(`/groups/${id}`)
                        .then(res => setGroup(res.data))
                        .catch(err => console.error('Error refreshing group after member added:', err));
                }
            });
        }

        return () => {
            if (socket) {
                socket.emit('leave_group', id);
                console.log(`Left group socket room: ${id}`);

                socket.off('expense_added');
                socket.off('settlement_update');
                socket.off('expense_deleted');
                socket.off('member_removed');
                socket.off('invitation_response');
                socket.off('member_added');
            }
        };
    }, [socket, id, group]); const handleInviteMember = async (e) => {
        e.preventDefault();

        try {
            // Determine which field to use based on invite method
            const inviteData = inviteMethod === 'email'
                ? { email: newMemberEmail }
                : { phone: newMemberPhone };

            const res = await axios.post(`/groups/${id}/invitations`, inviteData);
            setGroup(res.data.group);            // Clear input fields
            setNewMemberEmail('');
            setNewMemberPhone('');

            // Show success message
            setError('');

            // Scroll to top of page on success
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });

            // Build appropriate success message
            const invitedContact = inviteMethod === 'email' ? newMemberEmail : newMemberPhone;
            setSuccessMessage(`Invitation sent to ${invitedContact} successfully!`);

            // Clear success message after 5 seconds
            setTimeout(() => {
                setSuccessMessage('');
            }, 5000);

            // Emit socket event for real-time notification
            if (socket) {
                console.log('Emitting invitation sent event');
                const invitationData = {
                    groupId: id,
                    groupName: group.name,
                    invitedBy: user._id,
                    inviterName: user.name
                };

                // Add appropriate contact info
                if (inviteMethod === 'email') {
                    invitationData.invitedEmail = newMemberEmail;
                } else {
                    invitationData.invitedPhone = newMemberPhone;
                }

                socket.emit('invitation_sent', invitationData);

                // Also log the event for debugging
                console.log('Invitation sent:', invitationData);
            }
        } catch (err) {
            // Scroll to top of page on error
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });

            setError(err.response?.data?.message || 'Failed to invite member');
            console.error('Error inviting member:', err.response?.data || err);

            // Clear error message after 7 seconds
            setTimeout(() => {
                setError('');
            }, 7000);
        }
    }; const handleRemoveMember = async (userId) => {
        // Scroll to top of page
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });

        try {
            if (window.confirm('Are you sure you want to remove this member?')) {
                await axios.delete(`/groups/${id}/members/${userId}`);
                // Update the group state immediately
                setGroup(prevGroup => ({
                    ...prevGroup,
                    members: prevGroup.members.filter(member => member.user !== userId)
                }));
                // Emit socket event for real-time update
                if (socket) {
                    socket.emit('member_removed', {
                        groupId: id,
                        userId: userId
                    });
                }
                // Show success message
                setSuccessMessage('Member has been removed from the group');
                // Clear success message after 5 seconds
                setTimeout(() => {
                    setSuccessMessage('');
                }, 5000);
            }
        } catch (err) {
            // Add pulse animation to error message for unsettled expenses
            const errorMsg = err.response?.data?.message || 'Failed to remove member';
            setError(errorMsg);

            // Add pulse class to error display for visual emphasis
            const errorElement = document.querySelector('.alert-danger');
            if (errorElement && errorMsg.includes('unsettled expenses')) {
                errorElement.classList.add('pulse');

                // Remove the pulse class after the error disappears
                setTimeout(() => {
                    errorElement.classList.remove('pulse');
                }, 7000);
            }

            // Clear error message after 7 seconds
            setTimeout(() => {
                setError('');
            }, 7000);

            console.error('Error removing member:', err);
        }
    };

    // Leave group handler for all users
    const handleLeaveGroup = async () => {
        // Scroll to top of page
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });

        // Check for unsettled expenses
        if (hasUnsettledExpenses(user._id)) {
            setError('You have pending dues. Please settle them before leaving the group.');
            return;
        }

        if (!window.confirm('Are you sure you want to leave this group?')) return;

        try {
            await axios.post(`/groups/${id}/leave`);
            // Emit socket event for real-time update
            if (socket) {
                socket.emit('member_removed', { groupId: id, userId: user._id });
            }
            // Redirect to dashboard
            window.location.href = '/dashboard';
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to leave group');
            console.error('Error leaving group:', err);
        }
    };

    // Helper function to check if a user has unsettled expenses
    const hasUnsettledExpenses = (userId) => {
        return expenses.some(expense => {
            // Case 1: User is part of an expense and hasn't settled it
            const userSplit = expense.splitAmong.find(split => split.user === userId);
            if (userSplit && !userSplit.settled && expense.paidBy.user !== userId) {
                return true;
            }

            // Case 2: User paid for an expense and others haven't settled with them
            if (expense.paidBy.user === userId) {
                return expense.splitAmong.some(split =>
                    split.user !== userId && !split.settled
                );
            }

            return false;
        });
    };

    // Function to open QR code modal
    const openQrModal = async (member) => {
        try {
            // Show loading state
            setSelectedUser({
                ...member,
                loading: true,
                paymentQRCode: null
            });
            setQrModalOpen(true);

            // Get latest user data with QR code
            const userRes = await axios.get(`/users/${member.user}`);

            // Update the user with their latest data including QR code
            setSelectedUser({
                ...member,
                loading: false,
                paymentQRCode: userRes.data.paymentQRCode
            });

            console.log("User QR Code:", userRes.data.paymentQRCode);
        } catch (err) {
            console.error('Error fetching user QR code:', err);
            // Still open modal but without QR code and with error state
            setSelectedUser({
                ...member,
                loading: false,
                error: true,
                paymentQRCode: null
            });
        }
    };

    if (loading) {
        return (
            <div className="container loading-container">
                <div className="loading-spinner">
                    <i className="fas fa-circle-notch fa-spin"></i>
                </div>
                <p>Loading group details...</p>
            </div>
        );
    }

    if (!group) {
        return (
            <div className="container error-container">
                <div className="error-icon">
                    <i className="fas fa-exclamation-triangle"></i>
                </div>
                <h2>Group Not Found</h2>
                <p>The group you're looking for doesn't exist or you don't have access to it.</p>
                <Link to="/dashboard" className="btn btn-primary">
                    Return to Dashboard
                </Link>
            </div>
        );
    }

    return (<section className="container">
        <Link to="/dashboard" className="btn btn-light">
            <i className="fas fa-arrow-left"></i> Back to Dashboard
        </Link>        <div className="group-header">
            <h1>{group.name}</h1>
            <p>{group.description}</p>
        </div>

        {error && (
            <div className={`alert alert-danger ${error.includes('unsettled expenses') ? 'pulse' : ''}`}>
                <i className="fas fa-exclamation-triangle"></i> {error}
            </div>
        )}
        {successMessage && <div className="alert alert-success">{successMessage}</div>}            <div className="group-actions">
            <Link to={`/expenses/add/${id}`} className="btn btn-primary">
                <i className="fas fa-plus-circle"></i> Add Expense
            </Link>
            <Link to={`/expenses/settlement/${id}`} className="btn btn-success">
                <i className="fas fa-exchange-alt"></i> View Settlement Plan
            </Link>
            <Link to={`/expenses/analysis/${id}`} className="btn btn-info">
                <i className="fas fa-chart-pie"></i> View Expense Analysis
            </Link>
            <button 
                className="btn btn-danger" 
                onClick={handleLeaveGroup}
                title={hasUnsettledExpenses(user._id) ? "You have pending dues. Please settle them before leaving." : "Leave this group"}
            >
                <i className="fas fa-sign-out-alt"></i> Leave Group
            </button>
        </div>

        <div className="group-content">                <div className="members-section">
            <h2>Members</h2>
            <ul className="members-list">
                {group.members.map(member => (
                    <li key={member.user} className="member-item">                        <div className="member-info">
                        <span className="member-name">{member.name}</span>
                        <div className="member-contact">
                            <span className="member-email">{member.email}</span>
                            {member.phone && <span className="member-phone">{member.phone}</span>}
                        </div>
                        {member.user === group.createdBy && (
                            <span className="owner-badge">Group Owner</span>
                        )}
                    </div>
                        <div className="btn-group">
                            {group.createdBy === user._id && member.user !== user._id && (
                                <button
                                    className="btn btn-danger btn-sm"
                                    onClick={() => handleRemoveMember(member.user)}
                                >
                                    <i className="fas fa-user-minus"></i> Remove
                                </button>
                            )}
                            {/* QR Code button - show for all members */}
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => openQrModal(member)}
                            >
                                <i className="fas fa-qrcode"></i> QR Code
                            </button>
                        </div>
                    </li>
                ))}
            </ul>

            {/* Pending Invitations Section */}
            {group.invitations && group.invitations.filter(invite => invite.status === 'pending').length > 0 && (
                <div className="pending-invitations">
                    <h3>Pending Invitations</h3>
                    <ul className="invitations-list">
                        {group.invitations
                            .filter(invite => invite.status === 'pending')
                            .map(invite => (<li key={invite.user} className="invitation-item">
                                <div className="invitation-info">
                                    <span className="invitee-name">{invite.name}</span>
                                    <div className="invitee-contact">
                                        {invite.invitedVia === 'email' ? (
                                            <span className="invitee-email">{invite.email}</span>
                                        ) : (
                                            <span className="invitee-phone">{invite.phone}</span>
                                        )}
                                    </div>
                                    <span className="invitation-status">Pending</span>
                                </div>
                            </li>
                            ))}
                    </ul>
                </div>
            )}                {/* Invite member form */}                <form onSubmit={handleInviteMember} className="invite-member-form">
                <h3>Invite New Member</h3>
                <p>Invite a person to this group by email or phone number.</p>

                <div className="invite-method-selector">
                    <div>
                        <input
                            type="radio"
                            id="email-invite"
                            name="inviteMethod"
                            value="email"
                            checked={inviteMethod === 'email'}
                            onChange={(e) => setInviteMethod(e.target.value)}
                        />
                        <label htmlFor="email-invite">Email</label>
                    </div>
                    <div>
                        <input
                            type="radio"
                            id="phone-invite"
                            name="inviteMethod"
                            value="phone"
                            checked={inviteMethod === 'phone'}
                            onChange={(e) => setInviteMethod(e.target.value)}
                        />
                        <label htmlFor="phone-invite">Phone Number</label>
                    </div>
                </div>

                <div className="form-group">
                    {inviteMethod === 'email' ? (
                        <input
                            type="email"
                            placeholder="Enter email"
                            value={newMemberEmail}
                            onChange={(e) => setNewMemberEmail(e.target.value)}
                            required
                        />
                    ) : (
                        <input
                            type="tel"
                            placeholder="Enter phone"
                            value={newMemberPhone}
                            onChange={(e) => setNewMemberPhone(e.target.value)}
                            required
                        />
                    )}
                    <button type="submit" className="btn btn-primary">
                        <i className="fas fa-paper-plane"></i> Send Invitation
                    </button>
                </div>
            </form>
        </div>                <div className="expenses-section">
                <h2>Expenses</h2>
                {expenses.length === 0 ? (
                    <div className="empty-state">
                        <i className="fas fa-receipt empty-icon"></i>
                        <p>No expenses yet. Add one to get started!</p>
                        <Link to={`/expenses/add/${id}`} className="btn btn-primary">
                            <i className="fas fa-plus-circle"></i> Add First Expense
                        </Link>
                    </div>
                ) : (
                    <div className="expenses-list">
                        {expenses.map(expense => (
                            <div key={expense._id} className="expense-item">                                    <div className="expense-header">
                                <h3>{expense.description}</h3>
                                <span className="expense-amount">Rs. {expense.amount.toFixed(2)}</span>
                                {expense.paidBy.user === user._id && (
                                    <button
                                        className="btn btn-danger btn-sm"
                                        onClick={async () => {
                                            try {
                                                if (window.confirm('Are you sure you want to delete this expense?')) {
                                                    await axios.delete(`/expenses/${expense._id}`);
                                                    // Update the expenses state immediately
                                                    setExpenses(prevExpenses =>
                                                        prevExpenses.filter(e => e._id !== expense._id)
                                                    );
                                                    // Emit socket event for real-time update
                                                    if (socket) {
                                                        console.log('Emitting expense_deleted event');
                                                        socket.emit('expense_deleted', {
                                                            groupId: id,
                                                            expenseId: expense._id
                                                        });
                                                    }
                                                }
                                            } catch (err) {
                                                setError('Failed to delete expense');
                                                console.error('Error deleting expense:', err);
                                            }
                                        }}
                                    >
                                        <i className="fas fa-trash-alt"></i> Delete
                                    </button>
                                )}
                            </div><div className="expense-details">
                                    <p>Paid by: {expense.paidBy.name}</p>
                                    <p>Date: {new Date(expense.date).toLocaleDateString()} {new Date(expense.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    <p>Category: {expense.category}</p>
                                </div>
                                <div className="expense-splits">
                                    <h4>Split Among:</h4>
                                    <ul>
                                        {expense.splitAmong.map(split => (
                                            <li key={split.user} className="split-item">
                                                <span>{split.name}: Rs. {split.amount.toFixed(2)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>

        {/* QR Code Modal - for displaying member QR codes */}
        <QRCodeModal
            isOpen={qrModalOpen}
            onClose={() => setQrModalOpen(false)}
            title="Payment QR Code"
            qrCodeUrl={selectedUser?.paymentQRCode || ''}
            userName={selectedUser?.name || ''}
            selectedUser={selectedUser}
        />
    </section>
    );
};

export default GroupDetail;