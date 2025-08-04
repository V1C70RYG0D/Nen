// React hook for secure input validation with XSS prevention
import { useState, useCallback, useMemo } from 'react';
import {
  sanitizeInput,
  sanitizeFormData,
  detectCSPViolation,
  validateSOLAmount,
  validateUsername,
  validatePublicKey,
  validateEmailEnhanced,
  validateRichText,
  ValidationResult
} from '@/utils/validation';

export interface ValidationError {
  field: string;
  message: string;
  securityWarning?: boolean;
}

export interface SecureValidationConfig {
  sanitizeOnChange?: boolean;
  detectSecurityViolations?: boolean;
  logSecurityViolations?: boolean;
}

export interface ValidationRules {
  [key: string]: {
    required?: boolean;
    type?: 'text' | 'email' | 'number' | 'username' | 'publicKey' | 'amount' | 'richText';
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: any) => ValidationResult | { isValid: boolean; error?: string };
  };
}

/**
 * Secure validation hook with XSS prevention
 */
export const useSecureValidation = (
  initialValues: Record<string, any> = {},
  validationRules: ValidationRules = {},
  config: SecureValidationConfig = {}
) => {
  const {
    sanitizeOnChange = true,
    detectSecurityViolations = true,
    logSecurityViolations = true
  } = config;

  const [values, setValuesState] = useState<Record<string, any>>(
    sanitizeOnChange ? sanitizeFormData(initialValues) : initialValues
  );
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [securityWarnings, setSecurityWarnings] = useState<string[]>([]);

  /**
   * Sanitize and set a single field value
   */
  const setValue = useCallback((field: string, value: any) => {
    const sanitizedValue = sanitizeOnChange && typeof value === 'string'
      ? sanitizeInput(value)
      : value;

    // Detect security violations
    if (detectSecurityViolations && typeof value === 'string' && detectCSPViolation(value)) {
      const warning = `Security violation detected in field: ${field}`;
      setSecurityWarnings(prev => [...prev, warning]);

      if (logSecurityViolations) {
        console.warn('XSS Prevention:', warning, { field, originalValue: value, sanitizedValue });
      }
    }

    setValuesState(prev => ({ ...prev, [field]: sanitizedValue }));
  }, [sanitizeOnChange, detectSecurityViolations, logSecurityViolations]);

  /**
   * Set multiple values at once
   */
  const setValues = useCallback((newValues: Record<string, any>) => {
    const processedValues = sanitizeOnChange ? sanitizeFormData(newValues) : newValues;

    // Check for security violations
    if (detectSecurityViolations) {
      Object.entries(newValues).forEach(([field, value]) => {
        if (typeof value === 'string' && detectCSPViolation(value)) {
          const warning = `Security violation detected in field: ${field}`;
          setSecurityWarnings(prev => [...prev, warning]);

          if (logSecurityViolations) {
            console.warn('XSS Prevention:', warning, { field, originalValue: value });
          }
        }
      });
    }

    setValuesState(prev => ({ ...prev, ...processedValues }));
  }, [sanitizeOnChange, detectSecurityViolations, logSecurityViolations]);

  /**
   * Mark field as touched
   */
  const setFieldTouched = useCallback((field: string, isTouched = true) => {
    setTouched(prev => ({ ...prev, [field]: isTouched }));
  }, []);

  /**
   * Validate a single field
   */
  const validateField = useCallback((field: string, value: any): ValidationResult => {
    const rule = validationRules[field];
    if (!rule) return { isValid: true };

    // Required validation
    if (rule.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      return { isValid: false, error: `${field} is required` };
    }

    if (!value) return { isValid: true };

    // Type-specific validation
    switch (rule.type) {
      case 'email':
        return validateEmailEnhanced(value);
      case 'username':
        return validateUsername(value);
      case 'publicKey':
        return validatePublicKey(value);
      case 'amount':
        return validateSOLAmount(value.toString());
      case 'richText':
        return validateRichText(value);
      case 'number':
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
          return { isValid: false, error: `${field} must be a valid number` };
        }
        return { isValid: true, sanitizedValue: numValue };
      default:
        break;
    }

    // Length validation
    if (rule.minLength && value.length < rule.minLength) {
      return {
        isValid: false,
        error: `${field} must be at least ${rule.minLength} characters`
      };
    }

    if (rule.maxLength && value.length > rule.maxLength) {
      return {
        isValid: false,
        error: `${field} must be no more than ${rule.maxLength} characters`
      };
    }

    // Pattern validation
    if (rule.pattern && !rule.pattern.test(value)) {
      return { isValid: false, error: `${field} format is invalid` };
    }

    // Custom validation
    if (rule.custom) {
      return rule.custom(value);
    }

    return { isValid: true };
  }, [validationRules]);

  /**
   * Validate all fields
   */
  const validateAll = useCallback(() => {
    const newErrors: ValidationError[] = [];
    const newSecurityWarnings: string[] = [];

    Object.entries(values).forEach(([field, value]) => {
      const result = validateField(field, value);

      if (!result.isValid && result.error) {
        newErrors.push({
          field,
          message: result.error,
          securityWarning: !!result.securityWarnings?.length
        });
      }

      if (result.securityWarnings) {
        newSecurityWarnings.push(...result.securityWarnings);
      }
    });

    setErrors(newErrors);
    setSecurityWarnings(newSecurityWarnings);

    return newErrors.length === 0;
  }, [values, validateField]);

  /**
   * Get field error
   */
  const getFieldError = useCallback((field: string) => {
    return errors.find(error => error.field === field);
  }, [errors]);

  /**
   * Check if field is valid
   */
  const isFieldValid = useCallback((field: string) => {
    return !errors.some(error => error.field === field);
  }, [errors]);

  /**
   * Check if form is valid
   */
  const isValid = useMemo(() => {
    return errors.length === 0;
  }, [errors]);

  /**
   * Get sanitized values
   */
  const getSanitizedValues = useCallback(() => {
    return sanitizeFormData(values);
  }, [values]);

  /**
   * Reset form
   */
  const reset = useCallback(() => {
    const sanitizedInitialValues = sanitizeOnChange
      ? sanitizeFormData(initialValues)
      : initialValues;

    setValuesState(sanitizedInitialValues);
    setErrors([]);
    setTouched({});
    setSecurityWarnings([]);
  }, [initialValues, sanitizeOnChange]);

  /**
   * Clear security warnings
   */
  const clearSecurityWarnings = useCallback(() => {
    setSecurityWarnings([]);
  }, []);

  return {
    values,
    errors,
    touched,
    securityWarnings,
    setValue,
    setValues,
    setFieldTouched,
    validateField,
    validateAll,
    getFieldError,
    isFieldValid,
    isValid,
    getSanitizedValues,
    reset,
    clearSecurityWarnings
  };
};

/**
 * Hook for handling secure form submission
 */
export const useSecureFormSubmission = <T = any>(
  onSubmit: (data: T) => Promise<void> | void,
  validationRules: ValidationRules = {}
) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = useCallback(async (data: T) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Sanitize all form data before submission
      const sanitizedData = sanitizeFormData(data);

      // Log security information
      const hasSecurityIssues = Object.values(sanitizedData).some(value =>
        typeof value === 'string' && detectCSPViolation(value)
      );

      if (hasSecurityIssues) {
        console.warn('Security issues detected in form submission', sanitizedData);
      }

      await onSubmit(sanitizedData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Submission failed';
      setSubmitError(errorMessage);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [onSubmit]);

  return {
    handleSubmit,
    isSubmitting,
    submitError,
    clearSubmitError: useCallback(() => setSubmitError(null), [])
  };
};
