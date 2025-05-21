import { useState, useContext } from 'react';
import { Link, Navigate } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../../context/AuthContext';
import './Login.css';

const Login = () => {
    const { isAuthenticated, setUser, setIsAuthenticated } = useContext(AuthContext);

    const [formData, setFormData] = useState({
        identifier: '',
        password: ''
    });

    const [loginMethod, setLoginMethod] = useState('email');
    const [error, setError] = useState('');

    const { identifier, password } = formData;

    const onChange = e => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const onSubmit = async e => {
        e.preventDefault();

        try {
            // Create request body based on login method
            const requestBody = {
                password
            };

            // Add either email or phone based on login method
            if (loginMethod === 'email') {
                requestBody.email = identifier;
            } else {
                requestBody.phone = identifier;
            }

            const res = await axios.post('/users/login', requestBody);

            // Save token to localStorage
            localStorage.setItem('token', res.data.token);

            // Set auth token header
            axios.defaults.headers.common['x-auth-token'] = res.data.token;

            // Get user data
            const userRes = await axios.get('/users/profile');

            // Set user and auth state
            setUser(userRes.data);
            setIsAuthenticated(true);

        } catch (err) {
            setError(err.response.data.message || 'Login failed');
            console.error('Login error:', err.response.data);
        }
    };

    // Redirect if authenticated
    if (isAuthenticated) {
        return <Navigate to="/dashboard" />;
    }

    return (
        <section className="container">
            <h1>Sign In</h1>
            <p>Sign Into Your Account</p>

            {error && <div className="alert alert-danger">{error}</div>}

            <form onSubmit={onSubmit}>
                <div className="login-method-selector">
                    <div>
                        <input
                            type="radio"
                            id="email-login"
                            name="loginMethod"
                            value="email"
                            checked={loginMethod === 'email'}
                            onChange={() => setLoginMethod('email')}
                        />
                        <label htmlFor="email-login">Email</label>
                    </div>
                    <div>
                        <input
                            type="radio"
                            id="phone-login"
                            name="loginMethod"
                            value="phone"
                            checked={loginMethod === 'phone'}
                            onChange={() => setLoginMethod('phone')}
                        />
                        <label htmlFor="phone-login">Phone Number</label>
                    </div>
                </div>

                <div className="form-group">
                    <input
                        type={loginMethod === 'email' ? 'email' : 'tel'}
                        placeholder={loginMethod === 'email' ? 'Email Address' : 'Phone Number'}
                        name="identifier"
                        value={identifier}
                        onChange={onChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <input
                        type="password"
                        placeholder="Password"
                        name="password"
                        value={password}
                        onChange={onChange}
                        minLength="6"
                        required
                    />
                </div>
                <input type="submit" className="btn btn-primary" value="Login" />
            </form>
            <p className="my-1">
                Don't have an account? <Link to="/register">Sign Up</Link>
            </p>
        </section>
    );
};

export default Login;