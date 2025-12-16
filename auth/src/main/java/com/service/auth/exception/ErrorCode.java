package com.service.auth.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;

import lombok.Getter;

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
    EMPTY_DOB(1016, "Dob is required", HttpStatus.BAD_REQUEST),
    EMPTY_IDENTITY_CARD(1017, "Identity card is required", HttpStatus.BAD_REQUEST),
    EMPTY_BRANCH_ID(1018, "Branch id is required", HttpStatus.BAD_REQUEST),
    EMPTY_HIRE_DATE(1019, "Hire date is required", HttpStatus.BAD_REQUEST),
    EMPTY_POSITION(1020, "Position is required", HttpStatus.BAD_REQUEST),
    EMPTY_SALARY(1021, "Salary is required", HttpStatus.BAD_REQUEST),
    INCORRECT_PASSWORD(1022, "Incorrect password", HttpStatus.BAD_REQUEST),
    USER_ID_NOT_FOUND(1023, "User id not found", HttpStatus.NOT_FOUND),
    USER_NOT_FOUND(1024, "User not found", HttpStatus.NOT_FOUND),
    EMPTY_EMPLOYMENT_TYPE(1025, "Employment type is required", HttpStatus.BAD_REQUEST),
    EMPTY_PAY_TYPE(1026, "Pay type is required", HttpStatus.BAD_REQUEST),
    EMPTY_OLD_PASSWORD(1027, "Old password is required", HttpStatus.BAD_REQUEST),
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
