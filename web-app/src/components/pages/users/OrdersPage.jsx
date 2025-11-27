import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderService } from '../../../services/orderService';
import { reviewService } from '../../../services/reviewService';
import { branchService } from '../../../services/branchService';
import { CONFIG } from '../../../configurations/configuration';
import { showToast } from '../../../utils/toast';
import { Star, X, Send, MapPin } from 'lucide-react';

const OrdersPage = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [branches, setBranches] = useState([]);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [newReview, setNewReview] = useState({
        rating: 5,
        comment: '',
        selectedProductId: null
    });
    const [submittingReview, setSubmittingReview] = useState(false);
    const [existingReviews, setExistingReviews] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        // Check authentication
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/auth/login');
            return;
        }

        // Fetch orders data
        fetchOrders();
        fetchBranches();
    }, [navigate]);

    const fetchOrders = async () => {
        try {
            setLoading(true);

            // Get user info from localStorage
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const customerId = user?.userId || user?.user_id || user?.id;

                if (!customerId) {
                    console.error('Customer ID not found');
                    showToast('Customer ID not found. Please login again.', 'error');
                    setOrders([]);
                    return;
                }

            // Fetch real data from API
            const response = await orderService.getOrdersByCustomer(customerId);

            if (response && response.result) {
                setOrders(response.result);
                // Fetch existing reviews for all orders
                const allReviews = [];
                for (const order of response.result) {
                    const orderReviews = await fetchExistingReviews(order);
                    allReviews.push(...orderReviews);
                }
                setExistingReviews(allReviews);
            } else {
                setOrders([]);
            }
            } catch (error) {
                console.error('Error fetching orders:', error);
                const errorMessage = error.response?.data?.message || 'Failed to load orders. Please try again.';
                showToast(errorMessage, 'error');
                setOrders([]);
            } finally {
                setLoading(false);
            }
    };

    const fetchBranches = async () => {
        try {
            const response = await branchService.getAllBranches();
            setBranches(response || []);
        } catch (error) {
            console.error('Failed to load branches:', error);
            const errorMessage = error.response?.data?.message || 'Failed to load branches. Some features may not work properly.';
            showToast(errorMessage, 'warning');
        }
    };

    const fetchExistingReviews = async (order) => {
        try {
            const productIds = order.orderItems?.map(item => item.productId).filter(Boolean) || [];
            if (productIds.length === 0) return [];

            // Get current user ID
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const customerId = user?.userId || user?.user_id || user?.id;
            if (!customerId) return [];

            const reviews = [];
            for (const productId of productIds) {
                try {
                    // Fetch reviews for this product and filter by current customer
                    const response = await reviewService.getReviews({ 
                        productId, 
                        customerId: customerId 
                    });
                    reviews.push(...response);
                } catch (error) {
                    console.error(`Failed to fetch reviews for product ${productId}:`, error);
                    // Don't show toast for individual product review fetch failures
                }
            }
            return reviews;
        } catch (error) {
            console.error('Failed to fetch existing reviews:', error);
            // Don't show toast for review fetch failures as it's not critical
            return [];
        }
    };

    // Helper function to check if a product has been reviewed in this order
    const isProductReviewedInOrder = (productId, orderId) => {
        return existingReviews.some(review => 
            review.productId === productId && review.orderId === orderId
        );
    };

    // Helper function to get review count for a product (all orders)
    const getProductReviewCount = (productId) => {
        return existingReviews.filter(review => review.productId === productId).length;
    };

    // Helper function to get review count for this specific order
    const getOrderReviewCount = (order) => {
        if (!order.orderItems || order.orderItems.length === 0) return 0;
        return order.orderItems.filter(item => 
            isProductReviewedInOrder(item.productId, order.orderId)
        ).length;
    };

    // Helper function to check if all products in this order have been reviewed
    const areAllProductsReviewedInOrder = (order) => {
        if (!order.orderItems || order.orderItems.length === 0) return false;
        return order.orderItems.every(item => 
            isProductReviewedInOrder(item.productId, order.orderId)
        );
    };

    // Helper function to get total products count for an order
    const getTotalProductsCount = (order) => {
        return order.orderItems?.length || 0;
    };

    const handleReviewClick = async (order) => {
        setSelectedOrder(order);
        setNewReview({
            rating: 5,
            comment: '',
            selectedProductId: null
        });
        
        // Fetch branch name if not available
        if (order.branchId && !order.branchName) {
            try {
                const branch = branches.find(b => b.branchId === order.branchId);
                if (branch) {
                    setSelectedOrder(prev => ({ ...prev, branchName: branch.name }));
                }
            } catch (error) {
                console.error('Failed to get branch name:', error);
                const errorMessage = error.response?.data?.message || 'Failed to load branch information.';
                showToast(errorMessage, 'warning');
            }
        }

        // Fetch existing reviews for this order's products
        const reviews = await fetchExistingReviews(order);
        setExistingReviews(reviews);
        
        setShowReviewModal(true);
    };

    const handleSubmitReview = async (e) => {
        e.preventDefault();
        if (!selectedOrder) return;

        try {
            setSubmittingReview(true);
            
            // Validate product selection
            if (!newReview.selectedProductId) {
                showToast('Please select a product to add review', 'error');
                return;
            }

            await reviewService.createReview({
                productId: newReview.selectedProductId,
                orderId: selectedOrder.orderId,
                branchId: selectedOrder.branchId || 1,
                rating: newReview.rating,
                comment: newReview.comment
            });

            showToast('Review added successfully!', 'success');
            
            // Refresh existing reviews
            if (selectedOrder) {
                const updatedReviews = await fetchExistingReviews(selectedOrder);
                setExistingReviews(updatedReviews);
            }
            
            setShowReviewModal(false);
            setSelectedOrder(null);
            setNewReview({ rating: 5, comment: '', selectedProductId: null });
        } catch (error) {
            console.error('Failed to submit review:', error);
            const errorMessage = error.response?.data?.message || 'Failed to add review. Please try again.';
            showToast(errorMessage, 'error');
        } finally {
            setSubmittingReview(false);
        }
    };

    const handleCancelOrder = async (orderId) => {
        if (window.confirm('Are you sure you want to cancel this order?')) {
            try {
                await orderService.cancelOrderPublic(orderId);
                alert('Order cancelled successfully!');
                // Refresh the orders list
                fetchOrders();
            } catch (error) {
                console.error('Error cancelling order:', error);
                alert('An error occurred while cancelling the order. Please try again.');
            }
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatTime = (dateTimeString) => {
        if (!dateTimeString) return 'N/A';
        const date = new Date(dateTimeString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const formatPrice = (value) => {
        return new Intl.NumberFormat('vi-VN').format(Number(value || 0)) + ' VND';
    };

    const columns = [
        {
            header: 'Order ID',
            key: 'orderId'
        },
        {
            header: 'Customer Name',
            key: 'customerName'
        },
        {
            header: 'Phone',
            key: 'phone'
        },
        {
            header: 'Address',
            key: 'deliveryAddress',
            render: (order) => (
                <div style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {order.deliveryAddress || 'N/A'}
                </div>
            )
        },
        {
            header: 'Order Date',
            key: 'orderDate',
            render: (order) => formatDate(order.orderDate)
        },
        {
            header: 'Time',
            key: 'orderDate',
            render: (order) => formatTime(order.orderDate)
        },
        {
            header: 'Items',
            key: 'orderItems',
            render: (order) => order.orderItems?.length || 0
        },
        {
            header: 'Total Amount',
            key: 'totalAmount',
            render: (order) => formatPrice(order.totalAmount)
        },
        {
            header: 'Payment',
            key: 'paymentMethod'
        },
        {
            header: 'Status',
            key: 'status',
            render: (order) => {
                const getStatusStyle = (status) => {
                    const baseStyle = {
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        color: '#fff'
                    };

                    // Normalize status for comparison - trim whitespace and convert to uppercase
                    const normalizedStatus = status?.toString().trim().toUpperCase();

                    switch (normalizedStatus) {
                        case 'PENDING':
                            return { ...baseStyle, backgroundColor: '#c49b63' }; // Coffee brown
                        case 'PREPARING':
                            return { ...baseStyle, backgroundColor: '#17a2b8' }; // Blue
                        case 'READY':
                            return { ...baseStyle, backgroundColor: '#28a745' }; // Green
                        case 'COMPLETED':
                            return { ...baseStyle, backgroundColor: '#6c757d' }; // Gray
                        case 'CANCELLED':
                            return { ...baseStyle, backgroundColor: '#dc3545' }; // Red
                        default:
                            return { ...baseStyle, backgroundColor: '#6c757d' }; // Default gray
                    }
                };

                return (
                    <span style={getStatusStyle(order.status)}>
                        {order.status}
                    </span>
                );
            }
        },
{
    header: 'Actions',
    key: 'actions',
    render: (order) => {
        // Normalize status for comparison - trim whitespace and convert to uppercase
        const normalizedStatus = order.status?.toString().trim().toUpperCase();

        // Pending order: allow cancel
        if (normalizedStatus === 'PENDING') {
            return (
                <button
                    onClick={() => handleCancelOrder(order.orderId)}
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
                    title="Cancel Order"
                >
                    🗑️
                </button>
            );
        }

        // Completed order: allow review
        if (normalizedStatus === 'COMPLETED') {
            // Get review statistics for this order
            const orderReviewCount = getOrderReviewCount(order);
            const totalProducts = getTotalProductsCount(order);
            const allReviewed = areAllProductsReviewedInOrder(order);

            return (
                <button
                    onClick={() => handleReviewClick(order)}
                    style={{
                        backgroundColor: allReviewed ? '#28a745' : '#c49b63',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}
                >
                    <Star size={14} />
                    {allReviewed ? 'Reviewed' : `Review (${orderReviewCount}/${totalProducts})`}
                </button>
            );
        }

        // Otherwise, show status or a placeholder
        return (
            <span style={{ color: '#666', fontSize: '12px' }}>
                {order.status || '-'}
            </span>
        );
    }
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
                                <h1 className="mb-3 mt-5 bread">My Orders</h1>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Orders Table Section */}
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
                                <h3 style={{ color: 'white', fontSize: '1.5rem', textAlign: 'center', marginBottom: '30px' }}>Order History</h3>
                                

                                {loading ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: 'white' }}>
                                        <div className="spinner-border text-warning" role="status">
                                            <span className="sr-only">Loading...</span>
                                        </div>
                                        <p style={{ marginTop: '15px' }}>Loading orders...</p>
                                    </div>
                                ) : orders.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: 'white' }}>
                                        <p>You don't have any Orders!</p>
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
                                                {orders.map((order, index) => (
                                                    <tr key={index} style={{ backgroundColor: 'transparent' }}>
                                                        {columns.map((column, colIndex) => (
                                                            <td key={colIndex} style={{
                                                                color: '#e0e0e0',
                                                                padding: '12px 10px',
                                                                border: 'none',
                                                                textAlign: column.key === 'orderId' || column.key === 'orderItems' ? 'center' : 'left',
                                                                fontSize: '13px'
                                                            }}>
                                                                {column.render ? column.render(order) : order[column.key]}
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

            {/* Review Modal */}
            {showReviewModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 9999
                }}>
                    <div style={{
                        backgroundColor: '#2a2a2a',
                        borderRadius: '10px',
                        padding: '30px',
                        width: '90%',
                        maxWidth: '500px',
                        border: '1px solid #c49b63',
                        color: 'white'
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '20px'
                        }}>
                                <h4 style={{ color: 'white', margin: 0 }}>
                                    <Star size={20} style={{ marginRight: '8px' }} />
                                    Add Review
                                </h4>
                            <button
                                onClick={() => setShowReviewModal(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'white',
                                    fontSize: '20px',
                                    cursor: 'pointer'
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {selectedOrder && (
                            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#1a1a1a', borderRadius: '5px' }}>
                                <h6 style={{ color: '#c49b63', marginBottom: '10px' }}>Order Details:</h6>
                                <p style={{ margin: '5px 0', fontSize: '14px' }}>
                                    <strong>Order ID:</strong> {selectedOrder.orderId}
                                </p>
                                <p style={{ margin: '5px 0', fontSize: '14px' }}>
                                    <strong>Branch:</strong> {selectedOrder.branchName || 'N/A'}
                                </p>
                                <p style={{ margin: '5px 0', fontSize: '14px' }}>
                                    <strong>Items:</strong> {selectedOrder.orderItems?.length || 0} items
                                </p>
                                <p style={{ margin: '5px 0', fontSize: '14px' }}>
                                    <strong>Total:</strong> {formatPrice(selectedOrder.totalAmount)}
                                </p>
                            </div>
                        )}

                        <form onSubmit={handleSubmitReview}>
                            {/* Branch info - read only */}
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'white' }}>
                                    Branch:
                                </label>
                                <div style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '5px',
                                    border: '1px solid #c49b63',
                                    backgroundColor: '#1a1a1a',
                                    color: 'white',
                                    fontSize: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <MapPin size={16} style={{ color: '#c49b63' }} />
                                    {selectedOrder?.branchName || 'N/A'}
                                </div>
                            </div>

                            {/* Product selection */}
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'white' }}>
                                    Select Product to Add Review:
                                </label>
                                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #c49b63', borderRadius: '5px' }}>
                                    {selectedOrder?.orderItems?.map((item, index) => {
                                        const isReviewedInThisOrder = isProductReviewedInOrder(item.productId, selectedOrder.orderId);
                                        const totalReviewCount = getProductReviewCount(item.productId);
                                        const isSelected = newReview.selectedProductId === item.productId;
                                        
                                        return (
                                            <div
                                                key={item.productId || index}
                                                onClick={() => !isReviewedInThisOrder && setNewReview(prev => ({ ...prev, selectedProductId: item.productId }))}
                                                style={{
                                                    padding: '12px',
                                                    borderBottom: '1px solid #333',
                                                    cursor: isReviewedInThisOrder ? 'not-allowed' : 'pointer',
                                                    backgroundColor: isSelected ? '#c49b63' : isReviewedInThisOrder ? '#28a745' : 'transparent',
                                                    color: 'white',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    opacity: isReviewedInThisOrder ? 0.7 : 1
                                                }}
                                            >
                                                <div>
                                                    <div style={{ fontWeight: 'bold', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        {item.product?.name || `Product ${item.productId}`}
                                                        {isReviewedInThisOrder && (
                                                            <span style={{ 
                                                                backgroundColor: '#28a745', 
                                                                color: 'white', 
                                                                padding: '2px 6px', 
                                                                borderRadius: '10px', 
                                                                fontSize: '10px',
                                                                fontWeight: 'bold'
                                                            }}>
                                                                REVIEWED
                                                            </span>
                                                        )}
                                                        {!isReviewedInThisOrder && totalReviewCount > 0 && (
                                                            <span style={{ 
                                                                backgroundColor: '#17a2b8', 
                                                                color: 'white', 
                                                                padding: '2px 6px', 
                                                                borderRadius: '10px', 
                                                                fontSize: '10px',
                                                                fontWeight: 'bold'
                                                            }}>
                                                                {totalReviewCount} PREVIOUS REVIEW{totalReviewCount > 1 ? 'S' : ''}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: '#ccc' }}>
                                                        Qty: {item.quantity} × {formatPrice(item.unitPrice)}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {isSelected && (
                                                        <div style={{ color: '#c49b63' }}>✓</div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                {!newReview.selectedProductId && (
                                    <div style={{ color: '#ff6b6b', fontSize: '12px', marginTop: '5px' }}>
                                        Please select a product to add review
                                    </div>
                                )}
                                <div style={{ color: '#c49b63', fontSize: '12px', marginTop: '5px' }}>
                                    💡 You can review the same product multiple times when you order it again, but only once per order
                                </div>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'white' }}>
                                    Rating:
                                </label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setNewReview(prev => ({...prev, rating: star}))}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                padding: '5px'
                                            }}
                                        >
                                            <Star
                                                size={24}
                                                style={{
                                                    color: star <= newReview.rating ? '#ffc107' : '#666',
                                                    fill: star <= newReview.rating ? '#ffc107' : 'none'
                                                }}
                                            />
                                        </button>
                                    ))}
                                    <span style={{ color: '#c49b63', fontWeight: 'bold' }}>
                                        ({newReview.rating}/5)
                                    </span>
                                </div>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'white' }}>
                                    Comment:
                                </label>
                                <textarea
                                    value={newReview.comment}
                                    onChange={(e) => setNewReview(prev => ({...prev, comment: e.target.value}))}
                                    placeholder="Share your experience..."
                                    rows="4"
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        borderRadius: '5px',
                                        border: '1px solid #c49b63',
                                        backgroundColor: '#1a1a1a',
                                        color: 'white',
                                        fontSize: '14px',
                                        resize: 'vertical'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowReviewModal(false)}
                                    style={{
                                        padding: '10px 20px',
                                        backgroundColor: '#6c757d',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '5px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingReview || !newReview.selectedProductId}
                                    style={{
                                        padding: '10px 20px',
                                        backgroundColor: (submittingReview || !newReview.selectedProductId) ? '#666' : '#c49b63',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '5px',
                                        cursor: (submittingReview || !newReview.selectedProductId) ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '5px'
                                    }}
                                >
                                    {submittingReview ? (
                                        <>
                                            <div className="spinner-border spinner-border-sm" role="status">
                                                <span className="sr-only">Loading...</span>
                                            </div>
                                            Submitting...
                                        </>
                                    ) : (
                                        <>
                                            <Send size={16} />
                                            Submit Review
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default OrdersPage;
