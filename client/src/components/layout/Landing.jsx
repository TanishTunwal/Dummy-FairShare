import { useContext, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import './Landing.css';

const Landing = () => {
    const { isAuthenticated } = useContext(AuthContext);

    // Add landing class to body when component mounts and remove when unmounts
    useEffect(() => {
        document.body.classList.add('has-landing-page');
        
        return () => {
            document.body.classList.remove('has-landing-page');
        };
    }, []);

    if (isAuthenticated) {
        return <Navigate to="/dashboard" />;
    }

    return (
        <section className="landing">
            <div className="landing-inner">
                <div className="landing-container">
                    <div className="landing-content">
                        <Link to="/" className="landing-logo">
                            <i className="fas fa-money-bill-wave"></i>
                            <span className="landing-logo-text">Fair<span className="landing-logo-highlight">Share</span></span>
                        </Link>
                        
                        <h1>
                            Less stress when <br /> 
                            sharing expenses <br />
                            <span className="text-highlight">with anyone.</span>
                        </h1>
                        
                        <div className="landing-icons">
                            <div className="icon-item">
                                <i className="fas fa-plane"></i>
                            </div>
                            <div className="icon-item">
                                <i className="fas fa-home"></i>
                            </div>
                            <div className="icon-item">
                                <i className="fas fa-heart"></i>
                            </div>
                            <div className="icon-item">
                                <i className="fas fa-asterisk"></i>
                            </div>
                        </div>
                        
                        <p className="landing-description">
                            Keep track of your shared expenses and balances with housemates, trips, 
                            groups, friends, and family.
                        </p>
                        
                        <Link to="/register" className="signup-button">
                            Sign up
                        </Link>
                        
                        <div className="landing-platforms">
                            Free for <i className="fab fa-apple"></i> iPhone, <i className="fab fa-android"></i> Android, and web.
                        </div>
                    </div>
                    
                    <div className="landing-graphic">
                        <div className="pattern-graphic"></div>
                        <div className="info-box">
                            <div className="info-icon">
                                <i className="fas fa-lightbulb"></i>
                            </div>
                            <h3>Split Expenses Easily</h3>
                            <p>FairShare automatically calculates who owes what and simplifies group payments.</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Landing; 