import React from 'react';
import { Link } from 'react-router-dom';

const ServicesPage = () => {
    return (
        <>
            {/* Hero Section */}
            <section className="home-slider owl-carousel">
                <div className="slider-item" style={{ backgroundImage: 'url(/images/bg_3.jpg)' }} data-stellar-background-ratio="0.5">
                    <div className="overlay"></div>
                    <div className="container">
                        <div className="row slider-text justify-content-center align-items-center">
                            <div className="col-md-7 col-sm-12 text-center ftco-animate">
                                <h1 className="mb-3 mt-5 bread">Services</h1>
                                <p className="breadcrumbs">
                                    <span className="mr-2"><Link to="/coffee">Home</Link></span>
                                    <span>Services</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Services Section */}
            <section className="ftco-section ftco-services">
                <div className="container">
                    <div className="row">
                        <div className="col-md-4 ftco-animate">
                            <div className="media d-block text-center block-6 services">
                                <div className="icon d-flex justify-content-center align-items-center mb-5">
                                    <span className="flaticon-choices"></span>
                                </div>
                                <div className="media-body">
                                    <h3 className="heading">Easy to Order</h3>
                                    <p>Even the all-powerful Pointing has no control about the blind texts it is an almost unorthographic.</p>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-4 ftco-animate">
                            <div className="media d-block text-center block-6 services">
                                <div className="icon d-flex justify-content-center align-items-center mb-5">
                                    <span className="flaticon-delivery-truck"></span>
                                </div>
                                <div className="media-body">
                                    <h3 className="heading">Fastest Delivery</h3>
                                    <p>Even the all-powerful Pointing has no control about the blind texts it is an almost unorthographic.</p>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-4 ftco-animate">
                            <div className="media d-block text-center block-6 services">
                                <div className="icon d-flex justify-content-center align-items-center mb-5">
                                    <span className="flaticon-coffee-bean"></span>
                                </div>
                                <div className="media-body">
                                    <h3 className="heading">Quality Coffee</h3>
                                    <p>Even the all-powerful Pointing has no control about the blind texts it is an almost unorthographic.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
};

export default ServicesPage;
