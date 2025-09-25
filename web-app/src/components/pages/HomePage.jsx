import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import HeroSection from '../shared/HeroSection';
import BookTableForm from '../shared/BookTableForm';
import ContactInfo from '../shared/ContactInfo';

const HomePage = () => {
    useEffect(() => {
        // Initialize any necessary scripts for the homepage
        const initScripts = () => {
            // Initialize counter animation
            if (window.jQuery && window.jQuery.fn.animateNumber) {
                window.jQuery('.number').animateNumber({
                    number: window.jQuery('.number').attr('data-number'),
                    numberStep: function (now, tween) {
                        var flooredNumber = Math.floor(now),
                            target = window.jQuery(tween.elem);
                        target.text(flooredNumber);
                    }
                });
            }
        };

        // Run after a short delay to ensure scripts are loaded
        const timer = setTimeout(initScripts, 1000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <>
            {/* Hero Slider */}
            <section id="homeSlider" className="home-slider owl-carousel">
                <div className="slider-item" style={{ backgroundImage: 'url(/images/bg_1.jpg)' }}>
                    <div className="overlay"></div>
                    <div className="container">
                        <div className="row slider-text justify-content-center align-items-center" data-scrollax-parent="true">
                            <div className="col-md-8 col-sm-12 text-center ftco-animate">
                                <span className="subheading">Welcome</span>
                                <h1 className="mb-4">The Best Coffee Testing Experience</h1>
                                <p className="mb-4 mb-md-5">A small river named Duden flows by their place and supplies it with the necessary regelialia.</p>
                                <p>
                                    <Link to="/auth/login" className="btn btn-primary p-3 px-xl-4 py-xl-3">Order Now</Link>
                                    <Link to="/coffee/menu" className="btn btn-white btn-outline-white p-3 px-xl-4 py-xl-3">View Menu</Link>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="slider-item" style={{ backgroundImage: 'url(/images/bg_2.jpg)' }}>
                    <div className="overlay"></div>
                    <div className="container">
                        <div className="row slider-text justify-content-center align-items-center" data-scrollax-parent="true">
                            <div className="col-md-8 col-sm-12 text-center ftco-animate">
                                <span className="subheading">Welcome</span>
                                <h1 className="mb-4">Amazing Taste & Beautiful Place</h1>
                                <p className="mb-4 mb-md-5">A small river named Duden flows by their place and supplies it with the necessary regelialia.</p>
                                <p>
                                    <Link to="/auth/login" className="btn btn-primary p-3 px-xl-4 py-xl-3">Order Now</Link>
                                    <Link to="/coffee/menu" className="btn btn-white btn-outline-white p-3 px-xl-4 py-xl-3">View Menu</Link>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="slider-item" style={{ backgroundImage: 'url(/images/bg_3.jpg)' }}>
                    <div className="overlay"></div>
                    <div className="container">
                        <div className="row slider-text justify-content-center align-items-center" data-scrollax-parent="true">
                            <div className="col-md-8 col-sm-12 text-center ftco-animate">
                                <span className="subheading">Welcome</span>
                                <h1 className="mb-4">Creamy Hot and Ready to Serve</h1>
                                <p className="mb-4 mb-md-5">A small river named Duden flows by their place and supplies it with the necessary regelialia.</p>
                                <p>
                                    <Link to="/auth/login" className="btn btn-primary p-3 px-xl-4 py-xl-3">Order Now</Link>
                                    <Link to="/coffee/menu" className="btn btn-white btn-outline-white p-3 px-xl-4 py-xl-3">View Menu</Link>
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

            {/* About Section */}
            <section className="ftco-about d-md-flex">
                <div className="one-half img" style={{ backgroundImage: 'url(/images/about.jpg)' }}></div>
                <div className="one-half ftco-animate">
                    <div className="overlap">
                        <div className="heading-section ftco-animate">
                            <span className="subheading">Discover</span>
                            <h2 className="mb-4">Our Story</h2>
                        </div>
                        <div>
                            <p>On her way she met a copy. The copy warned the Little Blind Text, that where it came from it would have been rewritten a thousand times and everything that was left from its origin would be the word "and" and the Little Blind Text should turn around and return to its own, safe country. But nothing the copy said could convince her and so it didn't take long until a few insidious Copy Writers ambushed her, made her drunk with Longe and Parole and dragged her into their agency, where they abused her for their.</p>
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

            {/* Menu Preview Section */}
            <section className="ftco-section">
                <div className="container">
                    <div className="row align-items-center">
                        <div className="col-md-6 pr-md-5">
                            <div className="heading-section text-md-right ftco-animate">
                                <span className="subheading">Discover</span>
                                <h2 className="mb-4">Our Menu</h2>
                                <p className="mb-4">Far far away, behind the word mountains, far from the countries Vokalia and Consonantia, there live the blind texts. Separated they live in Bookmarksgrove right at the coast of the Semantics, a large language ocean.</p>
                                <p>
                                    <Link to="/coffee/menu" className="btn btn-primary btn-outline-primary px-4 py-3">View Full Menu</Link>
                                </p>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="row">
                                <div className="col-md-6">
                                    <div className="menu-entry">
                                        <a href="#" className="img" style={{ backgroundImage: 'url(/images/menu-1.jpg)' }}></a>
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <div className="menu-entry mt-lg-4">
                                        <a href="#" className="img" style={{ backgroundImage: 'url(/images/menu-2.jpg)' }}></a>
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <div className="menu-entry">
                                        <a href="#" className="img" style={{ backgroundImage: 'url(/images/menu-3.jpg)' }}></a>
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <div className="menu-entry mt-lg-4">
                                        <a href="#" className="img" style={{ backgroundImage: 'url(/images/menu-4.jpg)' }}></a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Counter Section */}
            <section
                className="ftco-counter img"
                id="section-counter"
                style={{
                    backgroundImage: 'url(/images/bg_2.jpg)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    position: 'relative',
                    backgroundAttachment: 'fixed'
                }}
                data-stellar-background-ratio="0.5"
            >
                <div className="container">
                    <div className="row justify-content-center">
                        <div className="col-md-10">
                            <div className="row">
                                <div className="col-md-6 col-lg-3 d-flex justify-content-center counter-wrap ftco-animate">
                                    <div className="block-18 text-center">
                                        <div className="text">
                                            <div className="icon"><span className="flaticon-coffee-cup"></span></div>
                                            <strong className="number" data-number="100">0</strong>
                                            <span>Coffee Branches</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-6 col-lg-3 d-flex justify-content-center counter-wrap ftco-animate">
                                    <div className="block-18 text-center">
                                        <div className="text">
                                            <div className="icon"><span className="flaticon-coffee-cup"></span></div>
                                            <strong className="number" data-number="85">0</strong>
                                            <span>Number of Awards</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-6 col-lg-3 d-flex justify-content-center counter-wrap ftco-animate">
                                    <div className="block-18 text-center">
                                        <div className="text">
                                            <div className="icon"><span className="flaticon-coffee-cup"></span></div>
                                            <strong className="number" data-number="10567">0</strong>
                                            <span>Happy Customer</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-6 col-lg-3 d-flex justify-content-center counter-wrap ftco-animate">
                                    <div className="block-18 text-center">
                                        <div className="text">
                                            <div className="icon"><span className="flaticon-coffee-cup"></span></div>
                                            <strong className="number" data-number="900">0</strong>
                                            <span>Staff</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Best Coffee Sellers Section */}
            <section className="ftco-section">
                <div className="container">
                    <div className="row justify-content-center mb-5 pb-3">
                        <div className="col-md-7 heading-section ftco-animate text-center">
                            <span className="subheading">Discover</span>
                            <h2 className="mb-4">Best Coffee Sellers</h2>
                            <p>Far far away, behind the word mountains, far from the countries Vokalia and Consonantia, there live the blind texts.</p>
                        </div>
                    </div>
                    <div className="row">
                        {/* Dynamic product cards will be bound here later */}
                    </div>
                </div>
            </section>

            {/* Gallery Section */}
            <section className="ftco-gallery">
                <div className="container-wrap">
                    <div className="row no-gutters">
                        <div className="col-md-3 ftco-animate">
                            <a href="#" className="gallery img d-flex align-items-center" style={{ backgroundImage: 'url(/images/gallery-1.jpg)' }}>
                                <div className="icon mb-4 d-flex align-items-center justify-content-center">
                                    <span className="icon-search"></span>
                                </div>
                            </a>
                        </div>
                        <div className="col-md-3 ftco-animate">
                            <a href="#" className="gallery img d-flex align-items-center" style={{ backgroundImage: 'url(/images/gallery-2.jpg)' }}>
                                <div className="icon mb-4 d-flex align-items-center justify-content-center">
                                    <span className="icon-search"></span>
                                </div>
                            </a>
                        </div>
                        <div className="col-md-3 ftco-animate">
                            <a href="#" className="gallery img d-flex align-items-center" style={{ backgroundImage: 'url(/images/gallery-3.jpg)' }}>
                                <div className="icon mb-4 d-flex align-items-center justify-content-center">
                                    <span className="icon-search"></span>
                                </div>
                            </a>
                        </div>
                        <div className="col-md-3 ftco-animate">
                            <a href="#" className="gallery img d-flex align-items-center" style={{ backgroundImage: 'url(/images/gallery-4.jpg)' }}>
                                <div className="icon mb-4 d-flex align-items-center justify-content-center">
                                    <span className="icon-search"></span>
                                </div>
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* Testimonials Section */}
            <section className="ftco-section img" id="ftco-testimony" style={{ backgroundImage: 'url(/images/bg_1.jpg)' }} data-stellar-background-ratio="0.5">
                <div className="overlay"></div>
                <div className="container">
                    <div className="row justify-content-center mb-5">
                        <div className="col-md-7 heading-section text-center ftco-animate">
                            <span className="subheading">Testimony</span>
                            <h2 className="mb-4">Customers Says</h2>
                            <p>Far far away, behind the word mountains, far from the countries Vokalia and Consonantia, there live the blind texts.</p>
                        </div>
                    </div>
                </div>
                <div className="container-wrap">
                    <div className="row d-flex no-gutters">
                        <div className="col-lg align-self-sm-end ftco-animate">
                            <div className="testimony">
                                <blockquote>
                                    <p>&ldquo;Even the all-powerful Pointing has no control about the blind texts it is an almost unorthographic life One day however a small.&rdquo;</p>
                                </blockquote>
                                <div className="author d-flex mt-4">
                                    <div className="image mr-3 align-self-center">
                                        <img src="/images/person_1.jpg" alt="" />
                                    </div>
                                    <div className="name align-self-center">Louise Kelly <span className="position">Illustrator Designer</span></div>
                                </div>
                            </div>
                        </div>
                        <div className="col-lg align-self-sm-end">
                            <div className="testimony overlay">
                                <blockquote>
                                    <p>&ldquo;Even the all-powerful Pointing has no control about the blind texts it is an almost unorthographic life One day however a small line of blind text by the name of Lorem Ipsum decided to leave for the far World of Grammar.&rdquo;</p>
                                </blockquote>
                                <div className="author d-flex mt-4">
                                    <div className="image mr-3 align-self-center">
                                        <img src="/images/person_2.jpg" alt="" />
                                    </div>
                                    <div className="name align-self-center">Louise Kelly <span className="position">Illustrator Designer</span></div>
                                </div>
                            </div>
                        </div>
                        <div className="col-lg align-self-sm-end ftco-animate">
                            <div className="testimony">
                                <blockquote>
                                    <p>&ldquo;Even the all-powerful Pointing has no control about the blind texts it is an almost unorthographic life One day however a small line of blind text by the name. &rdquo;</p>
                                </blockquote>
                                <div className="author d-flex mt-4">
                                    <div className="image mr-3 align-self-center">
                                        <img src="/images/person_3.jpg" alt="" />
                                    </div>
                                    <div className="name align-self-center">Louise Kelly <span className="position">Illustrator Designer</span></div>
                                </div>
                            </div>
                        </div>
                        <div className="col-lg align-self-sm-end">
                            <div className="testimony overlay">
                                <blockquote>
                                    <p>&ldquo;Even the all-powerful Pointing has no control about the blind texts it is an almost unorthographic life One day however.&rdquo;</p>
                                </blockquote>
                                <div className="author d-flex mt-4">
                                    <div className="image mr-3 align-self-center">
                                        <img src="/images/person_2.jpg" alt="" />
                                    </div>
                                    <div className="name align-self-center">Louise Kelly <span className="position">Illustrator Designer</span></div>
                                </div>
                            </div>
                        </div>
                        <div className="col-lg align-self-sm-end ftco-animate">
                            <div className="testimony">
                                <blockquote>
                                    <p>&ldquo;Even the all-powerful Pointing has no control about the blind texts it is an almost unorthographic life One day however a small line of blind text by the name. &rdquo;</p>
                                </blockquote>
                                <div className="author d-flex mt-4">
                                    <div className="image mr-3 align-self-center">
                                        <img src="/images/person_3.jpg" alt="" />
                                    </div>
                                    <div className="name align-self-center">Louise Kelly <span className="position">Illustrator Designer</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
};

export default HomePage;
