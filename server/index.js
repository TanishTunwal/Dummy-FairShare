const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// Import routes
const userRoutes = require('./routes/users');
const groupRoutes = require('./routes/groups');
const expenseRoutes = require('./routes/expenses');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
    // Allow requests from anywhere on the local network
    origin: true,
    credentials: true
}));
app.use(express.json());
// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/expense-sharing-daa')
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// Socket.io setup
const io = new Server(server, {
    cors: {
        origin: true, // Allow connections from anywhere on the local network
        methods: ['GET', 'POST'],
        credentials: true
    },
    pingTimeout: 60000 // Increase ping timeout to prevent premature disconnects
});

// Socket.io connection
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join a group room
    socket.on('join_group', (groupId) => {
        socket.join(groupId);
        console.log(`User ${socket.id} joined group: ${groupId}`);
    });

    // Leave a group room
    socket.on('leave_group', (groupId) => {
        socket.leave(groupId);
        console.log(`User ${socket.id} left group: ${groupId}`);
    });

    // New expense added
    socket.on('expense_added', (data) => {
        console.log('Expense added:', data);
        io.to(data.groupId).emit('expense_added', data);
    });

    // Settlement request
    socket.on('settlement_request', (data) => {
        console.log('Settlement request:', data);
        // Broadcast to all members in the group room including sender
        io.in(data.groupId).emit('settlement_update', {
            type: 'request',
            fromUser: data.fromUser,
            toUser: data.toUser,
            amount: data.amount,
            status: 'pending',
            timestamp: new Date().toISOString()
        });
    });

    // Settlement response
    socket.on('settlement_response', (data) => {
        console.log('Settlement response:', data);
        // Broadcast to all members in the group room including sender
        io.in(data.groupId).emit('settlement_update', {
            type: 'response',
            fromUser: data.fromUser,
            toUser: data.toUser,
            amount: data.amount,
            action: data.action,
            status: data.status,
            timestamp: new Date().toISOString()
        });
    });

    // Expense deleted
    socket.on('expense_deleted', (data) => {
        console.log('Expense deleted:', data);
        io.to(data.groupId).emit('expense_deleted', data);
    });

    // Member removed
    socket.on('member_removed', (data) => {
        io.to(data.groupId).emit('member_removed', data);
    });

    // Group deleted
    socket.on('group_deleted', (data) => {
        io.emit('group_deleted', data);
    });

    // Group invitation sent
    socket.on('invitation_sent', (data) => {
        console.log('Invitation sent:', data);
        socket.broadcast.emit('invitation_received', data);
    });

    // Invitation response (accept/reject)
    socket.on('invitation_response', (data) => {
        console.log('Invitation response:', data);
        // Broadcast to the group room
        io.to(data.groupId).emit('invitation_response', data);
        // Also broadcast to all sockets to update dashboards
        socket.broadcast.emit('invitation_response', data);
    });

    // Member added to group
    socket.on('member_added', (data) => {
        console.log('Member added to group:', data);
        // Broadcast to all sockets to update their dashboards if needed
        io.emit('member_added', data);
    });

    // Disconnect
    socket.on('disconnect', (reason) => {
        console.log(`User disconnected: ${socket.id}, reason: ${reason}`);
        // Clean up any rooms this socket was in
        Array.from(socket.rooms).forEach(room => {
            if (room !== socket.id) {
                console.log(`Auto-leaving room: ${room} due to disconnect`);
                socket.leave(room);
            }
        });
    });
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/expenses', expenseRoutes);

// Root route
app.get('/', (req, res) => {
    res.send('Expense Sharing DAA API is running');
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    // Display local IP addresses
    require('./showLocalIp');
});