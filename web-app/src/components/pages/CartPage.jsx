import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cartService } from '../../services/cartService';

const CartPage = () => {
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [subtotal, setSubtotal] = useState(0);
    const [delivery, setDelivery] = useState(5.00);
    const [discount, setDiscount] = useState(3.00);
    const [total, setTotal] = useState(0);
    const [error, setError] = useState(null);
    const [totalItems, setTotalItems] = useState(0); // Track totalItems from API

    useEffect(() => {
        loadCartItems();
    }, []);

    const loadCartItems = async () => {
        try {
            setLoading(true);
            setError(null);
            const [items, totals] = await Promise.all([
                cartService.getCartItems(),
                cartService.getCartTotal().catch(() => null)
            ]);
            setCartItems(items || []);
            setTotalItems(totals?.result?.totalItems || 0); // Store totalItems
            if (totals && typeof totals.result?.totalAmount !== 'undefined') {
                setSubtotal(Number(totals.result.totalAmount || 0));
                setTotal(Number(totals.result.totalAmount || 0) + delivery - discount);
            } else {
                calculateTotals(items || []);
            }
        } catch (error) {
            console.error('Error loading cart items:', error);
            setError('Failed to load cart items. Please try again.');
            setCartItems([]);
        } finally {
            setLoading(false);
        }
    };

    const calculateTotals = (items) => {
        const subtotalValue = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        setSubtotal(subtotalValue);
        setTotal(subtotalValue + delivery - discount);
    };

    const removeItem = async (productId) => {
        const previousItems = [...cartItems];
        setCartItems((prev) => {
            const next = prev.filter((i) => i.productId !== productId);
            calculateTotals(next);
            return next;
        });
        try {
            await cartService.removeFromCart(productId);
            window.dispatchEvent(new Event('cartUpdated'));
        } catch (error) {
            console.error('Error removing item:', error);
            setCartItems(previousItems);
            calculateTotals(previousItems);
            setError('Failed to remove item. Reverted changes.');
            loadCartItems(); // Sync with server
        }
    };

    const updateQuantity = async (productId, newQuantity) => {
        if (newQuantity < 1) return;
        const previousItems = [...cartItems];
        setCartItems((prev) => {
            const next = prev.map((item) =>
                item.productId === productId ? { ...item, quantity: newQuantity } : item
            );
            calculateTotals(next);
            return next;
        });
        try {
            await cartService.updateQuantity(productId, newQuantity);
            window.dispatchEvent(new Event('cartUpdated'));
        } catch (error) {
            console.error('Error updating quantity:', error);
            setCartItems(previousItems);
            calculateTotals(previousItems);
            setError('Failed to update quantity. Reverted changes.');
            loadCartItems(); // Sync with server
        }
    };

    const formatPrice = (value) => {
        return new Intl.NumberFormat('vi-VN').format(Number(value || 0));
    };

    const handleCheckout = () => {
        if (total > 0) {
            const token = localStorage.getItem('token');
            window.location.href = token ? '/coffee/checkout' : '/coffee/guest-checkout';
        }
    };

    if (loading) {
        return (
            <div className="container text-center py-5">
                <div className="spinner-border" role="status">
                    <span className="sr-only">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <>
            <section className="ftco-section ftco-cart" style={{ paddingTop: '100px' }}>
                <div className="container">
                    {error && (
                        <div className="alert alert-danger" role="alert">
                            {error}
                            <button onClick={loadCartItems} className="btn btn-link">Retry</button>
                        </div>
                    )}
                    <div className="row">
                        <div className="col-md-12">
                            <div className="cart-list">
                                <table className="table" style={{ display: 'table', visibility: 'visible' }}>
                                    <thead className="thead-primary">
                                        <tr className="text-center">
                                            <th>&nbsp;</th>
                                            <th>&nbsp;</th>
                                            <th>Product</th>
                                            <th>Price</th>
                                            <th>Quantity</th>
                                            <th>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cartItems.length > 0 ? (
                                            cartItems.map((item) => (
                                                <tr key={item.cartItemId ?? `${item.productId}-${item.productDetailId}`} className="text-center">
                                                    <td className="product-remove">
                                                        <button
                                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeItem(item.productId); }}
                                                            style={{
                                                                background: 'none',
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                color: '#c49b63'
                                                            }}
                                                        >
                                                            <span className="icon-close"></span>
                                                        </button>
                                                    </td>
                                                    <td className="image-prod">
                                                        <div
                                                            className="img"
                                                            style={{
                                                                backgroundImage: `url(${item.imageUrl})`,
                                                                width: '80px',
                                                                height: '80px',
                                                                backgroundSize: 'cover',
                                                                backgroundPosition: 'center',
                                                                borderRadius: '8px'
                                                            }}
                                                        ></div>
                                                    </td>
                                                    <td className="product-name">
                                                        <h3>{item.name}</h3>
                                                        <p>{item.description}</p>
                                                    </td>
                                                    <td className="price">{formatPrice(item.price)}</td>
                                                    <td>
                                                        <div className="input-group mb-3" style={{ maxWidth: '220px', margin: '0 auto' }}>
                                                            <div className="input-group-prepend">
                                                                <button
                                                                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                                                    className="btn btn-outline-secondary"
                                                                    type="button"
                                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); updateQuantity(item.productId, item.quantity - 1); }}
                                                                    style={{
                                                                        backgroundColor: 'rgba(21, 17, 17, 0.8)',
                                                                        color: '#c49b63',
                                                                        border: '1px solid #c49b63',
                                                                        width: '44px',
                                                                        height: '44px',
                                                                        fontSize: '22px',
                                                                        lineHeight: 1,
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center'
                                                                    }}
                                                                >
                                                                    -
                                                                </button>
                                                            </div>
                                                            <input
                                                                type="text"
                                                                className="form-control text-center"
                                                                value={item.quantity}
                                                                readOnly
                                                                style={{
                                                                    backgroundColor: 'rgba(21, 17, 17, 0.8)',
                                                                    color: '#fff',
                                                                    border: '1px solid #c49b63',
                                                                    height: '44px',
                                                                    fontSize: '18px'
                                                                }}
                                                            />
                                                            <div className="input-group-append">
                                                                <button
                                                                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                                                    className="btn btn-outline-secondary"
                                                                    type="button"
                                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); updateQuantity(item.productId, item.quantity + 1); }}
                                                                    style={{
                                                                        backgroundColor: 'rgba(21, 17, 17, 0.8)',
                                                                        color: '#c49b63',
                                                                        border: '1px solid #c49b63',
                                                                        width: '44px',
                                                                        height: '44px',
                                                                        fontSize: '22px',
                                                                        lineHeight: 1,
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center'
                                                                    }}
                                                                >
                                                                    +
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="total">{formatPrice(item.price * item.quantity)}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="6" className="text-center">
                                                    {totalItems > 0 || subtotal > 0 ? (
                                                        <>
                                                            <h5>Error: Cart items could not be loaded</h5>
                                                            <p>It looks like there are {totalItems} items in your cart, but we couldn't retrieve them. Please try again.</p>
                                                            <button onClick={loadCartItems} className="btn btn-primary mt-3">
                                                                Retry
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <h5>Your Cart is Empty</h5>
                                                            <Link to="/coffee/menu" className="btn btn-primary mt-3">
                                                                Continue Shopping
                                                            </Link>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {cartItems.length > 0 && (
                        <div className="row justify-content-end">
                            <div className="col col-lg-3 col-md-6 mt-5 cart-wrap">
                                <div className="cart-total mb-3" style={{
                                    background: '#151111',
                                    border: '2px solid #c49b63',
                                    padding: '20px',
                                    borderRadius: '8px'
                                }}>
                                    <h3 style={{ color: '#c49b63' }}>Cart Totals</h3>
                                    <p className="d-flex">
                                        <span style={{ color: '#fff' }}>Subtotal</span>
                                        <span style={{ color: '#c49b63' }}>{formatPrice(subtotal)}</span>
                                    </p>
                                    <p className="d-flex">
                                        <span style={{ color: '#fff' }}>Delivery</span>
                                        <span style={{ color: '#c49b63' }}>{formatPrice(delivery)}</span>
                                    </p>
                                    <p className="d-flex">
                                        <span style={{ color: '#fff' }}>Discount</span>
                                        <span style={{ color: '#c49b63' }}>-{formatPrice(discount)}</span>
                                    </p>
                                    <hr style={{ borderColor: '#c49b63' }} />
                                    <p className="d-flex total-price">
                                        <span style={{ color: '#fff', fontWeight: 'bold' }}>Total</span>
                                        <span style={{ color: '#c49b63', fontWeight: 'bold' }}>{formatPrice(total)}</span>
                                    </p>
                                </div>
                                <button
                                    className="btn btn-primary py-3 px-4"
                                    onClick={handleCheckout}
                                    style={{
                                        backgroundColor: '#c49b63',
                                        color: '#151111',
                                        border: '1px solid #c49b63',
                                        width: '100%'
                                    }}
                                >
                                    Proceed to Checkout
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </>
    );
};

export default CartPage;