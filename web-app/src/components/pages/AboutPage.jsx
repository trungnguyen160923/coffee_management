import React from 'react';
import { Link } from 'react-router-dom';

const AboutPage = () => {
    return (
        <>
            {/* Hero Section */}
            <section className="home-slider owl-carousel">
                <div className="slider-item" style={{ backgroundImage: 'url(/images/bg_3.jpg)' }} data-stellar-background-ratio="0.5">
                    <div className="overlay"></div>
                    <div className="container">
                        <div className="row slider-text justify-content-center align-items-center">
                            <div className="col-md-7 col-sm-12 text-center ftco-animate">
                                <h1 className="mb-3 mt-5 bread">About Us</h1>
                                <p className="breadcrumbs">
                                    <span className="mr-2"><Link to="/coffee">Home</Link></span>
                                    <span>About</span>
                                </p>
                            </div>
                        </div>
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
                        <div className="col-lg align-self-sm-end">
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
                        <div className="col-lg align-self-sm-end">
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
                        <div className="col-lg align-self-sm-end">
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
            <section className="ftco-counter ftco-bg-dark img" id="section-counter" style={{ backgroundImage: 'url(/images/bg_2.jpg)' }} data-stellar-background-ratio="0.5">
                <div className="overlay"></div>
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
        </>
    );
};

export default AboutPage;
