// frontend/lib/utils/errorUtils.ts

/**
 * Extract error message from various error types
 * @param error Error object from catch block
 * @returns Formatted error message string
 */
export const getErrorMessage = (error: any): string => {
  if (!error) {
    return 'An unknown error occurred';
  }

  // Handle Axios errors
  if (error.response) {
    // Server responded with a status code that falls out of the range of 2xx
    if (error.response.data && error.response.data.detail) {
      return error.response.data.detail;
    }
    if (error.response.data && typeof error.response.data === 'string') {
      return error.response.data;
    }
    return `Server error: ${error.response.status}`;
  } 
  
  if (error.request) {
    // The request was made but no response was received
    return 'No response from server. Please check your connection.';
  }
  
  // Handle standard Error objects
  if (error.message) {
    return error.message;
  }
  
  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }
  
  // Default error message
  return 'An error occurred. Please try again.';
};

/**
 * Check if an API error is a validation error
 * @param error Error object from catch block
 * @returns Boolean indicating if error is validation error
 */
export const isValidationError = (error: any): boolean => {
  return error?.response?.status === 422 || 
         (error?.response?.data && 'validation_error' in error.response.data);
};

/**
 * Extract validation errors from API response
 * @param error Error object from catch block
 * @returns Object with field names as keys and error messages as values
 */
export const getValidationErrors = (error: any): Record<string, string> => {
  if (!isValidationError(error)) {
    return {};
  }
  
  const validationErrors: Record<string, string> = {};
  
  if (error.response.data && error.response.data.detail) {
    const errors = Array.isArray(error.response.data.detail) 
      ? error.response.data.detail 
      : [error.response.data.detail];
    
    for (const err of errors) {
      if (err.loc && err.loc.length > 1) {
        // Typically loc is ['body', 'fieldname']
        const fieldName = err.loc[1];
        validationErrors[fieldName] = err.msg;
      }
    }
  }
  
  return validationErrors;
};