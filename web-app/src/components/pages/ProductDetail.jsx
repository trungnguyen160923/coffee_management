import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { productService } from '../../services/productService';
import { cartService } from '../../services/cartService';

const ProductDetail = () => {
    const { id } = useParams();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedDetailId, setSelectedDetailId] = useState(null);
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            try {
                setLoading(true);
                const data = await productService.getProductById(id);
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

    const selectedDetail = useMemo(() => {
        return product?.productDetails?.find(d => d.pdId === selectedDetailId) || null;
    }, [product, selectedDetailId]);

    const formatPrice = (value) => new Intl.NumberFormat('vi-VN').format(Number(value || 0));

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
                                <div className="input-group col-md-6 d-flex mb-3">
                                    <span className="input-group-btn mr-2">
                                        <button type="button" className="quantity-left-minus btn" onClick={dec}><i className="icon-minus"></i></button>
                                    </span>
                                    <input type="text" readOnly className="form-control input-number" value={quantity} />
                                    <span className="input-group-btn ml-2">
                                        <button type="button" className="quantity-right-plus btn" onClick={inc}><i className="icon-plus"></i></button>
                                    </span>
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
        </>
    );
};

export default ProductDetail;


