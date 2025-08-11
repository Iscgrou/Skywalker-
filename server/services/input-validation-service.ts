/**
 * Comprehensive Input Validation Service
 * Handles edge cases, security vulnerabilities, and data sanitization
 */

import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

interface ValidationRule {
  field: string;
  type: 'string' | 'number' | 'email' | 'phone' | 'date' | 'url' | 'json' | 'html' | 'persian' | 'code';
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  sanitize?: boolean;
  allowEmpty?: boolean;
  customValidator?: (value: any) => boolean | string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData: Record<string, any>;
  warnings: string[];
}

class InputValidationService {
  private domPurify: any;

  constructor() {
    // Initialize DOMPurify for server-side HTML sanitization
    const window = new JSDOM('').window;
    this.domPurify = DOMPurify(window as any);
  }

  /**
   * Comprehensive validation with security hardening
   */
  validate(data: Record<string, any>, rules: ValidationRule[]): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      sanitizedData: {},
      warnings: []
    };

    // Pre-validation security checks
    this.performSecurityChecks(data, result);

    // Process each field according to its rules
    for (const rule of rules) {
      const value = data[rule.field];
      const fieldResult = this.validateField(value, rule);
      
      if (!fieldResult.isValid) {
        result.isValid = false;
        result.errors.push(...fieldResult.errors.map(err => `${rule.field}: ${err}`));
      }
      
      result.sanitizedData[rule.field] = fieldResult.sanitizedValue;
      
      if (fieldResult.warnings.length > 0) {
        result.warnings.push(...fieldResult.warnings.map(warn => `${rule.field}: ${warn}`));
      }
    }

    // Post-validation security analysis
    this.performPostValidationChecks(result);

    return result;
  }

  /**
   * Security-first validation for single field
   */
  private validateField(value: any, rule: ValidationRule): {
    isValid: boolean;
    errors: string[];
    sanitizedValue: any;
    warnings: string[];
  } {
    const result: { isValid: boolean; errors: string[]; sanitizedValue: any; warnings: string[] } = {
      isValid: true,
      errors: [],
      sanitizedValue: value,
      warnings: []
    };

    // Handle null/undefined values
    if (value === null || value === undefined || value === '') {
      if (rule.required && !rule.allowEmpty) {
        result.isValid = false;
        result.errors.push('Field is required');
        return result;
      }
      result.sanitizedValue = rule.allowEmpty ? '' : null;
      return result;
    }

    // Type-specific validation and sanitization
    switch (rule.type) {
      case 'string':
        return this.validateString(value, rule);
      
      case 'number':
        return this.validateNumber(value, rule);
      
      case 'email':
        return this.validateEmail(value, rule);
      
      case 'phone':
        return this.validatePhone(value, rule);
      
      case 'date':
        return this.validateDate(value, rule);
      
      case 'url':
        return this.validateUrl(value, rule);
      
      case 'json':
        return this.validateJson(value, rule);
      
      case 'html':
        return this.validateHtml(value, rule);
      
      case 'persian':
        return this.validatePersian(value, rule);
      
      case 'code':
        return this.validateCode(value, rule);
      
      default:
        result.warnings.push(`Unknown validation type: ${rule.type}`);
        return result;
    }
  }

  /**
   * String validation with XSS and injection prevention
   */
  private validateString(value: any, rule: ValidationRule): any {
    const result: { isValid: boolean; errors: string[]; sanitizedValue: any; warnings: string[] } = { isValid: true, errors: [], sanitizedValue: value, warnings: [] };
    
    // Convert to string
    let strValue = String(value);
    
    // Security checks for malicious patterns
    const maliciousPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /eval\s*\(/gi,
      /expression\s*\(/gi,
      /vbscript:/gi,
      /data:text\/html/gi
    ];
    
    for (const pattern of maliciousPatterns) {
      if (pattern.test(strValue)) {
        result.warnings.push('Potentially malicious content detected and removed');
        strValue = strValue.replace(pattern, '');
      }
    }
    
    // Length validation
    if (rule.min !== undefined && strValue.length < rule.min) {
      result.isValid = false;
      result.errors.push(`Minimum length is ${rule.min}`);
    }
    
    if (rule.max !== undefined && strValue.length > rule.max) {
      result.isValid = false;
      result.errors.push(`Maximum length is ${rule.max}`);
    }
    
    // Pattern validation
    if (rule.pattern && !rule.pattern.test(strValue)) {
      result.isValid = false;
      result.errors.push('Invalid format');
    }
    
    // Sanitization
    if (rule.sanitize) {
      strValue = this.sanitizeString(strValue);
    }
    
    // Custom validation
    if (rule.customValidator) {
      const customResult = rule.customValidator(strValue);
      if (customResult !== true) {
        result.isValid = false;
        result.errors.push(typeof customResult === 'string' ? customResult : 'Custom validation failed');
      }
    }
    
    result.sanitizedValue = strValue;
    return result;
  }

  /**
   * Numeric validation with overflow protection
   */
  private validateNumber(value: any, rule: ValidationRule): any {
    const result: { isValid: boolean; errors: string[]; sanitizedValue: any; warnings: string[] } = { isValid: true, errors: [], sanitizedValue: value, warnings: [] };
    
    // Convert to number
    const numValue = Number(value);
    
    // Check for valid number
    if (isNaN(numValue) || !isFinite(numValue)) {
      result.isValid = false;
      result.errors.push('Invalid number');
      return result;
    }
    
    // Check for safe integer range to prevent overflow
    if (!Number.isSafeInteger(numValue) && Number.isInteger(numValue)) {
      result.warnings.push('Number exceeds safe integer range');
    }
    
    // Range validation
    if (rule.min !== undefined && numValue < rule.min) {
      result.isValid = false;
      result.errors.push(`Minimum value is ${rule.min}`);
    }
    
    if (rule.max !== undefined && numValue > rule.max) {
      result.isValid = false;
      result.errors.push(`Maximum value is ${rule.max}`);
    }
    
    // Custom validation
    if (rule.customValidator) {
      const customResult = rule.customValidator(numValue);
      if (customResult !== true) {
        result.isValid = false;
        result.errors.push(typeof customResult === 'string' ? customResult : 'Custom validation failed');
      }
    }
    
    result.sanitizedValue = numValue;
    return result;
  }

  /**
   * Email validation with comprehensive security checks
   */
  private validateEmail(value: any, rule: ValidationRule): any {
    const result: { isValid: boolean; errors: string[]; sanitizedValue: any; warnings: string[] } = { isValid: true, errors: [], sanitizedValue: value, warnings: [] };
    
    const strValue = String(value).toLowerCase().trim();
    
    // Basic email format validation
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!emailRegex.test(strValue)) {
      result.isValid = false;
      result.errors.push('Invalid email format');
      return result;
    }
    
    // Length checks
    if (strValue.length > 320) { // RFC 5321 limit
      result.isValid = false;
      result.errors.push('Email too long');
    }
    
    const [localPart, domain] = strValue.split('@');
    
    if (localPart.length > 64) { // RFC 5321 limit
      result.isValid = false;
      result.errors.push('Email local part too long');
    }
    
    // Check for suspicious patterns
    const suspiciousPatterns = [
      /\+.*\+/, // Multiple plus signs
      /\.{2,}/, // Consecutive dots
      /^\./, // Starts with dot
      /\.$/ // Ends with dot
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(localPart)) {
        result.warnings.push('Potentially suspicious email format');
        break;
      }
    }
    
    result.sanitizedValue = strValue;
    return result;
  }

  /**
   * Phone number validation with Persian support
   */
  private validatePhone(value: any, rule: ValidationRule): any {
    const result: { isValid: boolean; errors: string[]; sanitizedValue: any; warnings: string[] } = { isValid: true, errors: [], sanitizedValue: value, warnings: [] };
    
    let strValue = String(value).trim();
    
    // Remove non-digit characters except +
    const cleanedValue = strValue.replace(/[^\d+]/g, '');
    
    // Persian phone patterns
    const persianMobileRegex = /^(\+98|0)?9\d{9}$/;
    const persianLandlineRegex = /^(\+98|0)?\d{8,11}$/;
    
    if (persianMobileRegex.test(cleanedValue)) {
      // Normalize to +989xxxxxxxxx format
      const digits = cleanedValue.replace(/^\+98|^0/, '');
      result.sanitizedValue = `+98${digits}`;
    } else if (persianLandlineRegex.test(cleanedValue)) {
      result.sanitizedValue = cleanedValue;
    } else {
      result.isValid = false;
      result.errors.push('Invalid phone number format');
    }
    
    return result;
  }

  /**
   * Date validation with Persian calendar support
   */
  private validateDate(value: any, rule: ValidationRule): any {
    const result: { isValid: boolean; errors: string[]; sanitizedValue: any; warnings: string[] } = { isValid: true, errors: [], sanitizedValue: value, warnings: [] };
    
    const strValue = String(value).trim();
    
    // Persian date pattern (1403/01/01)
    const persianDateRegex = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/;
    const persianMatch = persianDateRegex.exec(strValue);
    
    if (persianMatch) {
      const [, year, month, day] = persianMatch;
      const yearNum = parseInt(year);
      const monthNum = parseInt(month);
      const dayNum = parseInt(day);
      
      // Validate Persian date ranges
      if (yearNum < 1300 || yearNum > 1500) {
        result.isValid = false;
        result.errors.push('Invalid Persian year');
      }
      
      if (monthNum < 1 || monthNum > 12) {
        result.isValid = false;
        result.errors.push('Invalid Persian month');
      }
      
      if (dayNum < 1 || dayNum > 31) {
        result.isValid = false;
        result.errors.push('Invalid Persian day');
      }
      
      // Normalize format
      result.sanitizedValue = `${year}/${month.padStart(2, '0')}/${day.padStart(2, '0')}`;
    } else {
      // Try to parse as Gregorian date
      const date = new Date(strValue);
      if (isNaN(date.getTime())) {
        result.isValid = false;
        result.errors.push('Invalid date format');
      } else {
        result.sanitizedValue = date.toISOString().split('T')[0];
      }
    }
    
    return result;
  }

  /**
   * URL validation with security checks
   */
  private validateUrl(value: any, rule: ValidationRule): any {
    const result: { isValid: boolean; errors: string[]; sanitizedValue: any; warnings: string[] } = { isValid: true, errors: [], sanitizedValue: value, warnings: [] };
    
    const strValue = String(value).trim();
    
    try {
      const url = new URL(strValue);
      
      // Check for allowed protocols
      const allowedProtocols = ['http:', 'https:', 'ftp:', 'ftps:'];
      if (!allowedProtocols.includes(url.protocol)) {
        result.isValid = false;
        result.errors.push('Invalid URL protocol');
        return result;
      }
      
      // Check for suspicious patterns
      const suspiciousPatterns = [
        /javascript:/i,
        /data:/i,
        /vbscript:/i,
        /file:/i
      ];
      
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(strValue)) {
          result.isValid = false;
          result.errors.push('Potentially malicious URL');
          return result;
        }
      }
      
      result.sanitizedValue = url.toString();
    } catch (error) {
      result.isValid = false;
      result.errors.push('Invalid URL format');
    }
    
    return result;
  }

  /**
   * JSON validation with depth and size limits
   */
  private validateJson(value: any, rule: ValidationRule): any {
    const result: { isValid: boolean; errors: string[]; sanitizedValue: any; warnings: string[] } = { isValid: true, errors: [], sanitizedValue: value, warnings: [] };
    
    let jsonData: any;
    
    if (typeof value === 'string') {
      try {
        jsonData = JSON.parse(value);
      } catch (error) {
        result.isValid = false;
        result.errors.push('Invalid JSON format');
        return result;
      }
    } else {
      jsonData = value;
    }
    
    // Check JSON depth to prevent stack overflow
    const maxDepth = 10;
    if (this.getObjectDepth(jsonData) > maxDepth) {
      result.isValid = false;
      result.errors.push(`JSON depth exceeds maximum of ${maxDepth}`);
    }
    
    // Check serialized size
    const serialized = JSON.stringify(jsonData);
    const maxSize = rule.max || 100000; // 100KB default
    
    if (serialized.length > maxSize) {
      result.isValid = false;
      result.errors.push(`JSON size exceeds maximum of ${maxSize} characters`);
    }
    
    result.sanitizedValue = jsonData;
    return result;
  }

  /**
   * HTML validation and sanitization
   */
  private validateHtml(value: any, rule: ValidationRule): any {
    const result: { isValid: boolean; errors: string[]; sanitizedValue: any; warnings: string[] } = { isValid: true, errors: [], sanitizedValue: value, warnings: [] };
    
    const strValue = String(value);
    
    // Sanitize HTML
    const sanitized = this.domPurify.sanitize(strValue, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li'],
      ALLOWED_ATTR: []
    });
    
    if (sanitized !== strValue) {
      result.warnings.push('HTML content was sanitized');
    }
    
    result.sanitizedValue = sanitized;
    return result;
  }

  /**
   * Persian text validation
   */
  private validatePersian(value: any, rule: ValidationRule): any {
    const result: { isValid: boolean; errors: string[]; sanitizedValue: any; warnings: string[] } = { isValid: true, errors: [], sanitizedValue: value, warnings: [] };
    
    const strValue = String(value);
    
    // Persian characters regex
    const persianRegex = /^[\u0600-\u06FF\u0750-\u077F\u0590-\u05FF\uFE70-\uFEFF\s\d\u200C\u200D]*$/;
    
    if (!persianRegex.test(strValue)) {
      result.warnings.push('Non-Persian characters detected');
    }
    
    // Normalize Persian text
    const normalized = strValue
      .replace(/ي/g, 'ی')
      .replace(/ك/g, 'ک')
      .replace(/\u200B/g, '') // Remove zero-width space
      .trim();
    
    result.sanitizedValue = normalized;
    return result;
  }

  /**
   * Code/identifier validation
   */
  private validateCode(value: any, rule: ValidationRule): any {
    const result: { isValid: boolean; errors: string[]; sanitizedValue: any; warnings: string[] } = { isValid: true, errors: [], sanitizedValue: value, warnings: [] };
    
    const strValue = String(value).trim().toUpperCase();
    
    // Allow only alphanumeric and specific symbols
    const codeRegex = /^[A-Z0-9_-]+$/;
    
    if (!codeRegex.test(strValue)) {
      result.isValid = false;
      result.errors.push('Code contains invalid characters');
    }
    
    result.sanitizedValue = strValue;
    return result;
  }

  /**
   * Pre-validation security checks
   */
  private performSecurityChecks(data: Record<string, any>, result: ValidationResult): void {
    // Check for prototype pollution
    const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
    for (const key of dangerousKeys) {
      if (key in data) {
        result.warnings.push(`Potentially dangerous key detected: ${key}`);
        delete data[key];
      }
    }
    
    // Check data size
    const dataSize = JSON.stringify(data).length;
    if (dataSize > 1000000) { // 1MB limit
      result.isValid = false;
      result.errors.push('Request data too large');
    }
  }

  /**
   * Post-validation security analysis
   */
  private performPostValidationChecks(result: ValidationResult): void {
    // Additional security checks on sanitized data can be added here
    // For now, this is a placeholder for future enhancements
  }

  /**
   * Utility: Get object depth
   */
  private getObjectDepth(obj: any, depth: number = 0): number {
    if (obj === null || typeof obj !== 'object') {
      return depth;
    }
    
    if (depth > 20) { // Prevent infinite recursion
      return depth;
    }
    
    let maxChildDepth = depth;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const childDepth = this.getObjectDepth(obj[key], depth + 1);
        maxChildDepth = Math.max(maxChildDepth, childDepth);
      }
    }
    
    return maxChildDepth;
  }

  /**
   * Utility: Sanitize string for basic XSS prevention
   */
  private sanitizeString(str: string): string {
    return str
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  }

  /**
   * Quick validation for common use cases
   */
  static quickValidate = {
    email: (email: string) => {
      const service = new InputValidationService();
      return service.validate({ email }, [{ field: 'email', type: 'email', required: true }]);
    },
    
    phone: (phone: string) => {
      const service = new InputValidationService();
      return service.validate({ phone }, [{ field: 'phone', type: 'phone', required: true }]);
    },
    
    persianText: (text: string, maxLength = 255) => {
      const service = new InputValidationService();
      return service.validate({ text }, [{ 
        field: 'text', 
        type: 'persian', 
        required: true, 
        max: maxLength,
        sanitize: true 
      }]);
    },
    
    code: (code: string, minLength = 3, maxLength = 20) => {
      const service = new InputValidationService();
      return service.validate({ code }, [{ 
        field: 'code', 
        type: 'code', 
        required: true, 
        min: minLength,
        max: maxLength 
      }]);
    }
  };
}

export default InputValidationService;
export type { ValidationRule, ValidationResult };
