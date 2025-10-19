import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { productService } from '../../services/productService';
import { cartService } from '../../services/cartService';
import { branchService } from '../../services/branchService';
import { reviewService } from '../../services/reviewService';
import { 
    Star, 
    User, 
    MapPin, 
    Calendar, 
    Quote, 
    Edit, 
    Send, 
    X, 
    RotateCcw, 
    Search,
    Plus,
    Minus
} from 'lucide-react';

const ProductDetail = () => {
    const { id } = useParams();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedDetailId, setSelectedDetailId] = useState(null);
    const [quantity, setQuantity] = useState(1);
    
    // Review states
    const [reviews, setReviews] = useState([]);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [branches, setBranches] = useState([]);
    const [reviewFilters, setReviewFilters] = useState({
        branchId: '',
        rating: '',
        timeRange: '',
        keyword: ''
    });

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            try {
                setLoading(true);
                const data = await productService.getProductByIdForPublic(id);
                if (mounted) setProduct(data);
                if (mounted && data?.productDetails?.length) {
                    setSelectedDetailId(data.productDetails[0].pdId);
                }
            } catch (e) {
                if (mounted) setProduct(null);
            } finally {
                if (mounted) setLoading(false);
            }
        };
        load();
        return () => { mounted = false; };
    }, [id]);

    // Load branches once
    useEffect(() => {
        const loadBranches = async () => {
            try {
                const response = await branchService.getAllBranches();
                setBranches(response || []);
            } catch (error) {
                console.error('Failed to load branches:', error);
            }
        };
        loadBranches();
    }, []);

    // Load reviews when product ID or filters change
    useEffect(() => {
        const loadReviews = async () => {
            try {
                setReviewsLoading(true);
                // Remove timeRange from API call as backend doesn't support it
                const { timeRange, ...apiFilters } = reviewFilters;
                
                // Only send non-empty filters to API
                const cleanFilters = Object.fromEntries(
                    Object.entries(apiFilters).filter(([key, value]) => 
                        value !== '' && value !== null && value !== undefined
                    )
                );
                
                const reviews = await reviewService.getReviews({
                    productId: id,
                    ...cleanFilters
                });
                
                // Filter by timeRange on frontend if specified
                let filteredReviews = reviews || [];
                if (timeRange && timeRange !== '') {
                    const days = parseInt(timeRange);
                    const cutoffDate = new Date();
                    cutoffDate.setDate(cutoffDate.getDate() - days);
                    
                    filteredReviews = reviews.filter(review => {
                        const reviewDate = new Date(review.createAt);
                        return reviewDate >= cutoffDate;
                    });
                }
                
                setReviews(filteredReviews);
            } catch (error) {
                console.error('Failed to load reviews:', error);
                setReviews([]);
            } finally {
                setReviewsLoading(false);
            }
        };

        if (id) {
            loadReviews();
        }
    }, [id, reviewFilters]);

    const selectedDetail = useMemo(() => {
        return product?.productDetails?.find(d => d.pdId === selectedDetailId) || null;
    }, [product, selectedDetailId]);

    const formatPrice = (value) => new Intl.NumberFormat('vi-VN').format(Number(value || 0)) + ' VND';

    const handleAddToCart = async (e) => {
        e.preventDefault();
        if (!product || !selectedDetail) return;
        try {
            await cartService.addToCart(product.productId, selectedDetail.pdId, quantity);
            window.dispatchEvent(new Event('cartUpdated'));
        } catch (err) {
            console.error('Add to cart failed', err);
        }
    };

    const dec = () => setQuantity(q => Math.max(1, q - 1));
    const inc = () => setQuantity(q => Math.min(100, q + 1));

    // Review functions
    const handleFilterChange = (key, value) => {
        setReviewFilters(prev => ({
            ...prev,
            [key]: value
        }));
    };

    // Clear all filters
    const clearFilters = () => {
        setReviewFilters({
            branchId: '',
            rating: '',
            timeRange: '',
            keyword: ''
        });
    };


    const renderStars = (rating) => {
        return Array.from({ length: 5 }, (_, i) => (
            <Star 
                key={i} 
                className={i < rating ? 'text-warning' : 'text-muted'}
                size={16}
                fill={i < rating ? 'currentColor' : 'none'}
            />
        ));
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    // Helper function to check if current user is the reviewer
    const isCurrentUserReviewer = (review) => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const currentUserId = user?.userId || user?.user_id || user?.id;
        return review.customerId === currentUserId;
    };

    if (loading) return (
        <div className="container text-center py-5">
            <div className="spinner-border" role="status">
                <span className="sr-only">Loading...</span>
            </div>
        </div>
    );

    if (!product) return (
        <div className="container py-5 text-center">
            <h4>Product not found</h4>
            <Link to="/coffee/menu" className="btn btn-primary mt-3">Back to Menu</Link>
        </div>
    );

    return (
        <>
            <style>
                {`
                    select option {
                        background-color: #2a2a2a !important;
                        color: white !important;
                    }
                    select option:hover {
                        background-color: #c49b63 !important;
                        color: white !important;
                    }
                `}
            </style>
            {/* Hero Header giống PHP */}
            <section className="home-slider owl-carousel">
                <div className="slider-item" style={{ backgroundImage: 'url(/images/bg_3.jpg)' }} data-stellar-background-ratio="0.5">
                    <div className="overlay"></div>
                    <div className="container">
                        <div className="row slider-text justify-content-center align-items-center">
                            <div className="col-md-7 col-sm-12 text-center ftco-animate">
                                <h1 className="mb-3 mt-5 bread">Product Detail</h1>
                                <p className="breadcrumbs"><span className="mr-2"><Link to="/coffee">Home</Link></span> <span>Product Detail</span></p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Product Detail section */}
            <section className="ftco-section">
                <div className="container">
                    <div className="row">
                        <div className="col-lg-6 mb-5 ftco-animate">
                            <a href={productService.getFullImageUrl(product.imageUrl)} className="image-popup">
                                <img src={productService.getFullImageUrl(product.imageUrl)} className="img-fluid" alt={product.name} style={{ borderRadius: '8px' }} />
                            </a>
                        </div>
                        <div className="col-lg-6 product-details pl-md-5 ftco-animate">
                            <h3>{product.name}</h3>
                            <p className="price"><span>{selectedDetail ? formatPrice(selectedDetail.price) : '—'}</span></p>
                            <p className="text-muted">{product.description}</p>

                            <div className="row mt-4">
                                {/* Chỉ hiển thị size section nếu sản phẩm có size */}
                                {product.productDetails &&
                                    product.productDetails.some(detail => detail.size?.name) && (
                                        <div className="col-md-12">
                                            <div className="form-group">
                                                <label>Size:</label>
                                                <div className="d-flex flex-wrap" role="radiogroup" aria-label="Size options">
                                                    {product.productDetails?.map(detail => {
                                                        const isActive = selectedDetailId === detail.pdId;
                                                        return (
                                                            <button
                                                                key={detail.pdId}
                                                                type="button"
                                                                onClick={() => setSelectedDetailId(detail.pdId)}
                                                                aria-pressed={isActive}
                                                                className="btn btn-outline-secondary mr-2 mb-2"
                                                                data-custom-style="true"
                                                                style={{
                                                                    backgroundColor: isActive ? '#c49b63' : 'transparent',
                                                                    color: '#ffffff !important',
                                                                    border: '1px solid #c49b63',
                                                                    fontWeight: 'bold !important',
                                                                    textShadow: '2px 2px 4px rgba(0,0,0,1) !important',
                                                                    WebkitTextStroke: '0.5px #000000 !important'
                                                                }}
                                                            >
                                                                {detail.size?.name || 'Default'}
                                                            </button>

                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                <div className="w-100"></div>
                                <div className="col-md-12">
                                    <div className="form-group">
                                        <label>Quantity:</label>
                                        <div className="input-group d-flex align-items-center" style={{ maxWidth: '200px' }}>
                                                   <button 
                                                       type="button" 
                                                       className="btn btn-outline-secondary" 
                                                       onClick={dec}
                                                       style={{ 
                                                           border: '1px solid #c49b63', 
                                                           color: '#c49b63',
                                                           backgroundColor: 'transparent',
                                                           minWidth: '40px',
                                                           height: '40px',
                                                           display: 'flex',
                                                           alignItems: 'center',
                                                           justifyContent: 'center'
                                                       }}
                                                   >
                                                       <Minus size={16} />
                                                   </button>
                                            <input 
                                                type="text" 
                                                readOnly 
                                                className="form-control text-center" 
                                                value={quantity}
                                                style={{ 
                                                    border: '1px solid #c49b63',
                                                    color: '#fff',
                                                    backgroundColor: 'transparent',
                                                    height: '40px',
                                                    borderRight: 'none',
                                                    height: '40px',
                                                    padding: '0 10px',
                                                    borderLeft: 'none',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    lineHeight: '40px'
                                                }}
                                            />
                                                   <button 
                                                       type="button" 
                                                       className="btn btn-outline-secondary" 
                                                       onClick={inc}
                                                       style={{ 
                                                           border: '1px solid #c49b63', 
                                                           color: '#c49b63',
                                                           backgroundColor: 'transparent',
                                                           minWidth: '40px',
                                                           height: '40px',
                                                           display: 'flex',
                                                           alignItems: 'center',
                                                           justifyContent: 'center'
                                                       }}
                                                   >
                                                       <Plus size={16} />
                                                   </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="d-flex gap-2">
                                <button className="btn btn-primary py-3 px-4 cart mr-2" onClick={handleAddToCart}>Add to Cart</button>
                                <Link className="btn btn-outline-secondary py-3 px-4" to="/coffee/menu">Back</Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Reviews Section */}
            <section className="ftco-section" style={{ backgroundColor: '#1a1a1a' }}>
                <div className="container">
                            <div className="row justify-content-center mb-5 pb-3">
                                <div className="col-md-7 heading-section ftco-animate text-center">
                                    <h2 className="mb-4 text-white">Product Reviews</h2>
                                    <p className="text-white-50">Share your experience with this product</p>
                                </div>
                            </div>

                    {/* Review Filters */}
                    <div className="row mb-4">
                        <div className="col-12">
                            <div className="ftco-animate">
                                <div className="row">
                                        <div className="col-md-3 mb-3">
                                            <label className="form-label text-white">Branch:</label>
                                            <select 
                                                className="form-control"
                                                value={reviewFilters.branchId}
                                                onChange={(e) => handleFilterChange('branchId', e.target.value)}
                                                style={{ 
                                                    border: '1px solid #c49b63', 
                                                    borderRadius: '5px',
                                                    backgroundColor: '#2a2a2a',
                                                    color: 'white'
                                                }}
                                            >
                                                <option value="">All Branches</option>
                                                {branches.map(branch => (
                                                    <option key={branch.branchId} value={branch.branchId}>
                                                        {branch.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    <div className="col-md-3 mb-3">
                                        <label className="form-label text-white">Rating:</label>
                                        <select 
                                            className="form-control"
                                            value={reviewFilters.rating}
                                            onChange={(e) => handleFilterChange('rating', e.target.value)}
                                            style={{ 
                                                border: '1px solid #c49b63', 
                                                borderRadius: '5px',
                                                backgroundColor: '#2a2a2a',
                                                color: 'white'
                                            }}
                                        >
                                            <option value="">All Ratings</option>
                                            <option value="5">★★★★★ 5 stars</option>
                                            <option value="4">★★★★☆ 4 stars</option>
                                            <option value="3">★★★☆☆ 3 stars</option>
                                            <option value="2">★★☆☆☆ 2 stars</option>
                                            <option value="1">★☆☆☆☆ 1 star</option>
                                        </select>
                                    </div>
                                    <div className="col-md-3 mb-3">
                                        <label className="form-label text-white">Time:</label>
                                        <select 
                                            className="form-control"
                                            value={reviewFilters.timeRange}
                                            onChange={(e) => handleFilterChange('timeRange', e.target.value)}
                                            style={{ 
                                                border: '1px solid #c49b63', 
                                                borderRadius: '5px',
                                                backgroundColor: '#2a2a2a',
                                                color: 'white'
                                            }}
                                        >
                                            <option value="">All Time</option>
                                            <option value="7">Last 7 days</option>
                                            <option value="30">Last 30 days</option>
                                            <option value="90">Last 3 months</option>
                                        </select>
                                    </div>
                                    <div className="col-md-3 mb-3">
                                        <label className="form-label text-white">Search:</label>
                                        <div className="d-flex">
                                            <input 
                                                type="text" 
                                                className="form-control"
                                                placeholder="Search in comments..."
                                                value={reviewFilters.keyword}
                                                onChange={(e) => handleFilterChange('keyword', e.target.value)}
                                                style={{ 
                                                    border: '1px solid #c49b63', 
                                                    borderRadius: '5px 0 0 5px',
                                                    backgroundColor: '#2a2a2a',
                                                    color: 'white'
                                                }}
                                            />
                                            <button 
                                                type="button"
                                                className="btn"
                                                onClick={clearFilters}
                                                style={{ 
                                                    backgroundColor: '#c49b63', 
                                                    color: 'white',
                                                    border: '1px solid #c49b63',
                                                    borderRadius: '0 5px 5px 0'
                                                }}
                                                title="Clear filters"
                                            >
                                                <RotateCcw size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>



                    {/* Reviews List */}
                    <div className="row">
                        <div className="col-12">
                            
                            {reviewsLoading && (!reviews || reviews.length === 0) && (
                                <div className="text-center py-5">
                                    <div className="spinner-border text-warning" role="status">
                                        <span className="sr-only">Loading...</span>
                                    </div>
                                    <p className="mt-3 text-white">Loading reviews...</p>
                                </div>
                            )}
                            
                            {!reviewsLoading && (!reviews || reviews.length === 0) && (
                                <div className="text-center py-5">
                                    <div className="ftco-animate">
                                        <Star size={48} className="text-muted" />
                                        <h5 className="mt-3 text-white">No Reviews Yet</h5>
                                        <p className="text-white-50">Be the first to review this product!</p>
                                    </div>
                                </div>
                            )}
                            
                            {reviews && reviews.length > 0 && (
                                <div className="row">
                                    {reviews.map((review, index) => (
                                        <div key={`review-${review.reviewId || index}`} className="col-12 mb-4">
                                            <div className="p-4 rounded" style={{ 
                                                backgroundColor: '#2a2a2a', 
                                                border: '1px solid #c49b63' 
                                            }}>
                                                    <div className="d-flex justify-content-between align-items-start mb-3">
                                                        <div className="flex-grow-1">
                                                            <div className="d-flex align-items-center mb-2">
                                                                <h6 className="mb-0 text-white font-weight-bold">
                                                                    <User size={16} className="mr-2" />
                                                                    {review.customer?.fullname || 'Customer'}
                                                                    {isCurrentUserReviewer(review) && (
                                                                        <span className="ml-2" style={{ 
                                                                            color: '#c49b63', 
                                                                            fontSize: '12px',
                                                                            fontWeight: 'bold'
                                                                        }}>
                                                                            (You)
                                                                        </span>
                                                                    )}
                                                                </h6>
                                                                {review.branch && (
                                                                    <span className="badge ml-2" style={{ 
                                                                        backgroundColor: '#c49b63', 
                                                                        color: 'white',
                                                                        fontSize: '12px'
                                                                    }}>
                                                                        <MapPin size={12} className="mr-1" />
                                                                        {review.branch.name}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="d-flex align-items-center">
                                                                <div className="mr-3">
                                                                    {renderStars(review.rating)}
                                                                </div>
                                                                <span className="text-white-50 small">
                                                                    <Calendar size={14} className="mr-1" />
                                                                    {formatDate(review.createAt)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {review.comment && (
                                                        <div className="mt-3">
                                                            <p className="text-white mb-0" style={{ lineHeight: '1.6' }}>
                                                                <Quote size={16} className="mr-2 text-muted" />
                                                                {review.comment}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                        </div>
                                        ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
};

export default ProductDetail;


