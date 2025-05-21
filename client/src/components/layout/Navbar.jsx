import { useContext, useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';

const Navbar = () => {
    const { user, isAuthenticated, setUser, setIsAuthenticated } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();
    const [isLandingPage, setIsLandingPage] = useState(false);
    
    useEffect(() => {
        setIsLandingPage(location.pathname === '/');
    }, [location]);

    const handleLogout = () => {
        // Clear user data and token
        localStorage.removeItem('token');
        setUser(null);
        setIsAuthenticated(false);

        // Redirect to login
        navigate('/login');
    };
    
    // Get user's first initial for profile avatar
    const getUserInitial = () => {
        if (user && user.name) {
            return user.name.charAt(0).toUpperCase();
        }
        return 'U';
    };

    const authLinks = (
        <ul>
            <li>
                <Link to="/dashboard">
                    <i className="fas fa-th-large"></i> Dashboard
                </Link>
            </li>
            <li className="profile-menu-item">
                <Link to="/profile" className="profile-link">
                    <div className="profile-avatar">
                        {getUserInitial()}
                    </div>
                    <span>Profile</span>
                </Link>
            </li>
            <li>
                <a href="#!" onClick={handleLogout} className="logout-btn">
                    <i className="fas fa-sign-out-alt"></i> Logout
                </a>
            </li>
        </ul>
    );

    const guestLinks = (
        <ul>
            <li>
                <Link to="/login" className="login-btn">
                    <i className="fas fa-sign-in-alt"></i> Log in
                </Link>
            </li>
            <li>
                <Link to="/register" className="signup-btn">
                    <i className="fas fa-user-plus"></i> Sign up
                </Link>
            </li>
        </ul>
    );

    return (
        <nav className={`navbar ${isLandingPage ? 'navbar-landing' : ''}`}>
            <div className="container navbar-container">
                <h1>
                    <Link to="/" className="brand">
                        <i className="fas fa-wallet logo-icon"></i>
                        <span className="brand-text">
                            <span className="brand-highlight">Fair</span>
                            <span>Share</span>
                        </span>
                    </Link>
                </h1>
                <div className="navbar-links">
                    {isAuthenticated ? authLinks : guestLinks}
                </div>
            </div>
        </nav>
    );
};

export default Navbar; 