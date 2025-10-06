import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cartService } from '../../services/cartService';
import { orderService } from '../../services/orderService';
import { emailService } from '../../services/emailService';
import axios from 'axios';

const CheckoutPage = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: '',
        province: '',
        provinceCode: '',
        district: '',
        districtCode: '',
        ward: '',
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
            ward: ''
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
            ward: ''
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
        const { name, province, district, ward, phone, email } = formData;
        return (
            name.trim() !== '' &&
            province.trim() !== '' &&
            district.trim() !== '' &&
            ward.trim() !== '' &&
            phone.trim() !== '' &&
            email.trim() !== ''
        );
    };

    const onSubmit = async (e) => {
        e.preventDefault();

        // Check authentication first
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Please login before placing an order.');
            navigate('/coffee/login');
            return;
        }

        if (!validateRequired()) {
            alert('Please fill all the details !!');
            return;
        }

        try {
            setSubmitting(true);
            // Fetch cart to build order items
            const cartItems = await cartService.getCartItems();
            if (!cartItems || cartItems.length === 0) {
                alert('Your cart is empty. Please add items before checkout.');
                return;
            }

            const user = localStorage.getItem('user');
            const customerId = user ? JSON.parse(user).userId : null;

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
                customerId: customerId,
                customerName: formData.name,
                phone: formData.phone,
                deliveryAddress: fullDeliveryAddress, // Lưu đầy đủ địa chỉ vào DB
                branchSelectionAddress: deliveryAddress, // Chỉ dùng để tìm chi nhánh
                // branchId sẽ được tự động chọn bởi backend
                paymentMethod: formData.paymentMethod,
                discount: 0,
                orderItems: cartItems.map(it => ({
                    productId: it.productId,
                    productDetailId: it.productDetailId,
                    quantity: it.quantity
                })),
                notes: formData.notes
            };

            const orderResult = await orderService.createOrder(payload);
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

            alert('Order placed successfully! Confirmation email has been sent.');
            window.dispatchEvent(new Event('cartUpdated'));
            navigate('/coffee');
        } catch (error) {
            console.error('Order creation failed:', error);
            const errorMsg = error?.response?.data?.message || error.message || 'Failed to place order';
            alert('Order failed: ' + errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

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
            {/* Hero Section to mirror checkout.php */}
            <section className="home-slider owl-carousel">
                <div className="slider-item" style={{ backgroundImage: 'url(/images/bg_3.jpg)' }} data-stellar-background-ratio="0.5">
                    <div className="overlay"></div>
                    <div className="container">
                        <div className="row slider-text justify-content-center align-items-center">
                            <div className="col-md-7 col-sm-12 text-center ftco-animate">
                                <h1 className="mb-3 mt-5 bread">Checkout</h1>
                                <p className="breadcrumbs">
                                    <span className="mr-2"><Link to="/coffee">Home</Link></span>
                                    <span>Checkout</span>
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
                                                <option value="CASH">Cash</option>
                                                <option value="CARD">Card</option>
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
                                                        <div className="product-image me-3">
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
                                                        <div className="product-info flex-grow-1">
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
                                                                        ${(item.price * item.quantity).toFixed(2)}
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
                                            <div className="input-group mb-2">
                                                <input
                                                    type="text"
                                                    className="form-control form-control-sm"
                                                    placeholder="Enter code"
                                                    disabled
                                                />
                                                <button
                                                    type="button"
                                                    className="btn btn-primary btn-sm fw-bold"
                                                    disabled
                                                >
                                                    Apply
                                                </button>
                                            </div>
                                        </div>

                                        <div className="order-total mt-4 pt-3 border-top">
                                            <div className="d-flex justify-content-between align-items-center">
                                                <h5 className="mb-0">Total:</h5>
                                                <h5 className="mb-0 text-primary">
                                                    ${cartItems.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2)}
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

export default CheckoutPage;

