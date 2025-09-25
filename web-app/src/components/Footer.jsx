import React from 'react';
import Scripts from './Scripts';

const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <>
            <footer className="ftco-footer ftco-section img">
                <div className="overlay"></div>
                <div className="container">
                    <div className="row mb-5">
                        <div className="col-lg-3 col-md-6 mb-5 mb-md-5">
                            <div className="ftco-footer-widget mb-4">
                                <h2 className="ftco-heading-2">About Us</h2>
                                <p>Far far away, behind the word mountains, far from the countries Vokalia and Consonantia,
                                    there live the blind texts.</p>
                                <ul className="ftco-footer-social list-unstyled float-md-left float-lft mt-5">
                                    <li className="ftco-animate">
                                        <a href="#"><span className="icon-twitter"></span></a>
                                    </li>
                                    <li className="ftco-animate">
                                        <a href="#"><span className="icon-facebook"></span></a>
                                    </li>
                                    <li className="ftco-animate">
                                        <a href="#"><span className="icon-instagram"></span></a>
                                    </li>
                                </ul>
                            </div>
                        </div>
                        <div className="col-lg-4 col-md-6 mb-5 mb-md-5">
                            <div className="ftco-footer-widget mb-4">
                                <h2 className="ftco-heading-2">Recent Blog</h2>
                                <div className="block-21 mb-4 d-flex">
                                    <a
                                        className="blog-img mr-4"
                                        style={{ backgroundImage: 'url(/images/image_1.jpg)' }}
                                        href="#"
                                    ></a>
                                    <div className="text">
                                        <h3 className="heading">
                                            <a href="#">Even the all-powerful Pointing has no control about</a>
                                        </h3>
                                        <div className="meta">
                                            <div><a href="#"><span className="icon-calendar"></span> Sept 15, 2023</a></div>
                                            <div><a href="#"><span className="icon-person"></span> Admin</a></div>
                                            <div><a href="#"><span className="icon-chat"></span> 19</a></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="block-21 mb-4 d-flex">
                                    <a
                                        className="blog-img mr-4"
                                        style={{ backgroundImage: 'url(/images/image_2.jpg)' }}
                                        href="#"
                                    ></a>
                                    <div className="text">
                                        <h3 className="heading">
                                            <a href="#">Even the all-powerful Pointing has no control about</a>
                                        </h3>
                                        <div className="meta">
                                            <div><a href="#"><span className="icon-calendar"></span> Sept 15, 2023</a></div>
                                            <div><a href="#"><span className="icon-person"></span> Admin</a></div>
                                            <div><a href="#"><span className="icon-chat"></span> 19</a></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-lg-2 col-md-6 mb-5 mb-md-5">
                            <div className="ftco-footer-widget mb-4 ml-md-4">
                                <h2 className="ftco-heading-2">Services</h2>
                                <ul className="list-unstyled">
                                    <li><a href="#" className="py-2 d-block">Cooked</a></li>
                                    <li><a href="#" className="py-2 d-block">Deliver</a></li>
                                    <li><a href="#" className="py-2 d-block">Quality Foods</a></li>
                                    <li><a href="#" className="py-2 d-block">Mixed</a></li>
                                </ul>
                            </div>
                        </div>
                        <div className="col-lg-3 col-md-6 mb-5 mb-md-5">
                            <div className="ftco-footer-widget mb-4">
                                <h2 className="ftco-heading-2">Have a Questions?</h2>
                                <div className="block-23 mb-3">
                                    <ul>
                                        <li>
                                            <span className="icon icon-map-marker"></span>
                                            <span className="text">203 Fake St. Mountain View, San Francisco, California, USA</span>
                                        </li>
                                        <li>
                                            <a href="#">
                                                <span className="icon icon-phone"></span>
                                                <span className="text">+91 392 3929 210</span>
                                            </a>
                                        </li>
                                        <li>
                                            <a href="#">
                                                <span className="icon icon-envelope"></span>
                                                <span className="text">info@yourdomain.com</span>
                                            </a>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-md-12 text-center">
                            <p>
                                Copyright &copy; {currentYear} All rights reserved | Made with
                                <i className="icon-heart" aria-hidden="true"></i> by Nikhil Singh
                            </p>
                        </div>
                    </div>
                </div>
            </footer>

            <div id="ftco-loader" className="show fullscreen">
                <svg className="circular" width="48px" height="48px">
                    <circle
                        className="path-bg"
                        cx="24"
                        cy="24"
                        r="22"
                        fill="none"
                        strokeWidth="4"
                        stroke="#eeeeee"
                    />
                    <circle
                        className="path"
                        cx="24"
                        cy="24"
                        r="22"
                        fill="none"
                        strokeWidth="4"
                        strokeMiterlimit="10"
                        stroke="#F96D00"
                    />
                </svg>
            </div>

            <Scripts />
        </>
    );
};

export default Footer;
