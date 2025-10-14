import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cartService } from '../../services/cartService';
import { orderService } from '../../services/orderService';
import { emailService } from '../../services/emailService';
import { discountService } from '../../services/discountService';
import MomoPaymentPage from './MomoPaymentPage';
import axios from 'axios';
import { showToast } from '../../utils/toast';

const GuestCheckout = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: '',
        province: '',
        provinceCode: '',
        district: '',
        districtCode: '',
        ward: '',
        wardCode: '',
        phone: '',
        email: '',
        paymentMethod: 'CASH',
        notes: ''
    });

    const [provinces, setProvinces] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [wards, setWards] = useState([]);

    const [submitting, setSubmitting] = useState(false);
    const [cartItems, setCartItems] = useState([]);
    const [showMomoPayment, setShowMomoPayment] = useState(false);
    const [orderInfo, setOrderInfo] = useState(null);
    const [discountCode, setDiscountCode] = useState('');
    const [appliedDiscount, setAppliedDiscount] = useState(null);
    const [discountError, setDiscountError] = useState(null);

    // Fetch provinces and cart items on mount
    useEffect(() => {
        fetchProvinces();
        fetchCartItems();
    }, []);

    const fetchProvinces = async () => {
        try {
            const response = await axios.get('http://localhost:8000/api/provinces/p');
            setProvinces(response.data);
        } catch (error) {
            console.error('Error fetching provinces:', error);
        }
    };

    const fetchCartItems = async () => {
        try {
            const items = await cartService.getCartItems();
            setCartItems(items || []);
        } catch (error) {
            console.error('Error fetching cart items:', error);
            setCartItems([]);
        }
    };

    const handleApplyDiscount = async () => {
        if (!discountCode.trim()) {
            setDiscountError('Please enter a discount code');
            showToast('Please enter a discount code', 'warning');
            return;
        }

        try {
            setDiscountError(null);
            const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

            const result = await discountService.validateDiscount(discountCode, cartTotal);

            if (result.result && result.result.isValid) {
                const discountData = result.result;

                const appliedDiscountData = {
                    code: discountData.discountCode,
                    name: discountData.discountName,
                    amount: Number(discountData.discountAmount),
                    type: discountData.discountType,
                    originalAmount: Number(discountData.originalAmount),
                    finalAmount: Number(discountData.finalAmount)
                };

                setAppliedDiscount(appliedDiscountData);
                showToast(`Applied code ${appliedDiscountData.code} successfully`, 'success');
            } else {
                const errorMessage = result.result?.message || result.message || 'Invalid discount code';
                setDiscountError(errorMessage);
                showToast(errorMessage, 'error');
            }
        } catch (error) {
            setDiscountError('Failed to apply discount. Please try again.');
            showToast('Failed to apply discount. Please try again.', 'error');
        }
    };

    const handleRemoveDiscount = async () => {
        try {
            // Remove discount from frontend state
            setAppliedDiscount(null);
            setDiscountCode('');
            setDiscountError(null);
            showToast('Discount removed', 'info');

            // Optional: Call service for logging/cleanup
            await discountService.removeDiscount();
        } catch (error) {
            console.error('Error removing discount:', error);
            // Even if service call fails, still remove from UI
            setAppliedDiscount(null);
            setDiscountCode('');
            setDiscountError(null);
            showToast('Discount removed', 'info');
        }
    };

    const fetchDistricts = async (provinceCode) => {
        try {
            const response = await axios.get(`http://localhost:8000/api/provinces/p/${provinceCode}?depth=2`);
            setDistricts(response.data.districts || []);
            setWards([]);
        } catch (error) {
            console.error('Error fetching districts:', error);
        }
    };

    const fetchWards = async (districtCode) => {
        try {
            const response = await axios.get(`http://localhost:8000/api/provinces/d/${districtCode}?depth=2`);
            setWards(response.data.wards || []);
        } catch (error) {
            console.error('Error fetching wards:', error);
        }
    };

    const onChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleProvinceChange = (e) => {
        const selectedOption = e.target.options[e.target.selectedIndex];
        const provinceCode = selectedOption.value;
        const provinceName = selectedOption.text;

        setFormData((prev) => ({
            ...prev,
            province: provinceName,
            provinceCode: provinceCode,
            district: '',
            districtCode: '',
            ward: '',
            wardCode: ''
        }));

        setDistricts([]);
        setWards([]);

        if (provinceCode) {
            fetchDistricts(provinceCode);
        }
    };

    const handleDistrictChange = (e) => {
        const selectedOption = e.target.options[e.target.selectedIndex];
        const districtCode = selectedOption.value;
        const districtName = selectedOption.text;

        setFormData((prev) => ({
            ...prev,
            district: districtName,
            districtCode: districtCode,
            ward: '',
            wardCode: ''
        }));

        setWards([]);

        if (districtCode) {
            fetchWards(districtCode);
        }
    };

    const handleWardChange = (e) => {
        const wardName = e.target.options[e.target.selectedIndex].text;
        setFormData((prev) => ({
            ...prev,
            ward: wardName
        }));
    };


    const validateRequired = () => {
        const { name, province, district, phone } = formData;
        return (
            name.trim() !== '' &&
            province.trim() !== '' &&
            district.trim() !== '' &&
            phone.trim() !== ''
        );
    };

    // Function to proceed with order creation (after payment success)
    const proceedWithOrder = async () => {
        try {
            setSubmitting(true);
            // Fetch cart to build order items
            const cartItems = await cartService.getCartItems();
            if (!cartItems || cartItems.length === 0) {
                alert('Your cart is empty. Please add items before checkout.');
                return;
            }

            // Build full deliveryAddress for database storage
            const fullDeliveryAddress = [
                formData.ward,
                formData.district,
                formData.province
            ].filter(a => a.trim()).join(', ');

            // Build deliveryAddress for branch selection (district + province only)
            const deliveryAddress = [
                formData.district,
                formData.province
            ].filter(a => a.trim()).join(', ');

            const payload = {
                customerName: formData.name,
                phone: formData.phone,
                email: formData.email,
                deliveryAddress: fullDeliveryAddress, // Lưu đầy đủ địa chỉ vào DB
                branchSelectionAddress: deliveryAddress, // Chỉ dùng để tìm chi nhánh
                paymentMethod: formData.paymentMethod,
                discount: appliedDiscount ? appliedDiscount.amount : 0,
                discountCode: appliedDiscount ? appliedDiscount.code : null,
                orderItems: cartItems.map(it => ({
                    productId: it.productId,
                    productDetailId: it.productDetailId,
                    quantity: it.quantity
                })),
                notes: formData.notes
            };


            const orderResult = await orderService.createGuestOrder(payload);
            try { await cartService.clearCart(); } catch (_) { }

            // Send order confirmation email
            try {
                const emailData = {
                    email: formData.email,
                    customerName: formData.name,
                    orderId: orderResult?.orderId || 'N/A',
                    orderItems: cartItems,
                    totalAmount: cartItems.reduce((total, item) => total + (item.price * item.quantity), 0),
                    deliveryAddress: fullDeliveryAddress,
                    paymentMethod: formData.paymentMethod,
                    orderDate: new Date().toLocaleString('vi-VN')
                };
                await emailService.sendOrderConfirmation(emailData);
            } catch (emailError) {
                console.error('Failed to send confirmation email:', emailError);
                // Don't fail the order if email fails
            }

            alert('Guest order placed successfully! Confirmation email has been sent.');
            window.dispatchEvent(new Event('cartUpdated'));
            navigate('/coffee');
        } catch (error) {
            console.error('Guest order creation failed:', error);
            const errorMsg = error?.response?.data?.message || error.message || 'Failed to place guest order';
            alert('Guest order failed: ' + errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    const onSubmit = async (e) => {
        e.preventDefault();

        if (!validateRequired()) {
            alert('Please fill all the required fields (Name, Province, District, Phone) !!');
            return;
        }

        // Check if Momo payment is selected
        if (formData.paymentMethod === 'CARD') {
            // Prepare order info for Momo payment
            const totalAmount = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
            const orderId = `ORD${Date.now()}`;

            setOrderInfo({
                orderId: orderId,
                description: `Coffee Order - ${formData.name}`,
                totalAmount: totalAmount,
                customerName: formData.name,
                phone: formData.phone,
                email: formData.email
            });

            setShowMomoPayment(true);
            return;
        }

        // For cash payment, proceed directly
        await proceedWithOrder();
    };

    // Handle Momo payment success
    const handleMomoPaymentSuccess = () => {
        setShowMomoPayment(false);
        proceedWithOrder();
    };

    // Handle Momo payment failure
    const handleMomoPaymentFailure = () => {
        setShowMomoPayment(false);
        alert('Payment failed. Please try again.');
    };

    // Handle go back from Momo payment
    const handleMomoGoBack = () => {
        setShowMomoPayment(false);
        setOrderInfo(null);
    };

    // Show Momo payment page if selected
    if (showMomoPayment && orderInfo) {
        return (
            <MomoPaymentPage
                orderInfo={orderInfo}
                onPaymentSuccess={handleMomoPaymentSuccess}
                onPaymentFailure={handleMomoPaymentFailure}
                onGoBack={handleMomoGoBack}
            />
        );
    }

    return (
        <>
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #000;
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #333;
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #555;
                }
            `}</style>
            {/* Hero Section */}
            <section className="home-slider owl-carousel">
                <div className="slider-item" style={{ backgroundImage: 'url(/images/bg_3.jpg)' }} data-stellar-background-ratio="0.5">
                    <div className="overlay"></div>
                    <div className="container">
                        <div className="row slider-text justify-content-center align-items-center">
                            <div className="col-md-7 col-sm-12 text-center">
                                <h1 className="mb-3 mt-5 bread">CHECKOUT</h1>
                                <p className="breadcrumbs">
                                    <span className="mr-2"><Link to="/coffee">Home</Link></span>
                                    <span>CHECKOUT</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Billing Form Section */}
            <section className="ftco-section">
                <div className="container">
                    <div className="row">
                        {/* Left Column - Billing Form */}
                        <div className="col-md-8 ftco-animate">
                            <form onSubmit={onSubmit} className="billing-form ftco-bg-dark p-3 p-md-5">
                                <h3 className="mb-4 billing-heading">Billing Details</h3>
                                <div className="row align-items-end">
                                    <div className="col-md-12">
                                        <div className="form-group">
                                            <label htmlFor="name">Full Name *</label>
                                            <input
                                                type="text"
                                                id="name"
                                                name="name"
                                                value={formData.name}
                                                onChange={onChange}
                                                className="form-control"
                                                placeholder="Enter your full name"
                                            />
                                        </div>
                                    </div>

                                    <div className="w-100"></div>

                                    {/* Payment Method */}
                                    <div className="col-md-12">
                                        <div className="form-group">
                                            <label htmlFor="payment-method">Payment Method</label>
                                            <select
                                                id="payment-method"
                                                name="paymentMethod"
                                                value={formData.paymentMethod}
                                                onChange={onChange}
                                                className="form-control"
                                            >
                                                <option value="CASH">Cash On Delivery (COD)</option>
                                                <option value="CARD">Momo e-wallet</option>

                                            </select>
                                        </div>
                                    </div>

                                    <div className="w-100"></div>

                                    <div className="col-md-12">
                                        <div className="form-group">
                                            <label htmlFor="province">Province / City *</label>
                                            <div className="select-wrap">
                                                <div className="icon">
                                                    <span className="ion-ios-arrow-down"></span>
                                                </div>
                                                <select
                                                    name="province"
                                                    id="province"
                                                    value={formData.provinceCode}
                                                    onChange={handleProvinceChange}
                                                    className="form-control"
                                                >
                                                    <option value="">Select Province/City</option>
                                                    {provinces.map((province) => (
                                                        <option key={province.code} value={province.code}>
                                                            {province.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="w-100"></div>

                                    <div className="col-md-12">
                                        <div className="form-group">
                                            <label htmlFor="district">District *</label>
                                            <div className="select-wrap">
                                                <div className="icon">
                                                    <span className="ion-ios-arrow-down"></span>
                                                </div>
                                                <select
                                                    name="district"
                                                    id="district"
                                                    value={formData.districtCode}
                                                    onChange={handleDistrictChange}
                                                    className="form-control"
                                                    disabled={!formData.provinceCode}
                                                >
                                                    <option value="">Select District</option>
                                                    {districts.map((district) => (
                                                        <option key={district.code} value={district.code}>
                                                            {district.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="w-100"></div>

                                    <div className="col-md-12">
                                        <div className="form-group">
                                            <label htmlFor="ward">Ward *</label>
                                            <div className="select-wrap">
                                                <div className="icon">
                                                    <span className="ion-ios-arrow-down"></span>
                                                </div>
                                                <select
                                                    name="ward"
                                                    id="ward"
                                                    value={formData.ward}
                                                    onChange={handleWardChange}
                                                    className="form-control"
                                                    disabled={!formData.districtCode}
                                                >
                                                    <option value="">Select Ward</option>
                                                    {wards.map((ward) => (
                                                        <option key={ward.code} value={ward.name}>
                                                            {ward.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="w-100"></div>

                                    <div className="col-md-6">
                                        <div className="form-group">
                                            <label htmlFor="phone">Phone *</label>
                                            <input
                                                type="text"
                                                id="phone"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={onChange}
                                                className="form-control"
                                                placeholder=""
                                            />
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="form-group">
                                            <label htmlFor="email">Email Address *</label>
                                            <input
                                                type="email"
                                                id="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={onChange}
                                                className="form-control"
                                                placeholder=""
                                            />
                                        </div>
                                    </div>

                                    <div className="w-100"></div>

                                    <div className="col-md-12">
                                        <div className="form-group">
                                            <label htmlFor="notes">Order Notes (Optional)</label>
                                            <textarea
                                                id="notes"
                                                name="notes"
                                                value={formData.notes}
                                                onChange={onChange}
                                                className="form-control"
                                                rows="3"
                                                placeholder="Any special instructions for your order..."
                                            />
                                        </div>
                                    </div>

                                    <div className="w-100"></div>

                                    <div className="col-md-12">
                                        <div className="form-group mt-4">
                                            <div className="radio">
                                                <p>
                                                    <button
                                                        type="submit"
                                                        name="submit"
                                                        id="submit"
                                                        disabled={submitting}
                                                        className="btn btn-primary py-3 px-4"
                                                    >
                                                        {submitting ? 'Placing...' : 'Place an order'}
                                                    </button>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* Right Column - Order Summary */}
                        <div className="col-md-4 ftco-animate">
                            <div className="order-summary ftco-bg-dark p-4 p-md-5" style={{
                                minHeight: '600px'
                            }}>
                                <h3 className="mb-4 billing-heading">Your Order</h3>

                                {cartItems.length === 0 ? (
                                    <div className="text-center py-4">
                                        <p className="text-muted">Your cart is empty</p>
                                        <Link to="/coffee" className="btn btn-primary">
                                            Continue Shopping
                                        </Link>
                                    </div>
                                ) : (
                                    <>
                                        <div className="order-items custom-scrollbar" style={{
                                            maxHeight: '500px',
                                            overflowY: 'auto',
                                            paddingRight: '10px',
                                            scrollbarWidth: 'thin',
                                            scrollbarColor: '#333 #000'
                                        }}>
                                            {cartItems.map((item, index) => (
                                                <div key={index} className="order-item mb-3 pb-3 border-bottom">
                                                    <div className="d-flex">
                                                        {/* Product Image */}
                                                        <div className="product-image me-4" style={{ minWidth: '60px' }}>
                                                            <img
                                                                src={item.imageUrl || '/images/menu-1.jpg'}
                                                                alt={item.name}
                                                                className="img-fluid"
                                                                style={{
                                                                    width: '60px',
                                                                    height: '60px',
                                                                    objectFit: 'cover',
                                                                    borderRadius: '8px',
                                                                    border: '1px solid #ddd'
                                                                }}
                                                                onError={(e) => {
                                                                    e.target.src = '/images/menu-1.jpg';
                                                                }}
                                                            />
                                                        </div>

                                                        {/* Product Info */}
                                                        <div className="product-info flex-grow-1" style={{ paddingLeft: '10px' }}>
                                                            <h6 className="mb-1 text-primary">{item.name}</h6>
                                                            {item.size && (
                                                                <small className="text-muted d-block mb-1">
                                                                    <i className="fa fa-tag me-1"></i>
                                                                    Size: {item.size}
                                                                </small>
                                                            )}
                                                            <div className="d-flex justify-content-between align-items-center">
                                                                <div className="quantity-info">
                                                                    <small className="text-muted">
                                                                        <i className="fa fa-shopping-cart me-1"></i>
                                                                        Qty: {item.quantity}
                                                                    </small>
                                                                </div>
                                                                <div className="item-price">
                                                                    <span className="price fw-bold text-primary">
                                                                        {(item.price * item.quantity).toLocaleString('vi-VN')}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}


                                        </div>

                                        {/* Discount Code Section */}
                                        <div className="discount-section mt-4 pt-3 border-top">
                                            <h6 className="mb-3">
                                                <i className="fa fa-tag me-2"></i>
                                                Discount Code
                                            </h6>

                                            {appliedDiscount ? (
                                                <div className="applied-discount">
                                                    <div className="discount-applied-card" style={{
                                                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                                        border: '2px solid #C39C5E',
                                                        color: '#ffffff',
                                                        padding: '12px',
                                                        borderRadius: '8px',
                                                        marginBottom: '12px',
                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                                    }}>
                                                        <div className="d-flex align-items-center mb-2">
                                                            <i className="fa fa-check-circle me-2" style={{ color: '#C39C5E' }}></i>
                                                            <strong style={{ color: '#ffffff' }}>Discount Applied</strong>
                                                        </div>
                                                        <div className="discount-code" style={{
                                                            fontSize: '16px',
                                                            fontWeight: '600',
                                                            color: '#ffffff',
                                                            marginBottom: '4px'
                                                        }}>
                                                            {appliedDiscount.code}
                                                        </div>
                                                        <div className="discount-amount" style={{
                                                            fontSize: '14px',
                                                            color: '#ffffff'
                                                        }}>
                                                            You saved: <span style={{ fontWeight: '600', color: '#C39C5E' }}>{appliedDiscount.amount.toLocaleString('vi-VN')} VND</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={handleRemoveDiscount}
                                                        className="btn btn-sm"
                                                        style={{
                                                            backgroundColor: 'transparent',
                                                            color: '#C39C5E',
                                                            border: '1px solid #C39C5E',
                                                            width: '100%',
                                                            borderRadius: '6px',
                                                            padding: '8px 12px',
                                                            fontSize: '14px',
                                                            transition: 'all 0.2s ease'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.target.style.backgroundColor = '#C39C5E';
                                                            e.target.style.color = '#ffffff';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.target.style.backgroundColor = 'transparent';
                                                            e.target.style.color = '#C39C5E';
                                                        }}
                                                    >
                                                        <i className="fa fa-times me-1"></i>
                                                        Remove Discount
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="discount-input">
                                                    <div className="input-group mb-2">
                                                        <input
                                                            type="text"
                                                            className="form-control form-control-sm"
                                                            placeholder="Enter code"
                                                            value={discountCode}
                                                            onChange={(e) => setDiscountCode(e.target.value)}
                                                        />
                                                        <button
                                                            type="button"
                                                            className="btn btn-primary btn-sm fw-bold"
                                                            onClick={handleApplyDiscount}
                                                        >
                                                            Apply
                                                        </button>
                                                    </div>
                                                    {/* Toast will show messages instead of inline error */}
                                                </div>
                                            )}
                                        </div>
                                        {/* VAT + Totals */}
                                        <div className="mt-3">
                                            {(() => {
                                                const subtotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
                                                const vat = subtotal * 0.1; // 10% VAT on products subtotal
                                                return (
                                                    <>
                                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                                            <span className="mb-0" style={{ color: '#ffffff' }}>Subtotal</span>
                                                            <span className="mb-0" style={{ color: '#ffffff' }}>{subtotal.toLocaleString('vi-VN')} VND</span>
                                                        </div>
                                                        <div className="d-flex justify-content-between align-items-center">
                                                            <span className="mb-0" style={{ color: '#ffffff' }}>VAT (10%)</span>
                                                            <span className="mb-0" style={{ color: '#ffffff' }}>{vat.toLocaleString('vi-VN')} VND</span>
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                        </div>

                                        <div className="order-total mt-3 pt-3 border-top">
                                            <div className="d-flex justify-content-between align-items-center">
                                                <h5 className="mb-0" style={{ color: '#C39C5E' }}>Total:</h5>
                                                <h5 className="mb-0" style={{ color: '#C39C5E' }}>
                                                    {(() => {
                                                        const subtotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
                                                        const vat = subtotal * 0.1; // 10% VAT on products subtotal
                                                        const discountedSubtotal = appliedDiscount
                                                            ? appliedDiscount.finalAmount
                                                            : subtotal;
                                                        const totalWithVat = discountedSubtotal + vat;
                                                        return totalWithVat.toLocaleString('vi-VN');
                                                    })()} VND
                                                </h5>
                                            </div>
                                        </div>

                                        <div className="order-notes mt-4">
                                            <small className="text-muted">
                                                <i className="fa fa-info-circle"></i>
                                                You will receive a confirmation email after placing your order.
                                            </small>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
};

export default GuestCheckout;
