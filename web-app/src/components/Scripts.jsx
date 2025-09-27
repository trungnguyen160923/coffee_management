import React, { useEffect } from 'react';

const Scripts = () => {
    useEffect(() => {
        // Load additional scripts dynamically
        const scripts = [
            '/js/jquery-migrate-3.0.1.min.js',
            '/js/jquery.easing.1.3.js',
            '/js/jquery.waypoints.min.js',
            '/js/jquery.stellar.min.js',
            '/js/owl.carousel.min.js',
            '/js/jquery.magnific-popup.min.js',
            '/js/aos.js',
            '/js/jquery.animateNumber.min.js',
            '/js/bootstrap-datepicker.js',
            '/js/jquery.timepicker.min.js',
            '/js/scrollax.min.js',
            '/js/google-map.js',
            '/js/main.js'
        ];

        scripts.forEach(src => {
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            document.body.appendChild(script);
        });

        // Cleanup function
        return () => {
            scripts.forEach(src => {
                const existingScript = document.querySelector(`script[src="${src}"]`);
                if (existingScript) {
                    existingScript.remove();
                }
            });
        };
    }, []);

    return null; // This component doesn't render anything
};

export default Scripts;
