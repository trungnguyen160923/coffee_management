// Error message mapping từ backend error codes
export const ERROR_MESSAGES: Record<string, string> = {
  // Authentication errors
  'UNAUTHENTICATED': 'Incorrect email or password',
  'EMAIL_NOT_EXISTED': 'Account does not exist',
  'UNAUTHORIZED': 'You do not have permission to access',
  'ACCESS_DENIED': 'Access denied',
  'INVALID_ROLE': 'Your account does not have permission to access the management system',
  
  // Validation errors
  'EMPTY_EMAIL': 'Email cannot be empty',
  'EMAIL_INVALID': 'Invalid email format',
  'EMPTY_PASSWORD': 'Password cannot be empty',
  'INVALID_PASSWORD': 'Password must be at least 6 characters',
  'EMAIL_EXISTED': 'Email already exists',
  
  // Token errors
  'EMPTY_TOKEN': 'Token cannot be empty',
  
  // Role errors
  'ROLE_NOT_FOUND': 'Role not found',
  
  // User info errors
  'EMPTY_FULLNAME': 'Full name cannot be empty',
  'EMPTY_PHONE_NUMBER': 'Phone number cannot be empty',
  'INVALID_PHONE_NUMBER': 'Invalid phone number format',
  'PHONE_NUMBER_SIZE': 'Phone number must be at least {min} characters',
  'EMPTY_DOB': 'Date of birth cannot be empty',
  'INVALID_DOB': 'Age must be at least {min} years old',
  'EMPTY_IDENTITY_CARD': 'Identity card cannot be empty',
  
  // Employee errors
  'EMPTY_BRANCH_ID': 'Branch cannot be empty',
  'EMPTY_HIRE_DATE': 'Hire date cannot be empty',
  'EMPTY_POSITION': 'Position cannot be empty',
  'EMPTY_SALARY': 'Salary cannot be empty',
  
  // Generic errors
  'UNCATEGORIZED_EXCEPTION': 'Unknown error',
  'INVALID_KEY': 'Invalid key',
};

// Function to get error message from error code
export function getErrorMessage(errorCode: string, fallback?: string): string {
  return ERROR_MESSAGES[errorCode] || fallback || 'An unknown error occurred';
}

// Function to process error from API response
export function processApiError(error: any): string {
  // Check error code from backend
  if (error?.code && ERROR_MESSAGES[error.code]) {
    return ERROR_MESSAGES[error.code];
  }
  
  // Check error message from backend
  if (error?.message) {
    return error.message;
  }
  
  // Check error message from error object
  if (error?.response?.message) {
    return error.response.message;
  }
  
  // Fallback
  return 'An unknown error occurred';
}
