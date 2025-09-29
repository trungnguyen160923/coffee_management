package orderservice.order_service.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;

@Getter
public enum ErrorCode {
    UNCATEGORIZED_EXCEPTION(9999, "Uncategorized error", HttpStatus.INTERNAL_SERVER_ERROR),
    INVALID_KEY(1001, "Uncategorized error", HttpStatus.BAD_REQUEST),
    EMAIL_EXISTED(1002, "Email existed", HttpStatus.BAD_REQUEST),
    EMAIL_INVALID(1003, "Email must be valid", HttpStatus.BAD_REQUEST),
    INVALID_PASSWORD(1004, "Password must be at least {min} characters", HttpStatus.BAD_REQUEST),
    EMPTY_PASSWORD(1005, "Password is required", HttpStatus.BAD_REQUEST),
    EMPTY_EMAIL(1006, "Email is required", HttpStatus.BAD_REQUEST),
    EMPTY_FULLNAME(1007, "Fullname is required", HttpStatus.BAD_REQUEST),
    EMPTY_PHONE_NUMBER(1008, "Phone number is required", HttpStatus.BAD_REQUEST),
    EMAIL_NOT_EXISTED(1007, "Email not existed", HttpStatus.NOT_FOUND),
    UNAUTHENTICATED(1008, "Unauthenticated", HttpStatus.UNAUTHORIZED),
    UNAUTHORIZED(1007, "You do not have permission", HttpStatus.FORBIDDEN),
    INVALID_DOB(1009, "Your age must be at least {min}", HttpStatus.BAD_REQUEST),
    EMPTY_TOKEN(1010, "Token is required", HttpStatus.BAD_REQUEST),
    ROLE_NOT_FOUND(1011, "Role not found", HttpStatus.NOT_FOUND),
    INVALID_ROLE(1012, "Invalid role", HttpStatus.BAD_REQUEST),
    INVALID_PHONE_NUMBER(1013, "Phone number must be valid", HttpStatus.BAD_REQUEST),
    PHONE_NUMBER_SIZE(1014, "Phone number must be at least {min} characters", HttpStatus.BAD_REQUEST),
    ACCESS_DENIED(1015, "Access denied", HttpStatus.FORBIDDEN),
    EMPTY_LABEL(1016, "Label is required", HttpStatus.BAD_REQUEST),
    INVALID_LABEL(1017, "Label must be at most {max} characters", HttpStatus.BAD_REQUEST),
    EMPTY_FULL_ADDRESS(1018, "Full address is required", HttpStatus.BAD_REQUEST),
    INVALID_FULL_ADDRESS(1019, "Full address must be at most {max} characters", HttpStatus.BAD_REQUEST),
    LABEL_EXISTED(1020, "Label existed", HttpStatus.BAD_REQUEST),
    EMPTY_USER_ID(1021, "User id is required", HttpStatus.BAD_REQUEST),
    EMPTY_DOB(1022, "Dob is required", HttpStatus.BAD_REQUEST),
    USER_ID_EXISTED(1023, "User id existed", HttpStatus.BAD_REQUEST),
    EMPTY_BRANCH_ID(1024, "Branch id is required", HttpStatus.BAD_REQUEST),
    EMPTY_IDENTITY_CARD(1025, "Identity card is required", HttpStatus.BAD_REQUEST),
    EMPTY_POSITION(1026, "Position is required", HttpStatus.BAD_REQUEST),
    EMPTY_HIRE_DATE(1027, "Hire date is required", HttpStatus.BAD_REQUEST),
    EMPTY_SALARY(1028, "Salary is required", HttpStatus.BAD_REQUEST),
    BRANCH_NOT_FOUND(1029, "Branch not found", HttpStatus.NOT_FOUND),
    BRANCH_NAME_EXISTS(1030, "Branch name already exists", HttpStatus.BAD_REQUEST),
    INVALID_BUSINESS_HOURS(1031, "Open hours must be before end hours", HttpStatus.BAD_REQUEST),
    RESERVATION_NOT_FOUND(1032, "Reservation not found", HttpStatus.NOT_FOUND),
    EMPTY_RESERVATION_TIME(1033, "Reservation time is required", HttpStatus.BAD_REQUEST),
    INVALID_PARTY_SIZE(1034, "Party size must be between 1 and 20", HttpStatus.BAD_REQUEST),
    INVALID_CUSTOMER_INFO(1035, "Customer information is invalid", HttpStatus.BAD_REQUEST),
    RESERVATION_TIME_TOO_EARLY(1036, "Reservation must be at least 1 hour in advance", HttpStatus.BAD_REQUEST),
    RESERVATION_TIME_TOO_LATE(1037, "Reservation cannot be more than 30 days in advance", HttpStatus.BAD_REQUEST),
    RESERVATION_CANNOT_BE_CANCELLED(1038, "Reservation cannot be cancelled", HttpStatus.BAD_REQUEST),
    VALIDATION_FAILED(4000, "Validation failed", HttpStatus.BAD_REQUEST),
    ;

    ErrorCode(int code, String message, HttpStatusCode statusCode) {
        this.code = code;
        this.message = message;
        this.statusCode = statusCode;
    }

    private final int code;
    private final String message;
    private final HttpStatusCode statusCode;

    public HttpStatus getHttpStatus() {
        return (HttpStatus) statusCode;
    }
}
