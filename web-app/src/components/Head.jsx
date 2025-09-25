import React from 'react';

const Head = ({ pageTitle = 'Smart Cafe | Delicious Taste' }) => {
    React.useEffect(() => {
        // Update document title
        document.title = pageTitle;

        // Update meta description
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
            metaDescription.setContent = 'Smart Cafe Delicious Taste, offers a delicious taste of freshly brewed coffee, a variety of menu options, and excellent services. Visit us to enjoy a great coffee experience.';
        }
    }, [pageTitle]);

    return (
        <>
            {/* Google Fonts */}
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
            <link
                href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap"
                rel="stylesheet"
            />
            <link
                href="https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@400;700&display=swap"
                rel="stylesheet"
            />
            <link
                href="https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap"
                rel="stylesheet"
            />
        </>
    );
};

export default Head;
