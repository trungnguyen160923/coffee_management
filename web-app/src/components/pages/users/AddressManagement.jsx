import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { addressService } from '../../../services/addressService';
import axios from 'axios';

const AddressManagement = () => {
    const [addresses, setAddresses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingAddress, setEditingAddress] = useState(null);
    const [formData, setFormData] = useState({
        label: '',
        fullAddress: '',
        province: '',
        provinceCode: '',
        district: '',
        districtCode: '',
        ward: '',
        wardCode: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [provinces, setProvinces] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [wards, setWards] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        // Check authentication
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/auth/login');
            return;
        }

        // Add a timeout to prevent infinite loading
        const timeoutId = setTimeout(() => {
            if (loading) {
                console.log('API timeout, showing empty state');
                setLoading(false);
                // Only show error if no addresses were loaded
                if (addresses.length === 0) {
                    setError('Unable to connect to server. Please try again later.');
                }
            }
        }, 10000); // 10 second timeout

        loadAddresses();
        fetchProvinces();

        return () => clearTimeout(timeoutId);
    }, [navigate]);

    const loadAddresses = async () => {
        try {
            setLoading(true);
            setError(''); // Clear previous errors
            console.log('Loading addresses...');
            const data = await addressService.getCustomerAddresses();
            console.log('Addresses loaded:', data);
            setAddresses(data);
        } catch (error) {
            console.error('Error loading addresses:', error);
            setError('Unable to connect to server. Please check if Profile Service is running.');
        } finally {
            setLoading(false);
        }
    };

    const fetchProvinces = async () => {
        try {
            const response = await axios.get('http://localhost:8000/api/provinces/p');
            setProvinces(response.data);
        } catch (error) {
            console.error('Error fetching provinces:', error);
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

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleProvinceChange = (e) => {
        const selectedOption = e.target.options[e.target.selectedIndex];
        const provinceCode = selectedOption.value;
        const provinceName = selectedOption.text;

        setFormData((prev) => {
            const newData = {
                ...prev,
                province: provinceName,
                provinceCode: provinceCode,
                district: '',
                districtCode: '',
                ward: '',
                wardCode: ''
            };

            // Auto-generate full address
            const fullAddress = [
                newData.ward,
                newData.district,
                newData.province
            ].filter(a => a && a.trim()).join(', ');

            return {
                ...newData,
                fullAddress: fullAddress
            };
        });

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

        setFormData((prev) => {
            const newData = {
                ...prev,
                district: districtName,
                districtCode: districtCode,
                ward: '',
                wardCode: ''
            };

            // Auto-generate full address
            const fullAddress = [
                newData.ward,
                newData.district,
                newData.province
            ].filter(a => a && a.trim()).join(', ');

            return {
                ...newData,
                fullAddress: fullAddress
            };
        });

        setWards([]);

        if (districtCode) {
            fetchWards(districtCode);
        }
    };

    const handleWardChange = (e) => {
        const selectedOption = e.target.options[e.target.selectedIndex];
        const wardCode = selectedOption.value;
        const wardName = selectedOption.text;

        setFormData((prev) => {
            const newData = {
                ...prev,
                ward: wardName,
                wardCode: wardCode
            };

            // Auto-generate full address
            const fullAddress = [
                newData.ward,
                newData.district,
                newData.province
            ].filter(a => a && a.trim()).join(', ');

            return {
                ...newData,
                fullAddress: fullAddress
            };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        setError('');
        setSuccess('');

        // Build full address from selected location
        const fullAddress = [
            formData.ward,
            formData.district,
            formData.province
        ].filter(a => a && a.trim()).join(', ');

        // Update formData with built address
        const updatedFormData = {
            ...formData,
            fullAddress: fullAddress
        };

        try {
            if (editingAddress) {
                // Update existing address
                await addressService.updateAddress(editingAddress.addressId, updatedFormData);
                setSuccess('Address updated successfully!');
            } else {
                // Create new address
                await addressService.createAddress(updatedFormData);
                setSuccess('Address created successfully!');
            }

            setShowModal(false);
            setEditingAddress(null);
            setFormData({
                label: '',
                fullAddress: '',
                province: '',
                provinceCode: '',
                district: '',
                districtCode: '',
                ward: '',
                wardCode: ''
            });
            loadAddresses();
        } catch (error) {
            console.error('Error saving address:', error);
            setError('Error occurred while saving address');
        }

        return false;
    };

    const handleEdit = (address) => {
        setEditingAddress(address);
        setFormData({
            label: address.label,
            fullAddress: address.fullAddress
        });
        setShowModal(true);
    };

    const handleDelete = async (addressId) => {
        if (window.confirm('Are you sure you want to delete this address?')) {
            try {
                await addressService.deleteAddress(addressId);
                setSuccess('Address deleted successfully!');
                loadAddresses();
            } catch (error) {
                console.error('Error deleting address:', error);
                setError('Error occurred while deleting address');
            }
        }
    };

    const handleAddNew = () => {
        setEditingAddress(null);
        setFormData({
            label: '',
            fullAddress: '',
            province: '',
            provinceCode: '',
            district: '',
            districtCode: '',
            ward: '',
            wardCode: ''
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingAddress(null);
        setFormData({
            label: '',
            fullAddress: '',
            province: '',
            provinceCode: '',
            district: '',
            districtCode: '',
            ward: '',
            wardCode: ''
        });
        setError('');
        setSuccess('');
    };

    const columns = [
        {
            header: 'Address ID',
            key: 'addressId'
        },
        {
            header: 'Label',
            key: 'label'
        },
        {
            header: 'Full Address',
            key: 'fullAddress',
            render: (address) => (
                <div style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {address.fullAddress}
                </div>
            )
        },
        {
            header: 'Actions',
            key: 'actions',
            render: (address) => (
                <div className="btn-group" role="group">
                    <button
                        className="btn btn-sm btn-outline-warning"
                        onClick={() => handleEdit(address)}
                        title="Edit"
                        style={{ marginRight: '5px' }}
                    >
                        <i className="icon-edit"></i> Edit
                    </button>
                    <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDelete(address.addressId)}
                        title="Delete"
                    >
                        <i className="icon-trash"></i> Delete
                    </button>
                </div>
            )
        }
    ];

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
                <div className="spinner-border" role="status">
                    <span className="sr-only">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <>
            <style>{`
                .modal input::placeholder,
                .modal textarea::placeholder {
                    color: #999 !important;
                    opacity: 1 !important;
                }
                .modal input:focus,
                .modal textarea:focus,
                .modal select:focus {
                    border-color: #c49b63 !important;
                    box-shadow: 0 0 0 0.2rem rgba(196, 155, 99, 0.25) !important;
                }
                .modal .select-wrap {
                    position: relative;
                }
                .modal .select-wrap .icon {
                    position: absolute;
                    right: 10px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #999;
                    pointer-events: none;
                }
                .modal .select-wrap select {
                    appearance: none;
                    -webkit-appearance: none;
                    -moz-appearance: none;
                    padding-right: 40px;
                }
                .modal select {
                    background-color: #3c3c3c !important;
                    color: #ffffff !important;
                    border: 1px solid #555 !important;
                }
                .modal select option {
                    background-color: #2c2c2c !important;
                    color: #ffffff !important;
                    padding: 8px 12px !important;
                }
                .modal select option:hover {
                    background-color: #c49b63 !important;
                    color: #ffffff !important;
                }
                .modal select option:checked {
                    background-color: #c49b63 !important;
                    color: #ffffff !important;
                }
                .modal select:disabled {
                    background-color: #2a2a2a !important;
                    color: #666 !important;
                    cursor: not-allowed !important;
                }
                .modal select option:disabled {
                    background-color: #2a2a2a !important;
                    color: #666 !important;
                }
                /* For webkit browsers */
                .modal select::-webkit-scrollbar {
                    width: 8px;
                }
                .modal select::-webkit-scrollbar-track {
                    background: #2c2c2c;
                }
                .modal select::-webkit-scrollbar-thumb {
                    background: #555;
                    border-radius: 4px;
                }
                .modal select::-webkit-scrollbar-thumb:hover {
                    background: #777;
                }
            `}</style>
            {/* Hero Section */}
            <section className="home-slider owl-carousel">
                <div className="slider-item" style={{ backgroundImage: 'url(/images/bg_1.jpg)' }} data-stellar-background-ratio="0.5">
                    <div className="overlay"></div>
                    <div className="container">
                        <div className="row slider-text justify-content-center align-items-center">
                            <div className="col-md-7 col-sm-12 text-center ftco-animate">
                                <h1 className="mb-3 mt-5 bread">Address Management</h1>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Address Table Section */}
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
                                <div className="d-flex justify-content-between align-items-center mb-4">
                                    <h3 style={{ color: 'white', fontSize: '1.9rem', margin: 0 }}>My Addresses</h3>
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleAddNew}
                                        style={{
                                            backgroundColor: '#c49b63',
                                            borderColor: '#c49b63',
                                            color: 'white'
                                        }}
                                    >
                                        Add New Address
                                    </button>
                                </div>


                                {/* Alert Messages */}
                                {error && (
                                    <div className="alert alert-warning" role="alert" style={{ marginBottom: '20px' }}>
                                        <strong>Demo Mode:</strong> {error}
                                        <br />
                                        <small>Showing demo data. To use full functionality, please start Profile Service.</small>
                                    </div>
                                )}
                                {success && (
                                    <div className="alert alert-success" role="alert" style={{ marginBottom: '20px' }}>
                                        {success}
                                    </div>
                                )}

                                {loading ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: 'white' }}>
                                        <div className="spinner-border text-warning" role="status">
                                            <span className="sr-only">Loading...</span>
                                        </div>
                                        <p style={{ marginTop: '15px' }}>Loading addresses...</p>
                                    </div>
                                ) : addresses.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: 'white' }}>
                                        <i className="icon-location" style={{ fontSize: '4rem', color: '#ccc' }}></i>
                                        <h5 className="mt-3">
                                            {error ? 'Unable to load addresses' : 'No addresses found'}
                                        </h5>
                                        <p className="text-muted">
                                            {error ? 'Please check your network connection and try again' : 'Add your first address'}
                                        </p>
                                        <button
                                            className="btn btn-primary"
                                            onClick={handleAddNew}
                                            style={{
                                                backgroundColor: '#c49b63',
                                                borderColor: '#c49b63',
                                                color: 'white'
                                            }}
                                        >
                                            Add Address
                                        </button>

                                        {error && (
                                            <button
                                                className="btn btn-outline-primary ml-2"
                                                onClick={loadAddresses}
                                            >
                                                Try Again
                                            </button>
                                        )}
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
                                                {addresses.map((address, index) => (
                                                    <tr key={index} style={{ backgroundColor: 'transparent' }}>
                                                        {columns.map((column, colIndex) => (
                                                            <td key={colIndex} style={{
                                                                color: '#e0e0e0',
                                                                padding: '12px 10px',
                                                                border: 'none',
                                                                textAlign: column.key === 'addressId' ? 'center' : 'left',
                                                                fontSize: '13px'
                                                            }}>
                                                                {column.render ? column.render(address) : address[column.key]}
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

            {/* Modal for Add/Edit Address */}
            {showModal && (
                <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                    <div className="modal-dialog">
                        <div className="modal-content" style={{
                            backgroundColor: '#2c2c2c',
                            color: '#ffffff',
                            border: '1px solid #444'
                        }}>
                            <div className="modal-header" style={{
                                backgroundColor: '#c49b63',
                                color: '#ffffff',
                                borderBottom: '1px solid #444'
                            }}>
                                <h5 className="modal-title" style={{ color: '#ffffff', fontWeight: 'bold' }}>
                                    {editingAddress ? 'Edit Address' : 'Add New Address'}
                                </h5>
                                <button
                                    type="button"
                                    className="close"
                                    onClick={closeModal}
                                    style={{
                                        color: '#ffffff',
                                        opacity: '0.8',
                                        fontSize: '1.5rem',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    <span>&times;</span>
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} noValidate>
                                <div className="modal-body" style={{ backgroundColor: '#2c2c2c' }}>
                                    <div className="form-group">
                                        <label htmlFor="label" style={{ color: '#ffffff', fontWeight: 'bold', marginBottom: '8px' }}>
                                            Address Label *
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            id="label"
                                            name="label"
                                            value={formData.label}
                                            onChange={handleInputChange}
                                            placeholder="e.g., Home, Office..."
                                            required
                                            style={{
                                                backgroundColor: '#3c3c3c',
                                                color: '#ffffff',
                                                border: '1px solid #555',
                                                borderRadius: '4px',
                                                padding: '10px 12px',
                                                fontSize: '14px'
                                            }}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="province" style={{ color: '#ffffff', fontWeight: 'bold', marginBottom: '8px' }}>
                                            Province / City *
                                        </label>
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
                                                required
                                                style={{
                                                    backgroundColor: '#3c3c3c',
                                                    color: '#ffffff',
                                                    border: '1px solid #555',
                                                    borderRadius: '4px',
                                                    padding: '10px 12px',
                                                    fontSize: '14px'
                                                }}
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

                                    <div className="form-group">
                                        <label htmlFor="district" style={{ color: '#ffffff', fontWeight: 'bold', marginBottom: '8px' }}>
                                            District *
                                        </label>
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
                                                required
                                                style={{
                                                    backgroundColor: '#3c3c3c',
                                                    color: '#ffffff',
                                                    border: '1px solid #555',
                                                    borderRadius: '4px',
                                                    padding: '10px 12px',
                                                    fontSize: '14px'
                                                }}
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

                                    <div className="form-group">
                                        <label htmlFor="ward" style={{ color: '#ffffff', fontWeight: 'bold', marginBottom: '8px' }}>
                                            Ward *
                                        </label>
                                        <div className="select-wrap">
                                            <div className="icon">
                                                <span className="ion-ios-arrow-down"></span>
                                            </div>
                                            <select
                                                name="ward"
                                                id="ward"
                                                value={formData.wardCode}
                                                onChange={handleWardChange}
                                                className="form-control"
                                                disabled={!formData.districtCode}
                                                required
                                                style={{
                                                    backgroundColor: '#3c3c3c',
                                                    color: '#ffffff',
                                                    border: '1px solid #555',
                                                    borderRadius: '4px',
                                                    padding: '10px 12px',
                                                    fontSize: '14px'
                                                }}
                                            >
                                                <option value="">Select Ward</option>
                                                {wards.map((ward) => (
                                                    <option key={ward.code} value={ward.code}>
                                                        {ward.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="fullAddress" style={{ color: '#ffffff', fontWeight: 'bold', marginBottom: '8px' }}>
                                            Full Address (Auto-generated)
                                        </label>
                                        <textarea
                                            className="form-control"
                                            id="fullAddress"
                                            name="fullAddress"
                                            rows="3"
                                            value={formData.fullAddress}
                                            readOnly
                                            style={{
                                                backgroundColor: '#2a2a2a',
                                                color: '#cccccc',
                                                border: '1px solid #555',
                                                borderRadius: '4px',
                                                padding: '10px 12px',
                                                fontSize: '14px',
                                                resize: 'vertical'
                                            }}
                                        ></textarea>
                                    </div>
                                </div>
                                <div className="modal-footer" style={{
                                    backgroundColor: '#2c2c2c',
                                    borderTop: '1px solid #444'
                                }}>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={closeModal}
                                        style={{
                                            backgroundColor: '#6c757d',
                                            borderColor: '#6c757d',
                                            color: '#ffffff',
                                            padding: '8px 20px',
                                            borderRadius: '4px',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        style={{
                                            backgroundColor: '#c49b63',
                                            borderColor: '#c49b63',
                                            color: '#ffffff',
                                            padding: '8px 20px',
                                            borderRadius: '4px',
                                            fontWeight: 'bold'
                                        }}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handleSubmit(e);
                                        }}
                                    >
                                        {editingAddress ? 'Update' : 'Add'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Backdrop */}
            {showModal && <div className="modal-backdrop fade show"></div>}
        </>
    );
};

export default AddressManagement;