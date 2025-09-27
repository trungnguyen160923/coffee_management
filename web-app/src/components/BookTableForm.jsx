import React, { useState } from 'react';

const BookTableForm = () => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        date: '',
        time: '',
        phone: '',
        message: ''
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Validate required fields
        if (!formData.firstName || !formData.date || !formData.time || !formData.phone) {
            alert("Please fill all the Mandatory details !!");
            return;
        }

        // Here you would typically send the data to your backend
        console.log('Booking data:', formData);
        alert('Table booking request submitted successfully!');

        // Reset form
        setFormData({
            firstName: '',
            lastName: '',
            date: '',
            time: '',
            phone: '',
            message: ''
        });
    };

    return (
        <div className="book p-4">
            <h3>Book a Table</h3>
            <form onSubmit={handleSubmit} className="appointment-form">
                <div className="d-md-flex">
                    <div className="form-group">
                        <input
                            type="text"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleInputChange}
                            className="form-control"
                            placeholder="First Name*"
                        />
                    </div>
                    <div className="form-group ml-md-4">
                        <input
                            type="text"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleInputChange}
                            className="form-control"
                            placeholder="Last Name"
                        />
                    </div>
                </div>
                <div className="d-md-flex">
                    <div className="form-group">
                        <div className="input-wrap">
                            <div className="icon">
                                <span className="ion-md-calendar"></span>
                            </div>
                            <input
                                type="text"
                                name="date"
                                value={formData.date}
                                onChange={handleInputChange}
                                className="form-control appointment_date"
                                placeholder="Date*"
                            />
                        </div>
                    </div>
                    <div className="form-group ml-md-4">
                        <div className="input-wrap">
                            <div className="icon"><span className="ion-ios-clock"></span></div>
                            <input
                                type="text"
                                name="time"
                                value={formData.time}
                                onChange={handleInputChange}
                                className="form-control appointment_time"
                                placeholder="Time*"
                            />
                        </div>
                    </div>
                    <div className="form-group ml-md-4">
                        <input
                            type="text"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            className="form-control"
                            placeholder="Phone*"
                        />
                    </div>
                </div>
                <div className="d-md-flex">
                    <div className="form-group">
                        <textarea
                            name="message"
                            value={formData.message}
                            onChange={handleInputChange}
                            cols="30"
                            rows="2"
                            className="form-control"
                            placeholder="Message"
                        ></textarea>
                    </div>
                    <div className="form-group ml-md-4">
                        <button type="submit" className="btn btn-white py-3 px-4">
                            Book a Table
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default BookTableForm;
