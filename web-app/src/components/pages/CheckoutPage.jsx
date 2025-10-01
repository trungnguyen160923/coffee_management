import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cartService } from '../../services/cartService';
import { orderService } from '../../services/orderService';

const CheckoutPage = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        country: '',
        streetAddress: '',
        townCity: '',
        zipCode: '',
        phone: '',
        email: '',
        paymentMethod: 'CASH',
        branchId: 1
    });

    const [submitting, setSubmitting] = useState(false);

    const onChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const validateRequired = () => {
        const { firstName, country, streetAddress, townCity, zipCode, phone, email } = formData;
        return (
            firstName.trim() !== '' &&
            country.trim() !== '' &&
            streetAddress.trim() !== '' &&
            townCity.trim() !== '' &&
            zipCode.trim() !== '' &&
            phone.trim() !== '' &&
            email.trim() !== ''
        );
    };

    const onSubmit = async (e) => {
        e.preventDefault();
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

            const payload = {
                customerId: customerId,
                branchId: formData.branchId,
                orderItems: cartItems.map(it => ({
                    productId: it.productId,
                    productDetailId: it.productDetailId,
                    quantity: it.quantity
                })),
                firstName: formData.firstName,
                lastName: formData.lastName,
                phone: formData.phone,
                email: formData.email,
                country: formData.country,
                streetAddress: formData.streetAddress,
                townCity: formData.townCity,
                zipCode: formData.zipCode,
                paymentMethod: formData.paymentMethod,
                notes: ''
            };

            await orderService.createOrder(payload);
            try { await cartService.clearCart(); } catch (_) { }
            alert('Order placed successfully!');
            window.dispatchEvent(new Event('cartUpdated'));
            navigate('/coffee');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
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
                        <div className="col-md-12 ftco-animate">
                            <form onSubmit={onSubmit} className="billing-form ftco-bg-dark p-3 p-md-5">
                                <h3 className="mb-4 billing-heading">Billing Details</h3>
                                <div className="row align-items-end">
                                    <div className="col-md-6">
                                        <div className="form-group">
                                            <label htmlFor="first-name">First Name *</label>
                                            <input
                                                type="text"
                                                id="first-name"
                                                name="firstName"
                                                value={formData.firstName}
                                                onChange={onChange}
                                                className="form-control"
                                                placeholder=""
                                            />
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="form-group">
                                            <label htmlFor="last-name">Last Name</label>
                                            <input
                                                type="text"
                                                id="last-name"
                                                name="lastName"
                                                value={formData.lastName}
                                                onChange={onChange}
                                                className="form-control"
                                                placeholder=""
                                            />
                                        </div>
                                    </div>

                                    <div className="w-100"></div>

                                    {/* Branch + Payment */}
                                    <div className="col-md-6">
                                        <div className="form-group">
                                            <label htmlFor="branch-id">Branch</label>
                                            <input
                                                type="number"
                                                id="branch-id"
                                                name="branchId"
                                                value={formData.branchId}
                                                onChange={onChange}
                                                className="form-control"
                                                min={1}
                                            />
                                        </div>
                                    </div>
                                    <div className="col-md-6">
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
                                            <label htmlFor="country">State / Country *</label>
                                            <div className="select-wrap">
                                                <div className="icon">
                                                    <span className="ion-ios-arrow-down"></span>
                                                </div>
                                                <select
                                                    name="country"
                                                    id="country"
                                                    value={formData.country}
                                                    onChange={onChange}
                                                    className="form-control"
                                                >
                                                    <option value="" hidden>Select State/Country</option>
                                                    <option value="France">France</option>
                                                    <option value="Italy">Italy</option>
                                                    <option value="India">India</option>
                                                    <option value="Philippines">Philippines</option>
                                                    <option value="South Korea">South Korea</option>
                                                    <option value="Hongkong">Hongkong</option>
                                                    <option value="Japan">Japan</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="w-100"></div>

                                    <div className="col-md-12">
                                        <div className="form-group">
                                            <label htmlFor="street-address">Street Address *</label>
                                            <input
                                                type="text"
                                                id="street-address"
                                                name="streetAddress"
                                                value={formData.streetAddress}
                                                onChange={onChange}
                                                className="form-control"
                                                placeholder="House number and street name"
                                            />
                                        </div>
                                    </div>

                                    <div className="w-100"></div>

                                    <div className="col-md-6">
                                        <div className="form-group">
                                            <label htmlFor="town-or-city">Town / City *</label>
                                            <input
                                                type="text"
                                                id="town-or-city"
                                                name="townCity"
                                                value={formData.townCity}
                                                onChange={onChange}
                                                className="form-control"
                                                placeholder=""
                                            />
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="form-group">
                                            <label htmlFor="postcode-or-zip">Postcode / ZIP *</label>
                                            <input
                                                type="text"
                                                id="postcode-or-zip"
                                                name="zipCode"
                                                value={formData.zipCode}
                                                onChange={onChange}
                                                className="form-control"
                                                placeholder=""
                                            />
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
                    </div>
                </div>
            </section>
        </>
    );
};

export default CheckoutPage;

