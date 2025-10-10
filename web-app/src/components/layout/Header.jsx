import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { cartService } from '../../services/cartService';

const Header = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [username, setUsername] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const [cartCount, setCartCount] = useState(0);

    useEffect(() => {
        // Check authentication status from localStorage or context
        const checkAuthStatus = () => {
            const token = localStorage.getItem('token');
            const user = localStorage.getItem('user');

            if (token && user) {
                setIsAuthenticated(true);
                setUsername(JSON.parse(user).username || 'User');
            } else {
                setIsAuthenticated(false);
                setUsername('');
            }
        };

        // Check on mount and route changes
        checkAuthStatus();

        // Listen for storage changes (login/logout from other tabs)
        const handleStorageChange = (e) => {
            if (e.key === 'token' || e.key === 'user') {
                checkAuthStatus();
            }
        };

        window.addEventListener('storage', handleStorageChange);

        // Listen for custom login event
        const handleLogin = () => {
            checkAuthStatus();
        };

        window.addEventListener('userLogin', handleLogin);
        const handleCartUpdated = async () => {
            try {
                const items = await cartService.getCartItems();
                setCartCount(Array.isArray(items) ? items.length : 0);
            } catch (_) {
                setCartCount(0);
            }
        };
        window.addEventListener('cartUpdated', handleCartUpdated);

        // Initial load of cart count
        handleCartUpdated();

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('userLogin', handleLogin);
            window.removeEventListener('cartUpdated', handleCartUpdated);
        };
    }, [location.pathname]);

    // Cart count removed as cartService is not available

    // Re-initialize Bootstrap dropdowns when authentication state changes
    useEffect(() => {
        if (isAuthenticated) {
            // Small delay to ensure DOM is updated
            setTimeout(() => {
                // Re-initialize Bootstrap dropdowns
                const dropdownElements = document.querySelectorAll('[data-bs-toggle="dropdown"]');
                dropdownElements.forEach(element => {
                    // Remove existing dropdown instance if any
                    const existingDropdown = window.bootstrap?.Dropdown?.getInstance(element);
                    if (existingDropdown) {
                        existingDropdown.dispose();
                    }
                    // Initialize new dropdown
                    if (window.bootstrap?.Dropdown) {
                        new window.bootstrap.Dropdown(element);
                    }
                });
            }, 100);
        }
    }, [isAuthenticated]);

    const handleLogout = async () => {
        try {
            await authService.logout();
        } catch (error) {
            console.error('Logout API failed:', error);
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setIsAuthenticated(false);
            setUsername('');
            setShowDropdown(false);
            window.location.href = '/auth/login';
        }
    };

    const toggleDropdown = () => {
        setShowDropdown(!showDropdown);
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

                        {/* Cart icon with badge */}
                        <li className="nav-item cart">
                            <Link to="/coffee/cart" className="nav-link position-relative">
                                <span className="icon icon-shopping_cart"></span>
                                {cartCount > 0 && (
                                    <span
                                        className="badge badge-pill"
                                        style={{
                                            position: 'absolute',
                                            top: '0',
                                            right: '0',
                                            transform: 'translate(50%, -30%)',
                                            backgroundColor: '#c49b63',
                                            color: '#151111',
                                            fontSize: '12px',
                                            padding: '2px 6px',
                                            borderRadius: '999px',
                                            lineHeight: 1
                                        }}
                                    >
                                        {cartCount}
                                    </span>
                                )}
                            </Link>
                        </li>

                        {isAuthenticated ? (
                            <li className="nav-item dropdown">
                                <a
                                    className="nav-link dropdown-toggle"
                                    href="#"
                                    role="button"
                                    onClick={toggleDropdown}
                                    aria-expanded={showDropdown}
                                >
                                    {username}
                                </a>
                                <ul className={`dropdown-menu ${showDropdown ? 'show' : ''}`}>
                                    <li>
                                        <Link className="dropdown-item" to="/users/bookings" onClick={() => setShowDropdown(false)}>
                                            My Bookings
                                        </Link>
                                    </li>
                                    <li>
                                        <Link className="dropdown-item" to="/users/orders" onClick={() => setShowDropdown(false)}>
                                            My Orders
                                        </Link>
                                    </li>
                                    <li>
                                        <Link className="dropdown-item" to="/users/addresses" onClick={() => setShowDropdown(false)}>
                                            Manage Addresses
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
