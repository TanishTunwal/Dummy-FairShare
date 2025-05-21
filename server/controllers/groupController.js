const Group = require('../models/Group');
const User = require('../models/User');
const Expense = require('../models/Expense');

// Helper function to check if a user has unsettled expenses in a group
const hasUnsettledExpenses = async (userId, groupId) => {
    const expenses = await Expense.find({ group: groupId });

    return expenses.some(expense => {
        // Case 1: User is part of an expense and hasn't settled it
        const userSplit = expense.splitAmong.find(split => split.user.toString() === userId);
        if (userSplit && !userSplit.settled && expense.paidBy.user.toString() !== userId) {
            return true;
        }

        // Case 2: User paid for an expense and others haven't settled with them
        if (expense.paidBy.user.toString() === userId) {
            return expense.splitAmong.some(split =>
                split.user.toString() !== userId && !split.settled
            );
        }

        return false;
    });
};

// Create a new group
exports.createGroup = async (req, res) => {
    try {
        const { name, description } = req.body;

        // Get current user
        const user = await User.findById(req.user.id);

        // Create new group
        const newGroup = new Group({
            name,
            description,
            members: [{
                user: req.user.id,
                name: user.name,
                email: user.email,
                phone: user.phone
            }],
            createdBy: req.user.id
        });

        // Save group
        const group = await newGroup.save();

        // Add group to user's groups
        user.groups.push(group._id);
        await user.save();

        res.json(group);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Get all groups for a user
exports.getUserGroups = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const groups = await Group.find({ _id: { $in: user.groups } });

        res.json(groups);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Get a single group by ID
exports.getGroupById = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id)
            .populate('expenses');

        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        // Check if user is a member of the group
        const isMember = group.members.some(member =>
            member.user.toString() === req.user.id
        );

        if (!isMember) {
            return res.status(403).json({ message: 'Not authorized to access this group' });
        }

        res.json(group);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Add a member to a group - Changed to invite member
exports.inviteMember = async (req, res) => {
    try {
        const { email, phone } = req.body;

        if (!email && !phone) {
            return res.status(400).json({ message: 'Email or phone number is required' });
        }

        // Find user by email or phone
        let user;
        let invitedVia = 'email';

        if (email) {
            user = await User.findOne({ email });
            invitedVia = 'email';
        } else if (phone) {
            user = await User.findOne({ phone });
            invitedVia = 'phone';
        }

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Find group
        const group = await Group.findById(req.params.id);
        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        // Check if user is already a member
        const isMember = group.members.some(member =>
            member.user.toString() === user._id.toString()
        );

        if (isMember) {
            return res.status(400).json({ message: 'User is already a member of this group' });
        }

        // Check if invitation already exists
        const invitationExists = group.invitations.some(
            invite => invite.user.toString() === user._id.toString() && invite.status === 'pending'
        );

        if (invitationExists) {
            return res.status(400).json({ message: 'Invitation already sent to this user' });
        }

        // Get current user (inviter) info
        const inviter = await User.findById(req.user.id);        // Add invitation to group
        group.invitations.push({
            user: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            invitedVia,
            status: 'pending'
        });

        await group.save();

        // Add invitation to user
        user.groupInvitations.push({
            group: group._id,
            groupName: group.name,
            invitedBy: req.user.id,
            inviterName: inviter.name,
            status: 'pending'
        });

        await user.save();

        res.json({
            message: 'Invitation sent successfully',
            group
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Process invitation response (accept/reject)
exports.respondToInvitation = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { response } = req.body; // 'accept' or 'reject'

        if (response !== 'accept' && response !== 'reject') {
            return res.status(400).json({ message: 'Invalid response type' });
        }

        // Find user and group
        const user = await User.findById(req.user.id);
        const group = await Group.findById(groupId);

        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        // Find invitation in user's invitations
        const invitationIndex = user.groupInvitations.findIndex(
            invite => invite.group.toString() === groupId && invite.status === 'pending'
        );

        if (invitationIndex === -1) {
            return res.status(404).json({ message: 'No pending invitation found' });
        }

        // Find invitation in group's invitations
        const groupInvitationIndex = group.invitations.findIndex(
            invite => invite.user.toString() === req.user.id && invite.status === 'pending'
        );

        if (groupInvitationIndex === -1) {
            return res.status(404).json({ message: 'Invitation not found in group' });
        }

        // Update status in both user and group
        if (response === 'accept') {            // Add user to group members
            group.members.push({
                user: req.user.id,
                name: user.name,
                email: user.email,
                phone: user.phone
            });

            // Add group to user's groups
            user.groups.push(group._id);

            // Update invitation status
            user.groupInvitations[invitationIndex].status = 'accepted';
            group.invitations[groupInvitationIndex].status = 'accepted';
        } else {
            // Update invitation status to rejected
            user.groupInvitations[invitationIndex].status = 'rejected';
            group.invitations[groupInvitationIndex].status = 'rejected';
        }

        await user.save();
        await group.save();

        res.json({
            message: `Invitation ${response === 'accept' ? 'accepted' : 'rejected'} successfully`,
            group,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Get all pending invitations for current user
exports.getUserInvitations = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        // Filter only pending invitations
        const pendingInvitations = user.groupInvitations.filter(inv => inv.status === 'pending');

        res.json(pendingInvitations);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Remove a member from a group
exports.removeMember = async (req, res) => {
    try {
        const { userId } = req.params;

        // Find group
        const group = await Group.findById(req.params.id);
        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        // Check if user is the group creator
        if (group.createdBy.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to remove members' });
        }

        // Check if user has unsettled expenses
        const hasUnsetExpenses = await hasUnsettledExpenses(userId, req.params.id);
        if (hasUnsetExpenses) {
            return res.status(400).json({
                message: 'This member has unsettled expenses. They must settle all expenses before being removed from the group.'
            });
        }

        // Remove user from group
        group.members = group.members.filter(member =>
            member.user.toString() !== userId
        );

        await group.save();

        // Remove group from user's groups
        const user = await User.findById(userId);
        if (user) {
            user.groups = user.groups.filter(groupId =>
                groupId.toString() !== group._id.toString()
            );
            await user.save();
        }

        res.json(group);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Delete a group
exports.deleteGroup = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);

        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        // Check if user is the creator of the group
        if (group.createdBy.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to delete this group' });
        }

        // Remove group reference from all members
        for (const member of group.members) {
            const user = await User.findById(member.user);
            if (user) {
                user.groups = user.groups.filter(groupId => groupId.toString() !== req.params.id);
                await user.save();
            }
        }

        // Delete all expenses associated with the group
        await Expense.deleteMany({ group: req.params.id });

        // Delete the group
        await Group.findByIdAndDelete(req.params.id);

        res.json({ message: 'Group deleted successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Leave a group (for non-owners)
exports.leaveGroup = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);
        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        // Prevent group owner from leaving
        if (group.createdBy.toString() === req.user.id) {
            return res.status(403).json({ message: 'Group owner cannot leave the group. You can delete the group instead.' });
        }

        // Check if user has unsettled expenses
        const hasUnsetExpenses = await hasUnsettledExpenses(req.user.id, req.params.id);
        if (hasUnsetExpenses) {
            return res.status(400).json({
                message: 'You have unsettled expenses. You must settle all expenses before leaving the group.'
            });
        }

        // Remove user from group members
        const prevLength = group.members.length;
        group.members = group.members.filter(member => member.user.toString() !== req.user.id);
        if (group.members.length === prevLength) {
            return res.status(400).json({ message: 'You are not a member of this group.' });
        }
        await group.save();

        // Remove group from user's groups
        const user = await User.findById(req.user.id);
        user.groups = user.groups.filter(groupId => groupId.toString() !== group._id.toString());
        await user.save();

        res.json({ message: 'Left group successfully', groupId: group._id });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};