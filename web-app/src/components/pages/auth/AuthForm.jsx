import React from 'react';
import { Link } from 'react-router-dom';

const AuthForm = ({
    title,
    children,
    onSubmit,
    loading = false,
    error = '',
    success = '',
    backgroundImage = '/images/bg_1.jpg',
    breadcrumbTitle = '',
    breadcrumbPath = '/coffee'
}) => {
    return (
        <>
            {/* Hero Section */}
            <section className="home-slider owl-carousel">
                <div className="slider-item" style={{ backgroundImage: `url(${backgroundImage})` }} data-stellar-background-ratio="0.5">
                    <div className="overlay"></div>
                    <div className="container">
                        <div className="row slider-text justify-content-center align-items-center">
                            <div className="col-md-7 col-sm-12 text-center ftco-animate">
                                <h1 className="mb-3 mt-5 bread">{breadcrumbTitle}</h1>
                                <p className="breadcrumbs">
                                    <span className="mr-2"><Link to={breadcrumbPath}>Home</Link></span>
                                    <span>{breadcrumbTitle}</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Form Section */}
            <section className="ftco-section">
                <div className="container">
                    <div className="row">
                        <div className="col-md-12 ftco-animate">
                            <form onSubmit={onSubmit} className="billing-form ftco-bg-dark p-3 p-md-5">
                                <h3 className="mb-4 billing-heading">{title}</h3>

                                {error && (
                                    <div className="alert alert-danger" role="alert">
                                        {error}
                                    </div>
                                )}

                                {success && (
                                    <div className="alert alert-success" role="alert">
                                        {success}
                                    </div>
                                )}

                                <div className="row align-items-end">
                                    {children}
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
};

export default AuthForm;
