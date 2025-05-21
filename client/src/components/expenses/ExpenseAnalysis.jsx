import { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, Cell, ResponsiveContainer } from 'recharts';
import AuthContext from '../../context/AuthContext';
import './ExpenseAnalysisStyles.css';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#8DD1E1'];

const ExpenseAnalysis = () => {
    const { groupId } = useParams();
    const { socket } = useContext(AuthContext);
    const [group, setGroup] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');    // Fetch group and analysis data
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Get group details
                const groupRes = await axios.get(`/groups/${groupId}`);
                setGroup(groupRes.data);                // Get expense analysis
                const analysisRes = await axios.get(`/expenses/analysis/${groupId}`);

                // If analysis contains expense entries that need to be sorted
                if (analysisRes.data && analysisRes.data.recentExpenses) {
                    analysisRes.data.recentExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));
                }

                setAnalysis(analysisRes.data);

                setLoading(false);
            } catch (err) {
                setError('Error fetching analysis data');
                console.error('Error fetching analysis data:', err);
                setLoading(false);
            }
        };

        fetchData();

        // Set up socket event listeners for real-time updates
        if (socket) {
            // Join the group room
            socket.emit('join_group', groupId);
            console.log(`Joined group ${groupId} for expense analysis updates`);            // Listen for expense changes that would affect the analysis
            socket.on('expense_added', () => {
                console.log('New expense added, refreshing expense analysis');
                fetchData();
            });

            socket.on('expense_deleted', () => {
                console.log('Expense deleted, refreshing expense analysis');
                fetchData();
            });

            socket.on('settlement_update', () => {
                console.log('Settlement update, refreshing expense analysis');
                fetchData();
            });            // Also listen for member changes that might affect analysis
            socket.on('member_added', (data) => {
                if (data.groupId === groupId) {
                    console.log('Member added, refreshing expense analysis');
                    fetchData();
                }
            });

            socket.on('member_removed', (data) => {
                if (data.groupId === groupId) {
                    console.log('Member removed, refreshing expense analysis');
                    fetchData();
                }
            });
        }

        // Set up a polling interval as a backup for real-time updates
        const intervalId = setInterval(() => {
            console.log('Polling for expense analysis updates');
            fetchData();
        }, 30000); // Poll every 30 seconds

        // Cleanup
        return () => {
            if (socket) {
                socket.emit('leave_group', groupId);
                socket.off('expense_added');
                socket.off('expense_deleted');
                socket.off('settlement_update');
                socket.off('member_added');
                socket.off('member_removed');
            }
            clearInterval(intervalId);
        };
    }, [groupId, socket]);

    if (loading) {
        return (
            <div className="container loading-container">
                <div className="loading-spinner">
                    <i className="fas fa-circle-notch fa-spin"></i>
                </div>
                <p>Loading expense analysis...</p>
            </div>
        );
    }

    if (!analysis) {
        return (
            <div className="container error-container">
                <div className="error-icon">
                    <i className="fas fa-exclamation-triangle"></i>
                </div>
                <h2>No Analysis Data</h2>
                <p>No expense analysis data is available for this group.</p>
                <Link to={`/groups/${groupId}`} className="btn btn-primary">
                    Return to Group
                </Link>
            </div>
        );
    }

    return (
        <section className="container">
            <Link to={`/groups/${groupId}`} className="btn btn-light">
                <i className="fas fa-arrow-left"></i> Back to Group
            </Link>

            <div className="group-header">
                <h1>Expense Analysis</h1>
                <p>Group: {group && group.name}</p>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}
            
            <div className="analysis-content">
                <div className="analysis-summary">
                    <h3>Summary</h3>
                    <p>Total Expenses: Rs. {analysis.totalAmount.toFixed(2)}</p>
                </div>

                <div className="analysis-charts-container">
                    <div className="chart-wrapper">
                        <h3>Expenses by Category</h3>
                        <ResponsiveContainer width="100%" height={400}>
                            <PieChart>
                                <Pie
                                    data={analysis.categoryExpenses}
                                    dataKey="amount"
                                    nameKey="category"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={120}
                                    fill="#8884d8"
                                    label={({ category, percentage }) => `${category}: ${percentage.toFixed(1)}%`}
                                >
                                    {analysis.categoryExpenses.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => `Rs. ${value.toFixed(2)}`} />
                                <Legend layout="vertical" verticalAlign="middle" align="right" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="chart-wrapper">
                        <h3>Expenses by User</h3>
                        <ResponsiveContainer width="100%" height={400}>
                            <BarChart
                                data={analysis.userExpenses}
                                margin={{ top: 20, right: 30, left: 30, bottom: 20 }}
                            >
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip formatter={(value) => `Rs. ${value.toFixed(2)}`} />
                                <Legend />
                                <Bar dataKey="amount" fill="#8884d8">
                                    {analysis.userExpenses.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="analysis-details">
                    <h3>Expense Distribution</h3>
                    <div className="distribution-tables">
                        <div className="distribution-table">
                            <h4>By Category</h4>
                            <div className="table-responsive">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Category</th>
                                            <th>Amount</th>
                                            <th>Percentage</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {analysis.categoryExpenses.map((category, index) => (
                                            <tr key={index}>
                                                <td>{category.category}</td>
                                                <td>Rs. {category.amount.toFixed(2)}</td>
                                                <td>{category.percentage.toFixed(2)}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="distribution-table">
                            <h4>By User</h4>
                            <div className="table-responsive">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>User</th>
                                            <th>Amount</th>
                                            <th>Percentage</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {analysis.userExpenses.map((user, index) => (
                                            <tr key={index}>
                                                <td>{user.name}</td>
                                                <td>Rs. {user.amount.toFixed(2)}</td>
                                                <td>{user.percentage.toFixed(2)}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ExpenseAnalysis;