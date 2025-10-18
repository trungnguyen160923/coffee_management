import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Header = () => {
    const { isAuthenticated, user, logout } = useAuth();
    const location = useLocation();

    const handleLogout = () => {
        logout();
    };

    const isActive = (path) => {
        return location.pathname === path ? 'active' : '';
    };

    return (
        <nav className="navbar navbar-expand-lg navbar-dark ftco_navbar bg-dark ftco-navbar-light" id="ftco-navbar">
            <div className="container">
                <Link className="navbar-brand" to="/coffee">
                    N.S &nbsp;&nbsp;Coffee<small>Delicious Taste</small>
                </Link>
                <button
                    className="navbar-toggler"
                    type="button"
                    data-toggle="collapse"
                    data-target="#ftco-nav"
                    aria-controls="ftco-nav"
                    aria-expanded="false"
                    aria-label="Toggle navigation"
                >
                    <span className="oi oi-menu"></span> Menu
                </button>
                <div className="collapse navbar-collapse" id="ftco-nav">
                    <ul className="navbar-nav ml-auto">
                        <li className={`nav-item ${isActive('/coffee')}`}>
                            <Link to="/coffee" className="nav-link">Home</Link>
                        </li>
                        <li className={`nav-item ${isActive('/coffee/menu')}`}>
                            <Link to="/coffee/menu" className="nav-link">Menu</Link>
                        </li>
                        <li className={`nav-item ${isActive('/coffee/services')}`}>
                            <Link to="/coffee/services" className="nav-link">Services</Link>
                        </li>
                        <li className={`nav-item ${isActive('/coffee/about')}`}>
                            <Link to="/coffee/about" className="nav-link">About</Link>
                        </li>
                        <li className={`nav-item ${isActive('/coffee/contact')}`}>
                            <Link to="/coffee/contact" className="nav-link">Contact</Link>
                        </li>

                        {/* Cart icon - always visible */}
                        <li className="nav-item cart">
                            <Link to="/coffee/cart" className="nav-link">
                                <span className="icon icon-shopping_cart"></span>
                            </Link>
                        </li>

                        {isAuthenticated ? (
                            <li className="nav-item dropdown">
                                <a
                                    className="nav-link dropdown-toggle"
                                    href="#"
                                    role="button"
                                    data-bs-toggle="dropdown"
                                    aria-expanded="false"
                                >
                                    {user?.fullname || 'User'}
                                </a>
                                <ul className="dropdown-menu">
                                    <li>
                                        <Link className="dropdown-item" to="/users/bookings">
                                            My Bookings
                                        </Link>
                                    </li>
                                    <li>
                                        <Link className="dropdown-item" to="/users/orders">
                                            My Orders
                                        </Link>
                                    </li>
                                    <li>
                                        <hr className="dropdown-divider" />
                                    </li>
                                    <li>
                                        <button className="dropdown-item" onClick={handleLogout}>
                                            Log Out
                                        </button>
                                    </li>
                                </ul>
                            </li>
                        ) : (
                            <>
                                <li className="nav-item">
                                    <Link to="/auth/login" className="nav-link">Login</Link>
                                </li>
                                <li className="nav-item">
                                    <Link to="/auth/register" className="nav-link">Register</Link>
                                </li>
                            </>
                        )}
                    </ul>
                </div>
            </div>
        </nav>
    );
};

export default Header;
