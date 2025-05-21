import { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import AuthContext from "../../context/AuthContext";
import Loader from "../layout/Loader";
import QRUploadModal from "../layout/QRUploadModal";
import "./Dashboard.css";

const Dashboard = () => {
    const { user, socket } = useContext(AuthContext);
    const [groups, setGroups] = useState([]);
    const [invitations, setInvitations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showQRCodeNotification, setShowQRCodeNotification] = useState(false);
    const [qrModalOpen, setQRModalOpen] = useState(false);

    // Fetch user's groups and invitations
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch groups
                const groupsRes = await axios.get("/groups");
                setGroups(groupsRes.data);

                // Fetch pending invitations
                const invitationsRes = await axios.get("/groups/invitations/pending");
                setInvitations(invitationsRes.data);

                setLoading(false);
            } catch (err) {
                setError("Error fetching data");
                console.error("Error fetching data:", err);
                setLoading(false);
            }
        };

        fetchData();
    }, []); // Listen for real-time updates
    useEffect(() => {
        if (socket && user) {
            // Listen for new expense notifications
            socket.on("expense_added", (data) => {
                console.log("New expense added:", data);
                // You could update the UI or show a notification here
            });

            // Listen for settlement updates
            socket.on("settlement_update", (data) => {
                console.log("Settlement update:", data);
                // You could update the UI or show a notification here
            });

            // Listen for group deletions
            socket.on("group_deleted", (data) => {
                setGroups((prevGroups) =>
                    prevGroups.filter((group) => group._id !== data.groupId),
                );
            });

            // Listen for new invitations and automatically refresh the invitations list
            socket.on("invitation_received", (data) => {
                // Check if the invitation is for the current user
                if (user && data.invitedEmail === user.email) {
                    console.log("New invitation received for current user");
                    // Fetch the updated invitation list
                    axios
                        .get("/groups/invitations/pending")
                        .then((res) => setInvitations(res.data))
                        .catch((err) => console.error("Error fetching invitations:", err));
                }
            });

            // Listen for member added events
            socket.on("member_added", (data) => {
                console.log("Member added event received:", data);
                // Refresh the groups list for everyone to see updates
                axios
                    .get("/groups")
                    .then((res) => setGroups(res.data))
                    .catch((err) => console.error("Error fetching groups:", err));
            });

            // Set up a polling interval to refresh data periodically
            const intervalId = setInterval(() => {
                console.log("Refreshing dashboard data..."); // Refresh invitations
                axios
                    .get("/groups/invitations/pending")
                    .then((response) => setInvitations(response.data))
                    .catch((err) => console.error("Error fetching invitations:", err));

                // Refresh groups
                axios
                    .get("/groups")
                    .then((response) => setGroups(response.data))
                    .catch((err) => console.error("Error fetching groups:", err));
            }, 15000); // Refresh every 15 seconds

            return () => {
                if (socket) {
                    socket.off("expense_added");
                    socket.off("settlement_update");
                    socket.off("group_deleted");
                    socket.off("invitation_received");
                    socket.off("member_added");
                }
                clearInterval(intervalId);
            };
        }

        return () => {
            if (socket) {
                socket.off("expense_added");
                socket.off("settlement_update");
                socket.off("group_deleted");
                socket.off("invitation_received");
                socket.off("member_added");
            }
        };
    }, [socket, user]);
    const handleDeleteGroup = async (groupId) => {
        try {
            if (
                window.confirm(
                    "Are you sure you want to delete this group? This action cannot be undone.",
                )
            ) {
                await axios.delete(`/groups/${groupId}`);
                // Update groups state immediately
                setGroups((prevGroups) =>
                    prevGroups.filter((group) => group._id !== groupId),
                );
                // Emit socket event for real-time update
                if (socket) {
                    socket.emit("group_deleted", { groupId });
                }
            }
        } catch (err) {
            setError("Failed to delete group");
            console.error("Error deleting group:", err);
        }
    };
    const handleInvitationResponse = async (groupId, response) => {
        try {
            await axios.post(`/groups/${groupId}/invitations/respond`, { response });

            // Remove invitation from the list
            setInvitations((prevInvitations) =>
                prevInvitations.filter(
                    (invitation) => invitation.group.toString() !== groupId,
                ),
            );

            // If accepted, add the group to the groups list
            if (response === "accept") {
                // Fetch the updated group list
                const groupsRes = await axios.get("/groups");
                setGroups(groupsRes.data);
            }

            // Emit socket event for real-time update
            if (socket) {
                const responseData = {
                    groupId,
                    userId: user._id,
                    userName: user.name,
                    userEmail: user.email,
                    status: response,
                };

                socket.emit("invitation_response", responseData);

                // If accepted, also emit member_added event
                if (response === "accept") {
                    socket.emit("member_added", {
                        groupId,
                        userId: user._id,
                        userName: user.name,
                        userEmail: user.email,
                    });

                    // Join the group socket room
                    socket.emit("join_group", groupId);
                }
            }
        } catch (err) {
            setError(`Failed to ${response} invitation`);
            console.error(`Error ${response}ing invitation:`, err);
        }
    };  // Check if user has uploaded QR code
    useEffect(() => {
        if (user && !loading) {
            console.log("Checking if user has QR code:", user.paymentQRCode ? "Yes" : "No");
            // If user doesn't have a payment QR code, show notification
            // Notification will stay visible until the user uploads a QR code
            setShowQRCodeNotification(!user.paymentQRCode);
        }
    }, [user, loading]);

    if (loading) {
        return (
            <div className="container">
                <Loader size="large" />
            </div>
        );
    }

    return (
        <section className="container dashboard-container animate-fade-in">
            <header className="dashboard-header">
                <h1>Dashboard</h1>
                <p className="lead">
                    <i className="fas fa-user-circle"></i> Welcome {user && user.name}
                </p>
                {error && <div className="alert alert-danger">{error}</div>}
            </header>

            {/* QR Code Notification */}
            {showQRCodeNotification && (
                <div className="alert alert-info qr-code-alert">
                    <div className="qr-alert-content">
                        <i className="fas fa-info-circle"></i>
                        <span>
                            Add your payment QR code to make it easier for others to pay you
                        </span>
                    </div>
                    <button
                        onClick={() => setQRModalOpen(true)}
                        className="btn btn-sm btn-primary"
                    >
                        Add QR Code
                    </button>
                </div>
            )}

            {/* QR Code Upload Modal */}
            <QRUploadModal
                isOpen={qrModalOpen}
                onClose={() => {
                    console.log("QR modal closed");
                    setQRModalOpen(false);
                }}
                onSuccess={() => {
                    console.log("QR upload successful, hiding notification");
                    setShowQRCodeNotification(false);
                }}
            />

            {/* Group Invitations Section */}
            {invitations.length > 0 && (
                <div className="invitations-section animate-slide-up">
                    <h2 className="section-title">
                        <i className="fas fa-envelope mr-2"></i> Pending Invitations
                    </h2>
                    <div className="invitations">
                        {invitations.map((invitation) => (
                            <div key={invitation.group} className="invitation">
                                <div className="invitation-details">
                                    <h3>{invitation.groupName}</h3>
                                    <p>
                                        <i className="fas fa-user mr-1"></i> Invited by:{" "}
                                        {invitation.inviterName}
                                    </p>
                                    <p>
                                        <i className="fas fa-calendar-alt mr-1"></i> Sent:{" "}
                                        {new Date(invitation.sentAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="invitation-actions">
                                    <button
                                        className="btn btn-success mr-2"
                                        onClick={() =>
                                            handleInvitationResponse(invitation.group, "accept")
                                        }
                                    >
                                        <i className="fas fa-check"></i> Accept
                                    </button>
                                    <button
                                        className="btn btn-danger"
                                        onClick={() =>
                                            handleInvitationResponse(invitation.group, "reject")
                                        }
                                    >
                                        <i className="fas fa-times"></i> Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="dashboard-actions animate-slide-up">
                <Link to="/groups/create" className="btn btn-primary">
                    <i className="fas fa-plus-circle"></i> Create New Group
                </Link>
            </div>

            <div className="groups-section animate-slide-up">
                <h2 className="section-title">
                    <i className="fas fa-users mr-2"></i> Your Groups
                </h2>

                {groups.length === 0 ? (
                    <p className="text-center">
                        <i className="fas fa-info-circle mr-2"></i>
                        You haven't joined any groups yet. Create one to get started!
                    </p>
                ) : (
                    <div className="groups">
                        {groups.map((group) => (
                            <div key={group._id} className="group">
                                <div className="group-details">
                                    <h2>{group.name}</h2>
                                    <p>{group.description || "No description provided"}</p>
                                    <div className="group-stats">
                                        <span className="badge badge-primary">
                                            <i className="fas fa-users mr-1"></i>{" "}
                                            {group.members.length} Members
                                        </span>
                                    </div>
                                </div>
                                <div className="group-actions">
                                    <Link
                                        to={`/groups/${group._id}`}
                                        className="btn btn-primary btn-sm"
                                    >
                                        <i className="fas fa-eye"></i> View
                                    </Link>
                                    {group.createdBy === user._id && (
                                        <button
                                            className="btn btn-danger btn-sm"
                                            onClick={() => handleDeleteGroup(group._id)}
                                        >
                                            <i className="fas fa-trash"></i> Delete
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};

export default Dashboard;
