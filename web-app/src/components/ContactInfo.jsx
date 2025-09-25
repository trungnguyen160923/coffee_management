import React from 'react';

const ContactInfo = () => {
    return (
        <div className="info">
            <div className="row no-gutters">
                <div className="col-md-4 d-flex ftco-animate">
                    <div className="icon"><span className="icon-phone"></span></div>
                    <div className="text">
                        <h3>000 (123) 456 7890</h3>
                        <p>A small river named Duden flows by their place and supplies.</p>
                    </div>
                </div>
                <div className="col-md-4 d-flex ftco-animate">
                    <div className="icon"><span className="icon-my_location"></span></div>
                    <div className="text">
                        <h3>198 West 21th Street</h3>
                        <p>203 Fake St. Mountain View, San Francisco, California, USA</p>
                    </div>
                </div>
                <div className="col-md-4 d-flex ftco-animate">
                    <div className="icon"><span className="icon-clock-o"></span></div>
                    <div className="text">
                        <h3>Open Monday-Friday</h3>
                        <p>8:00am - 9:00pm</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContactInfo;
