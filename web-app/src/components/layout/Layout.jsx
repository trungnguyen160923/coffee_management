import React from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

// Call global theme re-init after route changes
const useThemeReinitOnRouteChange = () => {
    const location = useLocation();
    React.useEffect(() => {
        if (window.__reInitTheme) window.__reInitTheme();
    }, [location.pathname]);
};

const Layout = ({ children, pageTitle = 'Smart Cafe' }) => {
    // Update document title
    React.useEffect(() => {
        document.title = pageTitle;
    }, [pageTitle]);

    useThemeReinitOnRouteChange();

    return (
        <div className="site-wrap">
            <Header />
            <main>
                {children}
            </main>
            <Footer />
        </div>
    );
};

export default Layout;
