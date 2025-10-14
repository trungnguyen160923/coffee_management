import React, { useState, useEffect } from 'react';

const MomoPaymentPage = ({
    orderInfo,
    onPaymentSuccess,
    onPaymentFailure,
    onGoBack
}) => {
    const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentStep, setPaymentStep] = useState('qr'); // 'qr', 'processing', 'success', 'failed'

    // Countdown timer
    useEffect(() => {
        if (timeLeft > 0 && paymentStep === 'qr') {
            const timer = setTimeout(() => {
                setTimeLeft(timeLeft - 1);
            }, 3000);
            return () => clearTimeout(timer);
        } else if (timeLeft === 0 && paymentStep === 'qr') {
            // Time expired
            setPaymentStep('failed');
        }
    }, [timeLeft, paymentStep]);

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return {
            minutes: minutes.toString().padStart(2, '0'),
            seconds: remainingSeconds.toString().padStart(2, '0')
        };
    };

    const handleSimulatePayment = () => {
        setIsProcessing(true);
        setPaymentStep('processing');

        // Simulate payment processing
        setTimeout(() => {
            setIsProcessing(false);
            // Always successful payment
            setPaymentStep('success');
        }, 3000);
    };

    // Auto redirect to home after successful payment
    useEffect(() => {
        if (paymentStep === 'success') {
            const redirectTimer = setTimeout(() => {
                onPaymentSuccess();
            }, 3000); // Show success message for 3 seconds then redirect

            return () => clearTimeout(redirectTimer);
        }
    }, [paymentStep, onPaymentSuccess]);

    const handleRetry = () => {
        setPaymentStep('qr');
        setTimeLeft(600);
        setIsProcessing(false);
    };

    const renderQRPayment = () => (
        <div className="momo-payment-container">
            <div className="momo-header">
                <div className="momo-logo">
                    <div className="logo-circle">
                        <span className="logo-text">mo</span>
                        <span className="logo-text">mo</span>
                    </div>
                </div>
                <span className="gateway-text">MoMo Payment Gateway</span>
            </div>

            <div className="payment-content">
                <div className="order-info-section">
                    <div className="order-info-card">
                        <h3 className="order-title">Order Information</h3>

                        <div className="provider-info">
                            <span className="label">Provider</span>
                            <div className="provider-logo">
                                <span className="sale-logo">$</span>
                                <span className="sale-text">SaleMall</span>
                            </div>
                        </div>

                        <div className="order-details">
                            <div className="detail-row">
                                <span className="label">Order ID</span>
                                <span className="value">{orderInfo.orderId || '20230407100903'}</span>
                            </div>
                            <div className="detail-row">
                                <span className="label">Description</span>
                                <span className="value">Payment: {orderInfo.description || 'Coffee Order'}</span>
                            </div>
                            <div className="detail-row">
                                <span className="label">Amount</span>
                                <span className="value amount">{orderInfo.totalAmount?.toLocaleString('vi-VN')}₫</span>
                            </div>
                        </div>

                        <div className="expiry-section">
                            <span className="expiry-label">Order will expire in:</span>
                            <div className="time-boxes">
                                <div className="time-box">
                                    <span className="time-number">{formatTime(timeLeft).minutes}</span>
                                    <span className="time-label">Minutes</span>
                                </div>
                                <div className="time-box">
                                    <span className="time-number">{formatTime(timeLeft).seconds}</span>
                                    <span className="time-label">Seconds</span>
                                </div>
                            </div>
                        </div>

                        <button className="go-back-btn" onClick={onGoBack}>
                            Go Back
                        </button>
                    </div>
                </div>

                <div className="qr-section">
                    <h3 className="qr-title">Scan QR Code to Pay</h3>

                    <div className="qr-container">
                        <div className="qr-frame">
                            <div className="qr-code">
                                <img
                                    src="/images/momo.png"
                                    alt="MoMo QR Code"
                                    className="qr-image"
                                />
                            </div>
                        </div>
                    </div>

                    <p className="qr-instruction">
                        Use MoMo App or camera app that supports QR code to scan
                    </p>

                    <div className="help-section">
                        <span className="help-text">
                            Having trouble with payment?
                            <a href="#" className="help-link">View Guide</a>
                        </span>
                    </div>

                    <div className="demo-payment">
                        <button className="demo-pay-btn" onClick={handleSimulatePayment}>
                            <i className="fa fa-mobile"></i>
                            Demo Payment
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderProcessing = () => (
        <div className="momo-payment-container">
            <div className="momo-header">
                <div className="momo-logo">
                    <div className="logo-circle">
                        <span className="logo-text">mo</span>
                        <span className="logo-text">mo</span>
                    </div>
                </div>
                <span className="gateway-text">MoMo Payment Gateway</span>
            </div>

            <div className="processing-content">
                <div className="processing-animation">
                    <div className="spinner"></div>
                </div>
                <h3 className="processing-title">Processing Payment...</h3>
                <p className="processing-text">Please wait a moment</p>
            </div>
        </div>
    );

    const renderSuccess = () => (
        <div className="momo-payment-container">
            <div className="momo-header">
                <div className="momo-logo">
                    <div className="logo-circle">
                        <span className="logo-text">mo</span>
                        <span className="logo-text">mo</span>
                    </div>
                </div>
                <span className="gateway-text">MoMo Payment Gateway</span>
            </div>

            <div className="success-content">
                <div className="success-icon">
                    <div className="checkmark">✓</div>
                </div>
                <h3 className="success-title">Payment Successful</h3>

                <div className="payment-details">
                    <div className="provider-name">SaleMall</div>
                    <div className="amount">{orderInfo.totalAmount?.toLocaleString('vi-VN')}₫</div>
                </div>

                <div className="redirect-info">
                    <div className="redirect-spinner"></div>
                    <p className="redirect-text">Redirecting to home page in a few seconds...</p>
                </div>

                <button className="go-back-btn" onClick={onGoBack}>
                    Go Back
                </button>
            </div>
        </div>
    );

    const renderFailed = () => (
        <div className="momo-payment-container">
            <div className="momo-header">
                <div className="momo-logo">
                    <div className="logo-circle">
                        <span className="logo-text">mo</span>
                        <span className="logo-text">mo</span>
                    </div>
                </div>
                <span className="gateway-text">MoMo Payment Gateway</span>
            </div>

            <div className="failed-content">
                <div className="failed-icon">
                    <div className="crossmark">✗</div>
                </div>
                <h3 className="failed-title">Payment Failed</h3>
                <p className="failed-text">An error occurred during payment processing</p>

                <div className="failed-actions">
                    <button className="retry-btn" onClick={handleRetry}>
                        Try Again
                    </button>
                    <button className="go-back-btn" onClick={onGoBack}>
                        Go Back
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <>
            <style>{`
                .momo-payment-container {
                    min-height: 100vh;
                    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                }

                .momo-header {
                    display: flex;
                    align-items: center;
                    padding: 20px;
                    background: white;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }

                .momo-logo {
                    display: flex;
                    align-items: center;
                    margin-right: 15px;
                }

                .logo-circle {
                    width: 40px;
                    height: 40px;
                    background: linear-gradient(135deg, #d63384, #e91e63);
                    border-radius: 8px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: bold;
                    font-size: 10px;
                    line-height: 1;
                }

                .logo-text {
                    display: block;
                }

                .gateway-text {
                    color: #495057;
                    font-size: 18px;
                    font-weight: 600;
                }

                .payment-content {
                    display: flex;
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 40px 20px;
                    gap: 40px;
                }

                .order-info-section {
                    flex: 1;
                    max-width: 400px;
                }

                .order-info-card {
                    background: white;
                    border-radius: 12px;
                    padding: 30px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    border: 1px solid #e9ecef;
                }

                .order-title {
                    color: #212529;
                    font-size: 22px;
                    font-weight: 700;
                    margin-bottom: 25px;
                }

                .provider-info {
                    margin-bottom: 20px;
                }

                .label {
                    display: block;
                    color: #495057;
                    font-size: 16px;
                    font-weight: 500;
                    margin-bottom: 8px;
                }

                .provider-logo {
                    display: flex;
                    align-items: center;
                }

                .sale-logo {
                    background: #dc3545;
                    color: white;
                    width: 24px;
                    height: 24px;
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    margin-right: 8px;
                }

                .sale-text {
                    color: #212529;
                    font-weight: 500;
                }

                .order-details {
                    margin-bottom: 25px;
                }

                .detail-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 12px;
                }

                .value {
                    color: #212529;
                    font-weight: 600;
                    font-size: 16px;
                }

                .amount {
                    color: #d63384;
                    font-weight: 700;
                    font-size: 20px;
                }

                .expiry-section {
                    text-align: center;
                    margin-bottom: 25px;
                }

                .expiry-label {
                    display: block;
                    color: #495057;
                    font-size: 16px;
                    font-weight: 500;
                    margin-bottom: 15px;
                }

                .time-boxes {
                    display: flex;
                    gap: 10px;
                    justify-content: center;
                }

                .time-box {
                    background: #d63384;
                    color: white;
                    padding: 12px 16px;
                    border-radius: 8px;
                    text-align: center;
                    min-width: 60px;
                }

                .time-number {
                    display: block;
                    font-size: 24px;
                    font-weight: bold;
                    line-height: 1;
                }

                .time-label {
                    display: block;
                    font-size: 14px;
                    font-weight: 500;
                    margin-top: 4px;
                }

                .go-back-btn {
                    background: #d63384;
                    color: white;
                    border: none;
                    padding: 14px 24px;
                    border-radius: 6px;
                    font-weight: 600;
                    font-size: 16px;
                    cursor: pointer;
                    width: 100%;
                    transition: background 0.3s;
                }

                .go-back-btn:hover {
                    background: #b02a5b;
                }

                .qr-section {
                    flex: 1;
                    background: linear-gradient(135deg, #d63384, #e91e63);
                    border-radius: 12px;
                    padding: 40px;
                    color: white;
                    position: relative;
                    overflow: hidden;
                }

                .qr-section::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="dots" patternUnits="userSpaceOnUse" width="20" height="20"><circle cx="10" cy="10" r="1" fill="rgba(255,255,255,0.1)"/></pattern></defs><rect width="100" height="100" fill="url(%23dots)"/></svg>');
                    opacity: 0.3;
                }

                .qr-title {
                    font-size: 26px;
                    font-weight: 700;
                    margin-bottom: 30px;
                    position: relative;
                    z-index: 1;
                }

                .qr-container {
                    display: flex;
                    justify-content: center;
                    margin-bottom: 30px;
                    position: relative;
                    z-index: 1;
                }

                .qr-frame {
                    background: white;
                    padding: 20px;
                    border-radius: 12px;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
                }

                .qr-code {
                    width: 200px;
                    height: 200px;
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .qr-image {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                    border-radius: 4px;
                }

                .qr-instruction {
                    text-align: center;
                    margin-bottom: 20px;
                    position: relative;
                    z-index: 1;
                    font-size: 16px;
                    font-weight: 500;
                    line-height: 1.5;
                }

                .help-section {
                    text-align: center;
                    margin-bottom: 30px;
                    position: relative;
                    z-index: 1;
                }

                .help-text {
                    color: rgba(255,255,255,0.95);
                    font-size: 16px;
                    font-weight: 500;
                }

                .help-link {
                    color: white;
                    text-decoration: underline;
                    font-weight: 600;
                }

                .demo-payment {
                    position: relative;
                    z-index: 1;
                }

                .demo-pay-btn {
                    background: rgba(255,255,255,0.2);
                    color: white;
                    border: 2px solid rgba(255,255,255,0.3);
                    padding: 16px 30px;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 16px;
                    cursor: pointer;
                    width: 100%;
                    transition: all 0.3s;
                }

                .demo-pay-btn:hover {
                    background: rgba(255,255,255,0.3);
                    border-color: rgba(255,255,255,0.5);
                }

                .processing-content, .success-content, .failed-content {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 60vh;
                    text-align: center;
                }

                .processing-animation {
                    margin-bottom: 30px;
                }

                .spinner {
                    width: 60px;
                    height: 60px;
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #d63384;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                .processing-title, .success-title, .failed-title {
                    color: #212529;
                    font-size: 26px;
                    font-weight: 700;
                    margin-bottom: 15px;
                }

                .processing-text {
                    color: #495057;
                    font-size: 18px;
                    font-weight: 500;
                }

                .success-icon {
                    margin-bottom: 30px;
                }

                .checkmark {
                    width: 80px;
                    height: 80px;
                    background: #28a745;
                    color: white;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 40px;
                    font-weight: bold;
                }

                .payment-details {
                    background: white;
                    border: 2px dashed #d63384;
                    border-radius: 8px;
                    padding: 20px;
                    margin-bottom: 30px;
                    min-width: 200px;
                }

                .provider-name {
                    color: #495057;
                    font-size: 16px;
                    font-weight: 500;
                    margin-bottom: 8px;
                }

                .amount {
                    color: #212529;
                    font-size: 26px;
                    font-weight: 700;
                }

                .redirect-info {
                    margin-bottom: 30px;
                }

                .redirect-spinner {
                    width: 20px;
                    height: 20px;
                    border: 2px solid #f3f3f3;
                    border-top: 2px solid #d63384;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 15px;
                }

                .redirect-text {
                    color: #495057;
                    font-size: 16px;
                    font-weight: 500;
                }

                .failed-icon {
                    margin-bottom: 30px;
                }

                .crossmark {
                    width: 80px;
                    height: 80px;
                    background: #dc3545;
                    color: white;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 40px;
                    font-weight: bold;
                }

                .failed-text {
                    color: #495057;
                    font-size: 18px;
                    font-weight: 500;
                    margin-bottom: 30px;
                }

                .failed-actions {
                    display: flex;
                    gap: 15px;
                }

                .retry-btn {
                    background: #d63384;
                    color: white;
                    border: none;
                    padding: 14px 24px;
                    border-radius: 6px;
                    font-weight: 600;
                    font-size: 16px;
                    cursor: pointer;
                    transition: background 0.3s;
                }

                .retry-btn:hover {
                    background: #b02a5b;
                }

                @media (max-width: 768px) {
                    .payment-content {
                        flex-direction: column;
                        padding: 20px;
                    }
                    
                    .qr-section {
                        padding: 30px 20px;
                    }
                }
            `}</style>

            {paymentStep === 'qr' && renderQRPayment()}
            {paymentStep === 'processing' && renderProcessing()}
            {paymentStep === 'success' && renderSuccess()}
            {paymentStep === 'failed' && renderFailed()}
        </>
    );
};

export default MomoPaymentPage;

