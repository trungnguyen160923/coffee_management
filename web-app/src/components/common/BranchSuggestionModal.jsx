import React from 'react';

const BranchSuggestionModal = ({ 
    isOpen, 
    onClose, 
    onSelectBranch, 
    availableBranches, 
    originalBranch,
    cartItems 
}) => {
    if (!isOpen) return null;

    const handleSelectBranch = (branch) => {
        onSelectBranch(branch);
        onClose();
    };

    const calculateDistance = (branch) => {
        // Giả sử branch có distance field
        return branch.distance ? `${branch.distance.toFixed(1)} km` : 'N/A';
    };

    return (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
            <div className="modal-dialog modal-lg">
                <div className="modal-content" style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}>
                    <div className="modal-header border-secondary">
                        <h5 className="modal-title">
                            <i className="fa fa-map-marker-alt me-2" style={{ color: '#C39C5E' }}></i>
                            Chi nhánh gần nhất có hàng
                        </h5>
                        <button 
                            type="button" 
                            className="btn-close btn-close-white" 
                            onClick={onClose}
                        ></button>
                    </div>
                    
                    <div className="modal-body">
                        <div className="alert alert-warning">
                            <i className="fa fa-exclamation-triangle me-2"></i>
                            <strong>Chi nhánh gần nhất đã hết hàng!</strong>
                            <br />
                            Chúng tôi đã tìm thấy {availableBranches.length} chi nhánh khác có đủ hàng cho đơn của bạn.
                        </div>

                        <div className="mb-3">
                            <h6 className="text-primary">Chi nhánh gần nhất (đã hết hàng):</h6>
                            <div className="card bg-dark border-secondary">
                                <div className="card-body">
                                    <h6 className="card-title text-muted">{originalBranch.name}</h6>
                                    <p className="card-text text-muted">{originalBranch.address}</p>
                                    <span className="badge bg-danger">Hết hàng</span>
                                </div>
                            </div>
                        </div>

                        <div className="mb-3">
                            <h6 className="text-success">Chi nhánh có hàng:</h6>
                            <div className="row">
                                {availableBranches.map((item, index) => (
                                    <div key={index} className="col-md-6 mb-3">
                                        <div className="card bg-dark border-success">
                                            <div className="card-body">
                                                <div className="d-flex justify-content-between align-items-start mb-2">
                                                    <h6 className="card-title text-success">{item.branch.name}</h6>
                                                    <span className="badge bg-success">Có hàng</span>
                                                </div>
                                                <p className="card-text text-muted small">{item.branch.address}</p>
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <small className="text-muted">
                                                        <i className="fa fa-map-marker-alt me-1"></i>
                                                        {calculateDistance(item.branch)}
                                                    </small>
                                                    <button 
                                                        className="btn btn-success btn-sm"
                                                        onClick={() => handleSelectBranch(item.branch)}
                                                    >
                                                        <i className="fa fa-check me-1"></i>
                                                        Chọn chi nhánh này
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="alert alert-info">
                            <i className="fa fa-info-circle me-2"></i>
                            <strong>Lưu ý:</strong> Thời gian giao hàng có thể thay đổi tùy theo khoảng cách đến chi nhánh mới.
                        </div>
                    </div>
                    
                    <div className="modal-footer border-secondary">
                        <button 
                            type="button" 
                            className="btn btn-secondary" 
                            onClick={onClose}
                        >
                            <i className="fa fa-times me-1"></i>
                            Hủy đơn hàng
                        </button>
                        <button 
                            type="button" 
                            className="btn btn-primary"
                            onClick={() => handleSelectBranch(availableBranches[0].branch)}
                        >
                            <i className="fa fa-shopping-cart me-1"></i>
                            Chọn chi nhánh gần nhất
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BranchSuggestionModal;
