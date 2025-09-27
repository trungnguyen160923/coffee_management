import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from './DataTable';

const BookingsPage = () => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        // Check authentication
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/auth/login');
            return;
        }

        // Fetch bookings data
        fetchBookings();
    }, [navigate]);

    const fetchBookings = async () => {
        try {
            setLoading(true);

            // Mock data - in real app, you would fetch from API
            const mockBookings = [
                {
                    id: 1,
                    firstName: 'John',
                    lastName: 'Doe',
                    date: '2024-01-15',
                    time: '19:00',
                    phone: '+1-555-0123',
                    message: 'Birthday celebration for 4 people',
                    status: 'Confirmed'
                },
                {
                    id: 2,
                    firstName: 'Jane',
                    lastName: 'Smith',
                    date: '2024-01-20',
                    time: '18:30',
                    phone: '+1-555-0456',
                    message: 'Business dinner meeting',
                    status: 'Pending'
                },
                {
                    id: 3,
                    firstName: 'Bob',
                    lastName: 'Johnson',
                    date: '2024-01-25',
                    time: '20:00',
                    phone: '+1-555-0789',
                    message: 'Anniversary dinner',
                    status: 'Cancelled'
                },
                {
                    id: 4,
                    firstName: 'Alice',
                    lastName: 'Brown',
                    date: '2024-02-01',
                    time: '17:30',
                    phone: '+1-555-0321',
                    message: 'Family gathering',
                    status: 'Confirmed'
                }
            ];

            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            setBookings(mockBookings);
        } catch (error) {
            console.error('Error fetching bookings:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatTime = (timeString) => {
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    };

    const columns = [
        {
            header: 'First Name',
            key: 'firstName'
        },
        {
            header: 'Last Name',
            key: 'lastName'
        },
        {
            header: 'Date',
            key: 'date',
            render: (booking) => formatDate(booking.date)
        },
        {
            header: 'Time',
            key: 'time',
            render: (booking) => formatTime(booking.time)
        },
        {
            header: 'Phone',
            key: 'phone'
        },
        {
            header: 'Message',
            key: 'message'
        },
        {
            header: 'Status',
            key: 'status',
            render: (booking) => (
                <span className={`badge ${booking.status === 'Confirmed' ? 'badge-success' :
                    booking.status === 'Pending' ? 'badge-warning' :
                        booking.status === 'Cancelled' ? 'badge-danger' :
                            'badge-secondary'
                    }`}>
                    {booking.status}
                </span>
            )
        }
    ];

    return (
        <>
            {/* Hero Section */}
            <section className="home-slider owl-carousel">
                <div className="slider-item" style={{ backgroundImage: 'url(/images/bg_1.jpg)' }} data-stellar-background-ratio="0.5">
                    <div className="overlay"></div>
                    <div className="container">
                        <div className="row slider-text justify-content-center align-items-center">
                            <div className="col-md-7 col-sm-12 text-center ftco-animate">
                                <h1 className="mb-3 mt-5 bread">My Bookings</h1>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Bookings Table Section */}
            <section className="ftco-section ftco-cart">
                <div className="container">
                    <div className="row">
                        <div className="col-md-12 ftco-animate">
                            <div className="card">
                                <div className="card-header">
                                    <h3 className="card-title">Booking History</h3>
                                </div>
                                <div className="card-body">
                                    <DataTable
                                        title="Bookings"
                                        columns={columns}
                                        data={bookings}
                                        emptyMessage="Your Booking is Empty"
                                        loading={loading}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
};

export default BookingsPage;
