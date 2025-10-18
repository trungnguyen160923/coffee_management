import React, { useState } from 'react';

const BranchSettings = ({ 
    maxBranches, 
    onMaxBranchesChange, 
    isVisible, 
    onToggle 
}) => {
    const [tempValue, setTempValue] = useState(maxBranches);

    const handleSave = () => {
        const value = Math.max(1, Math.min(20, parseInt(tempValue) || 5));
        onMaxBranchesChange(value);
        onToggle();
    };

    const handleCancel = () => {
        setTempValue(maxBranches);
        onToggle();
    };

    if (!isVisible) return null;

    return (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
            <div className="modal-dialog">
                <div className="modal-content" style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}>
                    <div className="modal-header border-secondary">
                        <h5 className="modal-title">
                            <i className="fa fa-cog me-2" style={{ color: '#C39C5E' }}></i>
                            Cài đặt tìm kiếm chi nhánh
                        </h5>
                        <button 
                            type="button" 
                            className="btn-close btn-close-white" 
                            onClick={handleCancel}
                        ></button>
                    </div>
                    
                    <div className="modal-body">
                        <div className="mb-3">
                            <label htmlFor="maxBranches" className="form-label">
                                <i className="fa fa-map-marker-alt me-2"></i>
                                Số lượng chi nhánh tối đa để kiểm tra
                            </label>
                            <input
                                type="number"
                                className="form-control bg-dark text-white border-secondary"
                                id="maxBranches"
                                value={tempValue}
                                onChange={(e) => setTempValue(e.target.value)}
                                min="1"
                                max="20"
                                placeholder="Nhập số từ 1-20"
                            />
                            <div className="form-text text-muted">
                                <i className="fa fa-info-circle me-1"></i>
                                Số lượng chi nhánh gần nhất để kiểm tra tồn kho (1-20)
                            </div>
                        </div>

                        <div className="alert alert-info">
                            <i className="fa fa-lightbulb me-2"></i>
                            <strong>Gợi ý:</strong>
                            <ul className="mb-0 mt-2">
                                <li><strong>3-5 chi nhánh:</strong> Nhanh, phù hợp khu vực đông chi nhánh</li>
                                <li><strong>5-10 chi nhánh:</strong> Cân bằng tốt giữa tốc độ và khả năng tìm hàng</li>
                                <li><strong>10-20 chi nhánh:</strong> Tìm hàng tốt nhất, nhưng chậm hơn</li>
                            </ul>
                        </div>
                    </div>
                    
                    <div className="modal-footer border-secondary">
                        <button 
                            type="button" 
                            className="btn btn-secondary" 
                            onClick={handleCancel}
                        >
                            <i className="fa fa-times me-1"></i>
                            Hủy
                        </button>
                        <button 
                            type="button" 
                            className="btn btn-primary"
                            onClick={handleSave}
                        >
                            <i className="fa fa-save me-1"></i>
                            Lưu cài đặt
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BranchSettings;
