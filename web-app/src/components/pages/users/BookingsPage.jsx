import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from './DataTable';
import { reservationService } from '../../../services/reservationService';

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

            // Get user info from localStorage
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const customerId = user?.userId || user?.user_id || user?.id;

            if (!customerId) {
                console.error('Customer ID not found');
                setBookings([]);
                return;
            }

            // Fetch real data from API
            const response = await reservationService.getReservationsByCustomer(customerId);

            if (response && response.result) {
                setBookings(response.result);
            } else {
                setBookings([]);
            }
        } catch (error) {
            console.error('Error fetching bookings:', error);
            setBookings([]);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelReservation = async (reservationId) => {
        if (window.confirm('Are you sure you want to cancel this reservation?')) {
            try {
                await reservationService.cancelReservation(reservationId);
                alert('Reservation cancelled successfully!');
                // Refresh the bookings list
                fetchBookings();
            } catch (error) {
                console.error('Error cancelling reservation:', error);
                alert('An error occurred while cancelling the reservation. Please try again.');
            }
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

    const formatTime = (dateTimeString) => {
        const date = new Date(dateTimeString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const columns = [
        {
            header: 'Reservation ID',
            key: 'reservationId'
        },
        {
            header: 'Customer Name',
            key: 'customerName'
        },
        {
            header: 'Branch',
            key: 'branchName'
        },
        {
            header: 'Date',
            key: 'reservedAt',
            render: (booking) => formatDate(booking.reservedAt)
        },
        {
            header: 'Time',
            key: 'reservedAt',
            render: (booking) => formatTime(booking.reservedAt)
        },
        {
            header: 'Party Size',
            key: 'partySize'
        },
        {
            header: 'Assigned Tables',
            key: 'assignedTables',
            render: (booking) => {
                if (booking.assignedTables && booking.assignedTables.length > 0) {
                    return booking.assignedTables.map(table => table.label).join(', ');
                }
                return '_';
            }
        },
        {
            header: 'Phone',
            key: 'phone'
        },
        {
            header: 'Notes',
            key: 'notes'
        },
        {
            header: 'Status',
            key: 'status',
            render: (booking) => {
                let backgroundColor, textColor;

                switch (booking.status) {
                    case 'PENDING':
                        backgroundColor = '#c49b63';
                        textColor = '#fff';
                        break;
                    case 'CONFIRMED':
                        backgroundColor = '#28a745';
                        textColor = '#fff';
                        break;
                    case 'SEATED':
                        backgroundColor = '#17a2b8';
                        textColor = '#fff';
                        break;
                    case 'COMPLETED':
                        backgroundColor = '#6c757d';
                        textColor = '#fff';
                        break;
                    case 'CANCELLED':
                        backgroundColor = '#dc3545';
                        textColor = '#fff';
                        break;
                    default:
                        backgroundColor = '#6c757d';
                        textColor = '#fff';
                }

                return (
                    <span style={{
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        backgroundColor: backgroundColor,
                        color: textColor
                    }}>
                        {booking.status}
                    </span>
                );
            }
        },
        {
            header: 'Actions',
            key: 'actions',
            render: (booking) => (
                (booking.status === 'PENDING' || booking.status === 'CONFIRMED') ? (
                    <button
                        onClick={() => handleCancelReservation(booking.reservationId)}
                        style={{
                            backgroundColor: 'transparent',
                            color: '#dc3545',
                            border: 'none',
                            padding: '4px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        onMouseOver={(e) => {
                            e.target.style.backgroundColor = '#f8d7da';
                            e.target.style.color = '#721c24';
                        }}
                        onMouseOut={(e) => {
                            e.target.style.backgroundColor = 'transparent';
                            e.target.style.color = '#dc3545';
                        }}
                        title="Cancel Reservation"
                    >
                        🗑️
                    </button>
                ) : (
                    <span style={{ color: '#6c757d', fontSize: '12px' }}>-</span>
                )
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
            <section className="ftco-section ftco-cart" style={{
                background: 'url(/images/bg_4.jpg) no-repeat fixed',
                backgroundSize: 'cover'
            }}>
                <div className="container">
                    <div className="row">
                        <div className="col-md-12 ftco-animate">
                            <div className="book p-4" style={{
                                backgroundColor: 'rgba(0, 0, 0, 0.1)',
                                borderRadius: '10px',
                                color: 'white'
                            }}>
                                <h3 style={{ color: 'white', fontSize: '1.5rem', textAlign: 'center', marginBottom: '30px' }}>Booking History</h3>

                                {loading ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: 'white' }}>
                                        <div className="spinner-border text-warning" role="status">
                                            <span className="sr-only">Loading...</span>
                                        </div>
                                        <p style={{ marginTop: '15px' }}>Loading bookings...</p>
                                    </div>
                                ) : bookings.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: 'white' }}>
                                        <p>Your Booking is Empty</p>
                                    </div>
                                ) : (
                                    <div style={{ overflowX: 'auto' }}>
                                        <table className="table" style={{ margin: 0, backgroundColor: 'transparent' }}>
                                            <thead style={{ backgroundColor: '#c49b63' }}>
                                                <tr>
                                                    {columns.map((column, index) => (
                                                        <th key={index} style={{
                                                            color: 'white',
                                                            fontWeight: 'bold',
                                                            textAlign: 'center',
                                                            padding: '15px 10px',
                                                            border: 'none',
                                                            fontSize: '14px'
                                                        }}>
                                                            {column.header}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {bookings.map((booking, index) => (
                                                    <tr key={index} style={{ backgroundColor: 'transparent' }}>
                                                        {columns.map((column, colIndex) => (
                                                            <td key={colIndex} style={{
                                                                color: '#e0e0e0',
                                                                padding: '12px 10px',
                                                                border: 'none',
                                                                textAlign: column.key === 'reservationId' || column.key === 'partySize' ? 'center' : 'left',
                                                                fontSize: '13px'
                                                            }}>
                                                                {column.render ? column.render(booking) : booking[column.key]}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
};

export default BookingsPage;