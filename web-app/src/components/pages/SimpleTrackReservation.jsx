import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { reservationService } from '../../services/reservationService';

const SimpleTrackReservation = () => {
    const { reservationId } = useParams();
    const [reservation, setReservation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [cancelling, setCancelling] = useState(false);

    useEffect(() => {
        if (reservationId) {
            fetchReservation();
        }
    }, [reservationId]);

    const fetchReservation = async () => {
        try {
            setLoading(true);
            setError('');

            const response = await reservationService.getReservationByIdPublic(reservationId);

            if (response && response.result) {
                setReservation(response.result);
            } else {
                setError('Reservation not found');
            }
        } catch (err) {
            console.error('Error fetching reservation:', err);
            setError('Unable to load reservation information. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelReservation = async () => {
        if (!window.confirm('Are you sure you want to cancel this reservation?')) {
            return;
        }

        try {
            setCancelling(true);
            await reservationService.cancelReservationPublic(reservationId);

            // Refresh reservation data to show updated status
            await fetchReservation();

            alert('Reservation cancelled successfully!');
        } catch (err) {
            console.error('Error cancelling reservation:', err);
            alert('Failed to cancel reservation. Please try again.');
        } finally {
            setCancelling(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status?.toUpperCase()) {
            case 'PENDING':
                return { color: '#f39c12', text: 'Pending' };
            case 'CONFIRMED':
                return { color: '#27ae60', text: 'Confirmed' };
            case 'CANCELLED':
                return { color: '#e74c3c', text: 'Cancelled' };
            case 'COMPLETED':
                return { color: '#3498db', text: 'Completed' };
            default:
                return { color: '#95a5a6', text: status || 'Unknown' };
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatTime = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#1a1a1a',
                margin: 0,
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '30px',
                        height: '30px',
                        border: '3px solid #333',
                        borderTop: '3px solid #fff',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 15px'
                    }}></div>
                    <p style={{ color: '#ccc', fontSize: '14px' }}>Loading...</p>
                </div>
                <style>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#1a1a1a',
                margin: 0,
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0
            }}>
                <div style={{
                    backgroundColor: '#2d2d2d',
                    padding: '30px',
                    borderRadius: '8px',
                    border: '1px solid #444',
                    textAlign: 'center',
                    maxWidth: '400px',
                    width: '90%'
                }}>
                    <h3 style={{ color: '#ff6b6b', marginBottom: '15px', fontSize: '18px' }}>Reservation Not Found</h3>
                    <p style={{ color: '#ccc', marginBottom: '0', fontSize: '14px' }}>{error}</p>
                </div>
            </div>
        );
    }

    if (!reservation) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#1a1a1a',
                margin: 0,
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0
            }}>
                <div style={{
                    backgroundColor: '#2d2d2d',
                    padding: '30px',
                    borderRadius: '8px',
                    border: '1px solid #444',
                    textAlign: 'center',
                    maxWidth: '400px',
                    width: '90%'
                }}>
                    <h3 style={{ color: '#ffa726', marginBottom: '15px', fontSize: '18px' }}>No Reservation Information</h3>
                    <p style={{ color: '#ccc', marginBottom: '0', fontSize: '14px' }}>Please check your reservation ID.</p>
                </div>
            </div>
        );
    }

    const statusInfo = getStatusColor(reservation.status);

    return (
        <>
            <style>{`
                body {
                    margin: 0 !important;
                    padding: 0 !important;
                    overflow-x: hidden;
                }
                html {
                    margin: 0 !important;
                    padding: 0 !important;
                }
            `}</style>
            <div style={{
                minHeight: '100vh',
                backgroundImage: 'url(/images/bg_4.jpg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                padding: '15px',
                margin: 0,
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0
            }}>
                <div style={{
                    maxWidth: '500px',
                    margin: '0 auto'
                }}>
                    <div style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        overflow: 'hidden',
                        backdropFilter: 'blur(10px)'
                    }}>
                        {/* Header */}
                        <div style={{
                            backgroundColor: 'rgba(0, 0, 0, 0.9)',
                            color: 'white',
                            padding: '12px',
                            textAlign: 'center',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
                        }}>
                            <h2 style={{ margin: 0, fontSize: '16px' }}>📋 Reservation Information</h2>
                        </div>

                        {/* Content */}
                        <div style={{ padding: '15px' }}>
                            {/* Status Badge */}
                            <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                                <span style={{
                                    backgroundColor: statusInfo.color,
                                    color: 'white',
                                    padding: '4px 12px',
                                    borderRadius: '12px',
                                    fontSize: '12px',
                                    fontWeight: 'bold'
                                }}>
                                    {statusInfo.text}
                                </span>
                            </div>

                            {/* Table */}
                            <div style={{
                                border: '1px solid #333',
                                borderRadius: '6px',
                                overflow: 'hidden'
                            }}>
                                <table style={{
                                    width: '100%',
                                    borderCollapse: 'collapse',
                                    fontSize: '12px',
                                    backgroundColor: 'rgba(0, 0, 0, 0.7)'
                                }}>
                                    <thead style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}>
                                        <tr>
                                            <th style={{
                                                padding: '8px',
                                                textAlign: 'left',
                                                borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                                                fontWeight: 'bold',
                                                color: 'white',
                                                width: '35%',
                                                fontSize: '11px'
                                            }}>
                                                Information
                                            </th>
                                            <th style={{
                                                padding: '8px',
                                                textAlign: 'left',
                                                borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                                                fontWeight: 'bold',
                                                color: 'white',
                                                fontSize: '11px'
                                            }}>
                                                Details
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td style={{ padding: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.2)', fontWeight: 'bold', color: '#e0e0e0', fontSize: '11px' }}>
                                                Reservation ID
                                            </td>
                                            <td style={{ padding: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.2)', color: 'white', fontSize: '11px' }}>
                                                #{reservation.reservationId}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.2)', fontWeight: 'bold', color: '#e0e0e0', fontSize: '11px' }}>
                                                Customer Name
                                            </td>
                                            <td style={{ padding: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.2)', color: 'white', fontSize: '11px' }}>
                                                {reservation.customerName}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.2)', fontWeight: 'bold', color: '#e0e0e0', fontSize: '11px' }}>
                                                Phone Number
                                            </td>
                                            <td style={{ padding: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.2)', color: 'white', fontSize: '11px' }}>
                                                {reservation.phone}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.2)', fontWeight: 'bold', color: '#e0e0e0', fontSize: '11px' }}>
                                                Email
                                            </td>
                                            <td style={{ padding: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.2)', color: 'white', fontSize: '11px' }}>
                                                {reservation.email}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.2)', fontWeight: 'bold', color: '#e0e0e0', fontSize: '11px' }}>
                                                Branch
                                            </td>
                                            <td style={{ padding: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.2)', color: 'white', fontSize: '11px' }}>
                                                {reservation.branchName}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.2)', fontWeight: 'bold', color: '#e0e0e0', fontSize: '11px' }}>
                                                Date
                                            </td>
                                            <td style={{ padding: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.2)', color: 'white', fontSize: '11px' }}>
                                                {formatDate(reservation.reservedAt)}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.2)', fontWeight: 'bold', color: '#e0e0e0', fontSize: '11px' }}>
                                                Time
                                            </td>
                                            <td style={{ padding: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.2)', color: 'white', fontSize: '11px' }}>
                                                {formatTime(reservation.reservedAt)}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.2)', fontWeight: 'bold', color: '#e0e0e0', fontSize: '11px' }}>
                                                Party Size
                                            </td>
                                            <td style={{ padding: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.2)', color: 'white', fontSize: '11px' }}>
                                                {reservation.partySize} people
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.2)', fontWeight: 'bold', color: '#e0e0e0', fontSize: '11px' }}>
                                                Status
                                            </td>
                                            <td style={{ padding: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.2)' }}>
                                                <span style={{
                                                    backgroundColor: statusInfo.color,
                                                    color: 'white',
                                                    padding: '2px 8px',
                                                    borderRadius: '8px',
                                                    fontSize: '10px'
                                                }}>
                                                    {statusInfo.text}
                                                </span>
                                            </td>
                                        </tr>
                                        {reservation.assignedTables && reservation.assignedTables.length > 0 && (
                                            <tr>
                                                <td style={{ padding: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.2)', fontWeight: 'bold', color: '#e0e0e0', fontSize: '11px' }}>
                                                    Assigned Tables
                                                </td>
                                                <td style={{ padding: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.2)' }}>
                                                    {reservation.assignedTables.map((table, index) => (
                                                        <span key={index} style={{
                                                            backgroundColor: '#28a745',
                                                            color: 'white',
                                                            padding: '2px 5px',
                                                            borderRadius: '3px',
                                                            marginRight: '3px',
                                                            fontSize: '10px'
                                                        }}>
                                                            Table {table.label}
                                                        </span>
                                                    ))}
                                                </td>
                                            </tr>
                                        )}
                                        {reservation.notes && (
                                            <tr>
                                                <td style={{ padding: '8px', fontWeight: 'bold', color: '#e0e0e0', fontSize: '11px' }}>
                                                    Notes
                                                </td>
                                                <td style={{ padding: '8px', color: 'white', fontSize: '11px' }}>
                                                    {reservation.notes}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Status Message */}
                            <div style={{ marginTop: '15px' }}>
                                {reservation.status?.toUpperCase() === 'PENDING' && (
                                    <div style={{
                                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        color: '#ffa726',
                                        padding: '10px',
                                        borderRadius: '4px',
                                        textAlign: 'center',
                                        fontSize: '11px'
                                    }}>
                                        <strong>⏰ Reservation is pending</strong><br />
                                        <span style={{ color: '#e0e0e0' }}>We are processing your reservation.</span>
                                    </div>
                                )}
                                {reservation.status?.toUpperCase() === 'CONFIRMED' && (
                                    <div style={{
                                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        color: '#4caf50',
                                        padding: '10px',
                                        borderRadius: '4px',
                                        textAlign: 'center',
                                        fontSize: '11px'
                                    }}>
                                        <strong>✅ Reservation confirmed</strong><br />
                                        <span style={{ color: '#e0e0e0' }}>Your table has been reserved.</span>
                                    </div>
                                )}
                                {reservation.status?.toUpperCase() === 'CANCELLED' && (
                                    <div style={{
                                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        color: '#f44336',
                                        padding: '10px',
                                        borderRadius: '4px',
                                        textAlign: 'center',
                                        fontSize: '11px'
                                    }}>
                                        <strong>❌ Reservation cancelled</strong><br />
                                        <span style={{ color: '#e0e0e0' }}>This reservation has been cancelled.</span>
                                    </div>
                                )}
                                {reservation.status?.toUpperCase() === 'COMPLETED' && (
                                    <div style={{
                                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        color: '#2196f3',
                                        padding: '10px',
                                        borderRadius: '4px',
                                        textAlign: 'center',
                                        fontSize: '11px'
                                    }}>
                                        <strong>🎉 Reservation completed</strong><br />
                                        <span style={{ color: '#e0e0e0' }}>Thank you for visiting!</span>
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div style={{ textAlign: 'center', marginTop: '15px' }}>
                                <button
                                    onClick={fetchReservation}
                                    style={{
                                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                        color: 'white',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        padding: '6px 12px',
                                        borderRadius: '3px',
                                        cursor: 'pointer',
                                        fontSize: '11px',
                                        marginRight: '10px'
                                    }}
                                >
                                    🔄 Refresh
                                </button>

                                {reservation.status?.toUpperCase() === 'PENDING' && (
                                    <button
                                        onClick={handleCancelReservation}
                                        disabled={cancelling}
                                        style={{
                                            backgroundColor: cancelling ? 'rgba(0, 0, 0, 0.5)' : 'rgba(220, 53, 69, 0.8)',
                                            color: 'white',
                                            border: '1px solid rgba(255, 255, 255, 0.2)',
                                            padding: '6px 12px',
                                            borderRadius: '3px',
                                            cursor: cancelling ? 'not-allowed' : 'pointer',
                                            fontSize: '11px',
                                            opacity: cancelling ? 0.6 : 1
                                        }}
                                    >
                                        {cancelling ? '⏳ Cancelling...' : '❌ Cancel Reservation'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SimpleTrackReservation;
