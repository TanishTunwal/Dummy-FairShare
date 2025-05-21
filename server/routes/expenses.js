const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const auth = require('../middleware/auth');

// @route   POST /api/expenses
// @desc    Add a new expense
// @access  Private
router.post('/', auth, expenseController.addExpense);

// @route   GET /api/expenses/group/:groupId
// @desc    Get all expenses for a group
// @access  Private
router.get('/group/:groupId', auth, expenseController.getGroupExpenses);

// @route   GET /api/expenses/settlement/:groupId
// @desc    Get settlement plan for a group
// @access  Private
router.get('/settlement/:groupId', auth, expenseController.getSettlementPlan);

// @route   PUT /api/expenses/settle/:expenseId
// @desc    Mark an expense as settled for a user
// @access  Private
router.put('/settle/:expenseId', auth, expenseController.settleExpense);

// @route   GET /api/expenses/analysis/:groupId
// @desc    Get expense analysis for a group
// @access  Private
router.get('/analysis/:groupId', auth, expenseController.getExpenseAnalysis);

// @route   DELETE /api/expenses/:expenseId
// @desc    Delete an expense
// @access  Private
router.delete('/:expenseId', auth, expenseController.deleteExpense);

// @route   POST /api/expenses/settlement-request/:groupId
// @desc    Request settlement for a payment
// @access  Private
router.post('/settlement-request/:groupId', auth, expenseController.requestSettlement);

// @route   PUT /api/expenses/settlement-response/:groupId
// @desc    Respond to a settlement request
// @access  Private
router.put('/settlement-response/:groupId', auth, expenseController.respondToSettlement);

module.exports = router; 