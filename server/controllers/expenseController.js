const Expense = require('../models/Expense');
const Group = require('../models/Group');
const User = require('../models/User');
const {
    buildDebtGraph,
    simplifyTransactions,
    findOptimalSettlementPlan,
    analyzeExpenseDistribution
} = require('../algorithms/graphAlgorithms');

// Add a new expense
exports.addExpense = async (req, res) => {
    try {
        const { description, amount, groupId, splitAmong, category } = req.body;

        // Find group
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        // Check if user is a member of the group
        const isMember = group.members.some(member =>
            member.user.toString() === req.user.id
        );

        if (!isMember) {
            return res.status(403).json({ message: 'Not authorized to add expenses to this group' });
        }

        // Get user name
        const user = await User.findById(req.user.id);

        // Create new expense
        const newExpense = new Expense({
            description,
            amount,
            paidBy: {
                user: req.user.id,
                name: user.name
            },
            splitAmong: splitAmong.map(split => ({
                user: split.userId,
                name: split.name,
                amount: split.amount,
                settled: false
            })),
            group: groupId,
            category: category || 'Other'
        });

        // Save expense
        const expense = await newExpense.save();

        // Add expense to group
        group.expenses.push(expense._id);
        await group.save();

        res.json(expense);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Get all expenses for a group
exports.getGroupExpenses = async (req, res) => {
    try {
        const { groupId } = req.params;

        // Find group
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        // Check if user is a member of the group
        const isMember = group.members.some(member =>
            member.user.toString() === req.user.id
        );

        if (!isMember) {
            return res.status(403).json({ message: 'Not authorized to view expenses for this group' });
        }

        // Get expenses
        const expenses = await Expense.find({ group: groupId });

        res.json(expenses);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Get settlement plan for a group
exports.getSettlementPlan = async (req, res) => {
    try {
        const { groupId } = req.params;

        // Find group
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        // Check if user is a member of the group
        const isMember = group.members.some(member =>
            member.user.toString() === req.user.id
        );

        if (!isMember) {
            return res.status(403).json({ message: 'Not authorized to view settlement plan for this group' });
        }

        // Get expenses
        const expenses = await Expense.find({ group: groupId });

        // Build debt graph
        const debtGraph = buildDebtGraph(expenses);

        // Simplify transactions using graph algorithms
        const simplifiedGraph = simplifyTransactions(debtGraph);

        // Find optimal settlement plan
        const settlementPlan = findOptimalSettlementPlan(simplifiedGraph);

        // Add user names and settlement status to settlement plan
        const userMap = {};
        group.members.forEach(member => {
            userMap[member.user] = member.name;
        });

        const formattedPlan = settlementPlan.map(settlement => {
            // Find the relevant expense for this settlement
            const relevantExpense = expenses.find(expense => 
                expense.paidBy.user.toString() === settlement.to &&
                expense.splitAmong.some(split => 
                    split.user.toString() === settlement.from
                )
            );

            // Get settlement status from the expense
            let status = null;
            if (relevantExpense) {
                const split = relevantExpense.splitAmong.find(s => 
                    s.user.toString() === settlement.from
                );
                if (split) {
                    if (split.settled) {
                        status = 'settled';
                    } else if (split.pendingSettlement) {
                        status = 'pending';
                    }
                }
            }

            return {
                from: {
                    id: settlement.from,
                    name: userMap[settlement.from]
                },
                to: {
                    id: settlement.to,
                    name: userMap[settlement.to]
                },
                amount: settlement.amount,
                status: status
            };
        });

        res.json(formattedPlan);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Handle the two-step settlement process
exports.settleExpense = async (req, res) => {
    try {
        const { expenseId } = req.params;
        const { action } = req.body; // 'request' or 'confirm' or 'reject'

        // Find expense
        const expense = await Expense.findById(expenseId);
        if (!expense) {
            return res.status(404).json({ message: 'Expense not found' });
        }

        // If the requester is the one who has to pay (requesting settlement)
        if (action === 'request') {
            // Check if user is part of the expense and is the one who has to pay
            const userSplit = expense.splitAmong.find(split =>
                split.user.toString() === req.user.id
            );

            if (!userSplit) {
                return res.status(403).json({ message: 'Not authorized to settle this expense' });
            }

            // Check if the user is not the one who paid
            if (expense.paidBy.user.toString() === req.user.id) {
                return res.status(403).json({ message: 'You cannot settle an expense you paid for' });
            }

            // Mark as pending settlement
            userSplit.pendingSettlement = true;
            userSplit.settled = false;
            await expense.save();

            res.json(expense);
        }
        // If the requester is the one who paid (confirming settlement)
        else if (action === 'confirm') {
            // Check if user is the one who paid
            if (expense.paidBy.user.toString() !== req.user.id) {
                return res.status(403).json({ message: 'Only the person who paid can confirm settlement' });
            }

            // Get the user ID that the payer is confirming settlement for
            const { userId } = req.body;

            if (!userId) {
                return res.status(400).json({ message: 'User ID is required' });
            }

            // Find the split for the specified user
            const userSplit = expense.splitAmong.find(split =>
                split.user.toString() === userId
            );

            if (!userSplit) {
                return res.status(400).json({ message: 'User not found in expense split' });
            }

            if (!userSplit.pendingSettlement) {
                return res.status(400).json({ message: 'This user has not requested settlement yet' });
            }

            // Mark as settled
            userSplit.pendingSettlement = false;
            userSplit.settled = true;
            await expense.save();

            res.json(expense);
        }
        // If the requester is the one who paid (rejecting settlement)
        else if (action === 'reject') {
            // Check if user is the one who paid
            if (expense.paidBy.user.toString() !== req.user.id) {
                return res.status(403).json({ message: 'Only the person who paid can reject settlement' });
            }

            // Get the user ID that the payer is rejecting settlement for
            const { userId } = req.body;

            if (!userId) {
                return res.status(400).json({ message: 'User ID is required' });
            }

            // Find the split for the specified user
            const userSplit = expense.splitAmong.find(split =>
                split.user.toString() === userId
            );

            if (!userSplit) {
                return res.status(400).json({ message: 'User not found in expense split' });
            }

            if (!userSplit.pendingSettlement) {
                return res.status(400).json({ message: 'This user has not requested settlement yet' });
            }

            // Reset settlement status
            userSplit.pendingSettlement = false;
            userSplit.settled = false;
            await expense.save();

            res.json(expense);
        }
        // If the requester is the user who needs to settle but wants to cancel their request
        else if (action === 'cancel') {
            // Check if user is part of the expense
            const userSplit = expense.splitAmong.find(split =>
                split.user.toString() === req.user.id
            );

            if (!userSplit) {
                return res.status(403).json({ message: 'Not authorized to cancel settlement for this expense' });
            }

            if (!userSplit.pendingSettlement) {
                return res.status(400).json({ message: 'No pending settlement request to cancel' });
            }

            // Reset the pending settlement status
            userSplit.pendingSettlement = false;
            userSplit.settled = false;
            await expense.save();

            res.json(expense);
        }
        else {
            return res.status(400).json({ message: 'Invalid action. Must be "request", "confirm", "reject", or "cancel"' });
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Get expense analysis for a group
exports.getExpenseAnalysis = async (req, res) => {
    try {
        const { groupId } = req.params;

        // Find group
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        // Check if user is a member of the group
        const isMember = group.members.some(member =>
            member.user.toString() === req.user.id
        );

        if (!isMember) {
            return res.status(403).json({ message: 'Not authorized to view analysis for this group' });
        }

        // Get expenses
        const expenses = await Expense.find({ group: groupId });

        // Analyze expenses
        const analysis = analyzeExpenseDistribution(expenses);

        // Add user names to analysis
        const userMap = {};
        group.members.forEach(member => {
            userMap[member.user] = member.name;
        });

        const formattedAnalysis = {
            userExpenses: Object.entries(analysis.userExpenses).map(([userId, amount]) => ({
                userId,
                name: userMap[userId],
                amount,
                percentage: (amount / analysis.totalAmount) * 100
            })),
            categoryExpenses: Object.entries(analysis.categoryExpenses).map(([category, amount]) => ({
                category,
                amount,
                percentage: (amount / analysis.totalAmount) * 100
            })),
            totalAmount: analysis.totalAmount
        };

        res.json(formattedAnalysis);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Delete an expense
exports.deleteExpense = async (req, res) => {
    try {
        const { expenseId } = req.params;

        // Find expense
        const expense = await Expense.findById(expenseId);
        if (!expense) {
            return res.status(404).json({ message: 'Expense not found' });
        }

        // Check if user is the one who created the expense
        if (expense.paidBy.user.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to delete this expense' });
        }

        // Find the group to remove expense reference
        const group = await Group.findById(expense.group);
        if (group) {
            group.expenses = group.expenses.filter(id => id.toString() !== expenseId);
            await group.save();
        }

        // Delete the expense
        await Expense.findByIdAndDelete(expenseId);

        res.json({ message: 'Expense deleted successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Request settlement for a payment
exports.requestSettlement = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { fromUser, toUser, amount } = req.body;

        // Find group
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        // Check if user is a member of the group
        const isMember = group.members.some(member =>
            member.user.toString() === req.user.id
        );

        if (!isMember) {
            return res.status(403).json({ message: 'Not authorized to request settlement in this group' });
        }

        // Find the expense that needs to be settled
        const expense = await Expense.findOne({
            group: groupId,
            'paidBy.user': toUser,
            'splitAmong.user': fromUser,
            'splitAmong.settled': false
        });

        if (!expense) {
            return res.status(404).json({ message: 'No pending expense found to settle' });
        }

        // Update the split to mark it as pending settlement
        const split = expense.splitAmong.find(s => s.user.toString() === fromUser);
        if (!split) {
            return res.status(404).json({ message: 'User not found in expense split' });
        }

        split.pendingSettlement = true;
        await expense.save();

        res.json({ message: 'Settlement request sent successfully', expense });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Respond to a settlement request
exports.respondToSettlement = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { fromUser, toUser, amount, action } = req.body;

        // Find group
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        // Check if user is a member of the group
        const isMember = group.members.some(member =>
            member.user.toString() === req.user.id
        );

        if (!isMember) {
            return res.status(403).json({ message: 'Not authorized to respond to settlement in this group' });
        }

        // Find the expense that needs to be settled
        const expense = await Expense.findOne({
            group: groupId,
            'paidBy.user': toUser,
            'splitAmong.user': fromUser,
            'splitAmong.pendingSettlement': true
        });

        if (!expense) {
            return res.status(404).json({ message: 'No pending settlement request found' });
        }

        // Update the split based on the action
        const split = expense.splitAmong.find(s => s.user.toString() === fromUser);
        if (!split) {
            return res.status(404).json({ message: 'User not found in expense split' });
        }

        if (action === 'accept') {
            split.settled = true;
            split.pendingSettlement = false;
        } else if (action === 'reject') {
            split.settled = false;
            split.pendingSettlement = false;
        } else {
            return res.status(400).json({ message: 'Invalid action' });
        }

        await expense.save();

        // Emit socket event for real-time updates
        if (req.app.get('io')) {
            req.app.get('io').to(groupId).emit('settlement_update', {
                expenseId: expense._id,
                expense: expense
            });
        }

        res.json({ 
            message: `Settlement ${action}ed successfully`, 
            expense,
            status: action === 'accept' ? 'settled' : null
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
}; 