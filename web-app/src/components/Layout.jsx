import React from 'react';
import Header from './Header';
import Footer from './Footer';

const Layout = ({ children, pageTitle = 'Smart Cafe' }) => {
    // Update document title
    React.useEffect(() => {
        document.title = pageTitle;
    }, [pageTitle]);

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
