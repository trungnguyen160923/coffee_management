import React from 'react';
import { Link } from 'react-router-dom';

const HeroSection = ({ title, subtitle, description, showButtons = true }) => {
    return (
        <section className="home-slider owl-carousel">
            <div className="slider-item" style={{ backgroundImage: 'url(/images/bg_1.jpg)' }}>
                <div className="overlay"></div>
                <div className="container">
                    <div className="row slider-text justify-content-center align-items-center" data-scrollax-parent="true">
                        <div className="col-md-8 col-sm-12 text-center ftco-animate">
                            <span className="subheading">{subtitle}</span>
                            <h1 className="mb-4">{title}</h1>
                            <p className="mb-4 mb-md-5">{description}</p>
                            {showButtons && (
                                <p>
                                    <Link to="/auth/login" className="btn btn-primary p-3 px-xl-4 py-xl-3">Order Now</Link>
                                    <Link to="/coffee/menu" className="btn btn-white btn-outline-white p-3 px-xl-4 py-xl-3">View Menu</Link>
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default HeroSection;
