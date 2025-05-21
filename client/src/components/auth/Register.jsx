import { useState, useContext } from 'react';
import { Link, Navigate } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../../context/AuthContext';
import './Register.css';

const Register = () => {
    const { isAuthenticated, setUser, setIsAuthenticated } = useContext(AuthContext);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        password2: ''
    });

    const [error, setError] = useState('');

    const { name, email, phone, password, password2 } = formData;

    const onChange = e => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const onSubmit = async e => {
        e.preventDefault();

        // Validate passwords match
        if (password !== password2) {
            setError('Passwords do not match');
            return;
        } try {
            const res = await axios.post('/users/register', {
                name,
                email,
                phone,
                password
            });

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
            setError(err.response.data.message || 'Registration failed');
            console.error('Registration error:', err.response.data);
        }
    };

    // Redirect if authenticated
    if (isAuthenticated) {
        return <Navigate to="/dashboard" />;
    }

    return (
        <section className="container">
            <h1>Sign Up</h1>
            <p>Create Your Account</p>

            {error && <div className="alert alert-danger">{error}</div>}

            <form onSubmit={onSubmit}>
                <div className="form-group">
                    <input
                        type="text"
                        placeholder="Name"
                        name="name"
                        value={name}
                        onChange={onChange}
                        required
                    />
                </div>                <div className="form-group">
                    <input
                        type="email"
                        placeholder="Email Address"
                        name="email"
                        value={email}
                        onChange={onChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <input
                        type="tel"
                        placeholder="Phone Number"
                        name="phone"
                        value={phone}
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
                <div className="form-group">
                    <input
                        type="password"
                        placeholder="Confirm Password"
                        name="password2"
                        value={password2}
                        onChange={onChange}
                        minLength="6"
                        required
                    />
                </div>
                <input type="submit" className="btn btn-primary" value="Register" />
            </form>
            <p className="my-1">
                Already have an account? <Link to="/login">Sign In</Link>
            </p>
        </section>
    );
};

export default Register; 