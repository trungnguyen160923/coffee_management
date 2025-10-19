package orderservice.order_service.exception;

public class ReviewException extends RuntimeException {
    private final String errorCode;
    
    public ReviewException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }
    
    public ReviewException(String errorCode, String message, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
    }
    
    public String getErrorCode() {
        return errorCode;
    }
}
