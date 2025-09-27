import React from 'react';
import { Link } from 'react-router-dom';
import BookTableForm from '../shared/BookTableForm';
import ContactInfo from '../shared/ContactInfo';

const MenuPage = () => {
    return (
        <>
            {/* Hero Section */}
            <section className="home-slider owl-carousel">
                <div className="slider-item" style={{ backgroundImage: 'url(/images/bg_3.jpg)' }} data-stellar-background-ratio="0.5">
                    <div className="overlay"></div>
                    <div className="container">
                        <div className="row slider-text justify-content-center align-items-center">
                            <div className="col-md-7 col-sm-12 text-center ftco-animate">
                                <h1 className="mb-3 mt-5 bread">Our Menu</h1>
                                <p className="breadcrumbs">
                                    <span className="mr-2"><Link to="/coffee">Home</Link></span>
                                    <span>Menu</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Intro Section with Contact Info and Book Table Form */}
            <section className="ftco-intro">
                <div className="container-wrap">
                    <div className="wrap d-md-flex align-items-xl-end">
                        <ContactInfo />
                        <BookTableForm />
                    </div>
                </div>
            </section>
        </>
    );
};

export default MenuPage;
