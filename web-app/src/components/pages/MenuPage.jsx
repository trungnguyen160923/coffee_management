import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import BookTableForm from '../shared/BookTableForm';
import ContactInfo from '../shared/ContactInfo';
import { productService } from '../../services/productService';
import { cartService } from '../../services/cartService';
import { categoryService } from '../../services/categoryService';

const MenuPage = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('coffee');
    const [categories, setCategories] = useState([]);
    const [pageByCategory, setPageByCategory] = useState({});
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedDetailId, setSelectedDetailId] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const PAGE_SIZE = 3;

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            try {
                setLoading(true);
                const [productsData, categoriesData] = await Promise.all([
                    productService.getAllProducts(),
                    categoryService.getAllCategories()
                ]);
                if (mounted) {
                    setProducts(Array.isArray(productsData) ? productsData : []);
                    const mappedCategories = (categoriesData || []).map(c => ({
                        key: (c.name || '').toLowerCase(),
                        label: c.name || ''
                    }));
                    setCategories(mappedCategories);
                    if (mappedCategories.length > 0) {
                        setActiveTab(mappedCategories[0].key || 'coffee');
                    }
                }
            } catch (e) {
                if (mounted) {
                    setProducts([]);
                    setCategories([]);
                }
            } finally {
                if (mounted) setLoading(false);
            }
        };
        load();
        return () => { mounted = false; };
    }, []);

    const categorizedProducts = useMemo(() => {
        return products.reduce((acc, p) => {
            const key = (p?.category?.name || 'Coffee').toLowerCase();
            if (!acc[key]) acc[key] = [];
            acc[key].push(p);
            return acc;
        }, {});
    }, [products]);

    // Fallback: nếu API categories rỗng, lấy theo dữ liệu sản phẩm
    const effectiveCategories = useMemo(() => {
        if (categories && categories.length > 0) return categories;
        const keys = Object.keys(categorizedProducts);
        return keys.map(k => ({ key: k, label: k.replace(/\b\w/g, c => c.toUpperCase()) }));
    }, [categories, categorizedProducts]);

    // Đảm bảo luôn có activeTab hợp lệ khi categories thay đổi
    useEffect(() => {
        if (!activeTab && effectiveCategories.length > 0) {
            setActiveTab(effectiveCategories[0].key);
        } else if (effectiveCategories.length > 0 && !effectiveCategories.some(c => c.key === activeTab)) {
            setActiveTab(effectiveCategories[0].key);
        }
    }, [effectiveCategories, activeTab]);

    const formatPrice = (value) => {
        if (value === undefined || value === null || isNaN(Number(value))) return 'N/A';
        return new Intl.NumberFormat('vi-VN').format(Number(value));
    };

    const getDisplayPrice = (product) => {
        const details = product?.productDetails || [];
        if (!details.length) return 'Price N/A';
        const min = details.reduce((m, d) => (d.price < m ? d.price : m), details[0].price);
        return ` ${formatPrice(min)}`;
    };

    const handleNext = (categoryKey, total) => {
        setPageByCategory(prev => {
            const current = prev[categoryKey] || 0;
            const next = (current + PAGE_SIZE) % total;
            return { ...prev, [categoryKey]: next };
        });
    };

    const handlePrev = (categoryKey, total) => {
        setPageByCategory(prev => {
            const current = prev[categoryKey] || 0;
            const next = (current - PAGE_SIZE + total) % total;
            return { ...prev, [categoryKey]: next };
        });
    };

    const handleShowProduct = async (productId) => {
        try {
            const product = await productService.getProductById(productId);
            setSelectedProduct(product);
            if (product?.productDetails?.length) {
                setSelectedDetailId(product.productDetails[0].pdId);
            }
            setQuantity(1);
        } catch (error) {
            console.error('Error loading product details:', error);
        }
    };

    const selectedDetail = useMemo(() => {
        return selectedProduct?.productDetails?.find(d => d.pdId === selectedDetailId) || null;
    }, [selectedProduct, selectedDetailId]);

    const handleAddToCart = async () => {
        if (!selectedProduct || !selectedDetail) return;
        try {
            await cartService.addToCart(selectedProduct.productId, selectedDetail.pdId, quantity);
            // Optional: close modal and maybe toast
            setSelectedProduct(null);
            // Dispatch event so header badges can update if implemented
            window.dispatchEvent(new CustomEvent('cartUpdated'));
        } catch (e) {
            console.error('Add to cart failed', e);
        }
    };

    const dec = () => setQuantity(q => Math.max(1, q - 1));
    const inc = () => setQuantity(q => Math.min(100, q + 1));

    const renderCardGrid = (items, categoryKey) => {
        const total = items.length;
        const start = pageByCategory[categoryKey] || 0;
        const visible = [];
        for (let i = 0; i < Math.min(PAGE_SIZE, total); i++) {
            visible.push(items[(start + i) % total]);
        }

        return (
            <>
                <div className="d-flex justify-content-end mb-2">
                    <button className="btn btn-light mr-2" onClick={() => handlePrev(categoryKey, total)} aria-label="Previous" title="Previous">
                        &#8249;
                    </button>
                    <button className="btn btn-light" onClick={() => handleNext(categoryKey, total)} aria-label="Next" title="Next">
                        &#8250;
                    </button>
                </div>
                <div className="row">
                    {visible.map((product) => (
                        <div key={product.productId} className="col-md-4 text-center mb-4">
                            <div className="menu-wrap">
                                <Link
                                    to={`/coffee/products/${product.productId}`}
                                    className="menu-img img mb-4 d-inline-block"
                                    style={{
                                        backgroundImage: `url(${productService.getFullImageUrl(product.imageUrl)})`,
                                        width: '100%',
                                        height: '200px',
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        borderRadius: '8px'
                                    }}
                                />
                                <div className="text">
                                    <h3>{product.name}</h3>
                                    <p>{product.description}</p>
                                    <p className="price"><span style={{ background: '#000', color: '#c49b63', padding: '2px 8px', borderRadius: '3px' }}>{getDisplayPrice(product)}</span></p>
                                    <p>
                                        <button
                                            onClick={() => handleShowProduct(product.productId)}
                                            className="btn btn-primary btn-outline-primary"
                                        >
                                            Show
                                        </button>
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </>
        );
    };

    // Show all available categories (from DB) in featured section
    const featuredCategoryKeys = useMemo(() => {
        // keep the original categories order if available
        const keysInOrder = effectiveCategories.map(c => c.key);
        const available = Object.keys(categorizedProducts);
        // fallback to available if no effective categories
        return (keysInOrder.length ? keysInOrder : available).filter(k => (categorizedProducts[k] || []).length > 0);
    }, [effectiveCategories, categorizedProducts]);

    return (
        <>
            {/* Hero Section */}
            <section className="home-slider owl-carousel">
                <div className="slider-item" style={{ backgroundImage: 'url(/images/bg_3.jpg)' }} data-stellar-background-ratio="0.5">
                    <div className="overlay"></div>
                    <div className="container">
                        <div className="row slider-text justify-content-center align-items-center">
                            <div className="col-md-7 col-sm-12 text-center ftco-animate">
                                <h1 className="mb-3 mt-5 bread">Our Menu</h1>
                                <p className="breadcrumbs">
                                    <span className="mr-2"><Link to="/coffee">Home</Link></span>
                                    <span>Menu</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Intro Section with Contact Info and Book Table Form */}
            <section className="ftco-intro">
                <div className="container-wrap">
                    <div className="wrap d-md-flex align-items-xl-end">
                        <ContactInfo />
                        <BookTableForm />
                    </div>
                </div>
            </section>

            {/* Featured Menu section above Discover */}
            <section className="ftco-section pt-5 pb-3">
                <div className="container">
                    {featuredCategoryKeys.length > 0 && (
                        featuredCategoryKeys.reduce((rows, key, idx) => {
                            if (idx % 2 === 0) rows.push([key]); else rows[rows.length - 1].push(key);
                            return rows;
                        }, []).map((pair, rowIdx) => (
                            <div key={rowIdx} className="row">
                                {pair.map((key) => (
                                    <div key={key} className="col-md-6 mb-5 pb-3">
                                        <h3 className="mb-5 heading-pricing" style={{ color: '#fff' }}>{effectiveCategories.find(c => c.key === key)?.label || key}</h3>
                                        {(categorizedProducts[key] || []).map((item) => (
                                            <div key={item.productId} className="pricing-entry d-flex" style={{ marginBottom: '20px' }}>
                                                <div
                                                    className="img"
                                                    style={{
                                                        backgroundImage: `url(${productService.getFullImageUrl(item.imageUrl)})`,
                                                        width: '54px',
                                                        height: '54px',
                                                        borderRadius: '50%',
                                                        backgroundSize: 'cover',
                                                        backgroundPosition: 'center'
                                                    }}
                                                ></div>
                                                <div className="desc pl-3" style={{ width: '100%' }}>
                                                    <div className="d-flex text align-items-center" style={{ marginBottom: '6px' }}>
                                                        <h3 style={{ margin: 0 }}><span style={{ color: '#fff', border: '1px solid #000', borderRadius: '3px', padding: '2px 8px' }}>{item.name}</span></h3>
                                                        <div className="flex-grow-1" style={{ borderTop: '1px dashed rgba(196,155,99,0.35)', margin: '0 12px' }}></div>
                                                        <span className="price" style={{ background: '#000', color: '#c49b63', padding: '2px 10px', borderRadius: '3px' }}>{getDisplayPrice(item)}</span>
                                                    </div>
                                                    <div className="d-block">
                                                        <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: '8px' }}>{item.description}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        ))
                    )}
                </div>
            </section>

            {/* Product Categories  */}
            <section className="ftco-menu mb-5 pb-5">
                <div className="container">
                    <div className="row justify-content-center mb-5">
                        <div className="col-md-7 heading-section text-center ftco-animate">
                            <span className="subheading">Discover</span>
                            <h2 className="mb-4">Our Products</h2>

                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="row d-md-flex">
                        <div className="col-lg-12 ftco-animate p-md-5">
                            <div className="row">
                                <div className="col-md-12 nav-link-wrap mb-5">
                                    <div className="nav ftco-animate nav-pills justify-content-center" role="tablist">
                                        {categories.map((c) => (
                                            <a
                                                key={c.key}
                                                className={`nav-link ${activeTab === c.key ? 'active' : ''}`}
                                                onClick={() => setActiveTab(c.key)}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                {c.label}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                                <div className="col-md-12 d-flex align-items-center">
                                    <div className="tab-content ftco-animate" style={{ width: '100%' }}>
                                        {loading ? (
                                            <div className="text-center w-100">
                                                <div className="spinner-border" role="status">
                                                    <span className="sr-only">Loading...</span>
                                                </div>
                                            </div>
                                        ) : (
                                            categories.map((c) => (
                                                <div key={c.key} className={`tab-pane fade ${activeTab === c.key ? 'show active' : ''}`}>
                                                    {categorizedProducts[c.key] && categorizedProducts[c.key].length > 0 ? (
                                                        renderCardGrid(categorizedProducts[c.key])
                                                    ) : (
                                                        <div className="text-center w-100"><p>No products in this category.</p></div>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Product Detail Modal */}
            {selectedProduct && (
                <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content" style={{
                            background: '#151111',
                            backgroundImage: 'url(/images/bg_4.jpg)',
                            backgroundRepeat: 'no-repeat',
                            backgroundAttachment: 'fixed',
                            backgroundSize: 'cover',
                            border: '2px solid #c49b63'
                        }}>
                            <div className="modal-header" style={{
                                background: 'rgba(21, 17, 17, 0.8)',
                                borderBottom: '1px solid #c49b63'
                            }}>
                                <h5 className="modal-title" style={{ color: '#c49b63' }}>Product Details</h5>
                                <button
                                    type="button"
                                    className="close"
                                    onClick={() => setSelectedProduct(null)}
                                    aria-label="Close"
                                    style={{ color: '#c49b63' }}
                                >
                                    <span aria-hidden="true">&times;</span>
                                </button>
                            </div>
                            <div className="modal-body" style={{
                                background: 'rgba(21, 17, 17, 0.7)'
                            }}>
                                <div className="row">
                                    <div className="col-md-6">
                                        <img
                                            src={productService.getFullImageUrl(selectedProduct.imageUrl)}
                                            className="img-fluid"
                                            alt={selectedProduct.name}
                                            style={{ borderRadius: '8px' }}
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <h3 style={{ color: '#c49b63' }}>{selectedProduct.name}</h3>
                                        <p className="price">
                                            <span style={{ color: '#c49b63', fontSize: '1.3em', fontWeight: 'bold' }}>
                                                {selectedDetail ? formatPrice(selectedDetail.price) : '—'}
                                            </span>
                                        </p>
                                        <p style={{ color: '#fff' }}>{selectedProduct.description}</p>

                                        <div className="row mt-4">
                                            <div className="col-md-12">
                                                <div className="form-group">
                                                    <label style={{ color: '#c49b63' }}>Size:</label>
                                                    <div className="d-flex flex-wrap" role="radiogroup" aria-label="Size options">
                                                        {selectedProduct.productDetails?.map(detail => {
                                                            const isActive = selectedDetailId === detail.pdId;
                                                            return (
                                                                <button
                                                                    key={detail.pdId}
                                                                    type="button"
                                                                    onClick={() => setSelectedDetailId(detail.pdId)}
                                                                    aria-pressed={isActive}
                                                                    className="btn btn-outline-secondary mr-2 mb-2"
                                                                    style={{
                                                                        backgroundColor: isActive ? '#c49b63' : 'rgba(21, 17, 17, 0.8)',
                                                                        color: isActive ? '#151111' : '#fff',
                                                                        border: '1px solid #c49b63'
                                                                    }}
                                                                >
                                                                    {detail.size?.name} - {formatPrice(detail.price)}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-md-12">
                                                <label style={{ color: '#c49b63' }}>Quantity:</label>
                                                <div className="input-group d-flex mb-3">
                                                    <span className="input-group-btn mr-2">
                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-secondary"
                                                            onClick={dec}
                                                            style={{
                                                                backgroundColor: 'rgba(21, 17, 17, 0.8)',
                                                                color: '#c49b63',
                                                                border: '1px solid #c49b63'
                                                            }}
                                                        >
                                                            <i className="icon-minus"></i>
                                                        </button>
                                                    </span>
                                                    <input
                                                        type="text"
                                                        readOnly
                                                        className="form-control text-center"
                                                        value={quantity}
                                                        style={{
                                                            backgroundColor: 'rgba(21, 17, 17, 0.8)',
                                                            color: '#fff',
                                                            border: '1px solid #c49b63'
                                                        }}
                                                    />
                                                    <span className="input-group-btn ml-2">
                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-secondary"
                                                            onClick={inc}
                                                            style={{
                                                                backgroundColor: 'rgba(21, 17, 17, 0.8)',
                                                                color: '#c49b63',
                                                                border: '1px solid #c49b63'
                                                            }}
                                                        >
                                                            <i className="icon-plus"></i>
                                                        </button>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer" style={{
                                background: 'rgba(21, 17, 17, 0.8)',
                                borderTop: '1px solid #c49b63'
                            }}>

                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleAddToCart}
                                    style={{
                                        backgroundColor: '#c49b63',
                                        color: '#151111',
                                        border: '1px solid #c49b63'
                                    }}
                                >
                                    Add to Cart
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default MenuPage;
