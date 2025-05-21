/**
 * Graph Algorithms for Expense Sharing
 * 
 * This file contains implementations of graph algorithms used for:
 * 1. Building a debt graph
 * 2. Simplifying transactions using a modified version of Depth-First Search
 * 3. Finding the optimal settlement plan using a greedy approach
 */

/**
 * Creates a debt graph from expenses
 * Time Complexity: O(n) where n is the number of expenses
 * @param {Array} expenses - List of expense objects
 * @returns {Object} - Adjacency list representation of the debt graph
 */
function buildDebtGraph(expenses) {
    const graph = {};

    // Initialize graph
    expenses.forEach(expense => {
        const paidBy = expense.paidBy.user.toString();

        if (!graph[paidBy]) {
            graph[paidBy] = {};
        }

        expense.splitAmong.forEach(split => {
            const user = split.user.toString();

            if (user !== paidBy && !split.settled) {
                if (!graph[user]) {
                    graph[user] = {};
                }

                // User owes paidBy
                if (!graph[user][paidBy]) {
                    graph[user][paidBy] = 0;
                }
                graph[user][paidBy] += split.amount;

                // Adjust if paidBy also owes user
                if (graph[paidBy][user]) {
                    if (graph[paidBy][user] >= graph[user][paidBy]) {
                        graph[paidBy][user] -= graph[user][paidBy];
                        graph[user][paidBy] = 0;
                    } else {
                        graph[user][paidBy] -= graph[paidBy][user];
                        graph[paidBy][user] = 0;
                    }
                }
            }
        });
    });

    return graph;
}

/**
 * Simplifies the debt graph to minimize the number of transactions
 * Uses a modified DFS to find and eliminate cycles
 * Time Complexity: O(V + E) where V is number of users and E is number of debts
 * @param {Object} graph - Adjacency list representation of the debt graph
 * @returns {Object} - Simplified debt graph
 */
function simplifyTransactions(graph) {
    const visited = new Set();
    const simplified = JSON.parse(JSON.stringify(graph)); // Deep copy

    function dfs(node, path = []) {
        if (visited.has(node)) return;

        visited.add(node);
        path.push(node);

        // Check for cycles
        for (const neighbor in simplified[node]) {
            if (simplified[node][neighbor] > 0) {
                const cycleStart = path.indexOf(neighbor);

                if (cycleStart !== -1) {
                    // Found a cycle, simplify it
                    const cycle = path.slice(cycleStart);
                    simplifyCycle(simplified, cycle);
                } else {
                    dfs(neighbor, [...path]);
                }
            }
        }
    }

    // Start DFS from each node
    for (const node in simplified) {
        if (!visited.has(node)) {
            dfs(node);
        }
    }

    return simplified;
}

/**
 * Helper function to simplify a cycle in the debt graph
 * @param {Object} graph - The debt graph
 * @param {Array} cycle - Array of nodes forming a cycle
 */
function simplifyCycle(graph, cycle) {
    if (cycle.length <= 1) return;

    // Find minimum debt in the cycle
    let minDebt = Infinity;

    for (let i = 0; i < cycle.length; i++) {
        const from = cycle[i];
        const to = cycle[(i + 1) % cycle.length];

        if (graph[from][to]) {
            minDebt = Math.min(minDebt, graph[from][to]);
        }
    }

    if (minDebt === Infinity || minDebt === 0) return;

    // Reduce debts along the cycle
    for (let i = 0; i < cycle.length; i++) {
        const from = cycle[i];
        const to = cycle[(i + 1) % cycle.length];

        if (graph[from][to]) {
            graph[from][to] -= minDebt;

            // Remove edge if debt becomes zero
            if (graph[from][to] === 0) {
                delete graph[from][to];
            }
        }
    }
}

/**
 * Finds the optimal settlement plan using a greedy approach
 * Time Complexity: O(n log n) where n is the number of users
 * @param {Object} graph - Simplified debt graph
 * @returns {Array} - List of transactions for settlement
 */
function findOptimalSettlementPlan(graph) {
    // Calculate net balances for each user
    const balances = {};

    for (const from in graph) {
        if (!balances[from]) balances[from] = 0;

        for (const to in graph[from]) {
            if (!balances[to]) balances[to] = 0;

            balances[from] -= graph[from][to];
            balances[to] += graph[from][to];
        }
    }

    // Separate users into creditors and debtors
    const creditors = [];
    const debtors = [];

    for (const user in balances) {
        if (balances[user] > 0) {
            creditors.push({ user, amount: balances[user] });
        } else if (balances[user] < 0) {
            debtors.push({ user, amount: -balances[user] });
        }
    }

    // Sort by amount (descending)
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    // Generate settlement plan
    const settlements = [];
    let i = 0, j = 0;

    while (i < creditors.length && j < debtors.length) {
        const creditor = creditors[i];
        const debtor = debtors[j];

        const amount = Math.min(creditor.amount, debtor.amount);

        if (amount > 0) {
            settlements.push({
                from: debtor.user,
                to: creditor.user,
                amount
            });
        }

        creditor.amount -= amount;
        debtor.amount -= amount;

        if (creditor.amount <= 0.001) i++;
        if (debtor.amount <= 0.001) j++;
    }

    return settlements;
}

/**
 * Analyzes the expense distribution in a group
 * @param {Array} expenses - List of expense objects
 * @returns {Object} - Analysis results
 */
function analyzeExpenseDistribution(expenses) {
    const userExpenses = {};
    const categoryExpenses = {};
    let totalAmount = 0;

    expenses.forEach(expense => {
        const paidBy = expense.paidBy.user.toString();
        const amount = expense.amount;
        const category = expense.category;

        // Update total amount
        totalAmount += amount;

        // Update user expenses
        if (!userExpenses[paidBy]) {
            userExpenses[paidBy] = 0;
        }
        userExpenses[paidBy] += amount;

        // Update category expenses
        if (!categoryExpenses[category]) {
            categoryExpenses[category] = 0;
        }
        categoryExpenses[category] += amount;
    });

    return {
        userExpenses,
        categoryExpenses,
        totalAmount
    };
}

module.exports = {
    buildDebtGraph,
    simplifyTransactions,
    findOptimalSettlementPlan,
    analyzeExpenseDistribution
}; 