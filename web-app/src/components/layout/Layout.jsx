import React from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

// Call global theme re-init after route changes
const useThemeReinitOnRouteChange = () => {
    const location = useLocation();
    React.useEffect(() => {
        // Defer to the next paint so the new route content exists in the DOM
        if (window.__reInitTheme) {
            // microtask + slight delay to cover images/styles loading
            Promise.resolve().then(() => window.__reInitTheme());
            const t = setTimeout(() => {
                try { window.__reInitTheme(); } catch (_) { }
            }, 100);
            return () => clearTimeout(t);
        }
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
