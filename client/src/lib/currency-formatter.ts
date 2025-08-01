// 💰 Currency Formatter - Rial to Toman Conversion Utility
// DA VINCI v9.0 CRM Enhancement - Critical Fix for Currency Display

/**
 * Comprehensive currency formatting utility for Persian financial system
 * Handles conversion between Rials and Tomans with proper Persian number formatting
 */

import { toPersianDigits } from './persian-date';

export class CurrencyFormatter {
  /**
   * Convert Rials to Tomans (divide by 10)
   */
  static convertRialsToTomans(rialAmount: number | string): number {
    const numericAmount = typeof rialAmount === 'string' ? parseFloat(rialAmount) : rialAmount;
    if (isNaN(numericAmount)) return 0;
    return numericAmount / 10;
  }

  /**
   * Format amount to Tomans with thousand separators
   */
  static formatToTomans(rialAmount: number | string): string {
    const tomanAmount = this.convertRialsToTomans(rialAmount);
    return new Intl.NumberFormat('en-US').format(tomanAmount);
  }

  /**
   * Format amount to Persian Tomans with Persian digits
   */
  static formatToPersianTomans(rialAmount: number | string): string {
    const formattedAmount = this.formatToTomans(rialAmount);
    return toPersianDigits(formattedAmount);
  }

  /**
   * Format currency with unit display
   */
  static formatCurrency(
    amount: number | string, 
    unit: 'rial' | 'toman' = 'toman', 
    locale: 'fa-IR' | 'en-US' = 'fa-IR'
  ): string {
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numericAmount)) return '۰ تومان';

    let finalAmount = numericAmount;
    let unitText = '';

    if (unit === 'toman') {
      finalAmount = unit === 'toman' ? this.convertRialsToTomans(numericAmount) : numericAmount;
      unitText = locale === 'fa-IR' ? 'تومان' : 'Toman';
    } else {
      unitText = locale === 'fa-IR' ? 'ریال' : 'Rial';
    }

    const formatted = new Intl.NumberFormat('en-US').format(finalAmount);
    const localizedFormatted = locale === 'fa-IR' ? toPersianDigits(formatted) : formatted;
    
    return `${localizedFormatted} ${unitText}`;
  }

  /**
   * Format currency for CRM display (always shows Tomans)
   */
  static formatForCRM(rialAmount: number | string): string {
    return this.formatCurrency(rialAmount, 'toman', 'fa-IR');
  }

  /**
   * Format compact currency for dashboard widgets
   */
  static formatCompact(rialAmount: number | string): string {
    const tomanAmount = this.convertRialsToTomans(rialAmount);
    
    if (tomanAmount >= 1000000) {
      const millions = tomanAmount / 1000000;
      return toPersianDigits(millions.toFixed(1)) + ' میلیون تومان';
    } else if (tomanAmount >= 1000) {
      const thousands = tomanAmount / 1000;
      return toPersianDigits(thousands.toFixed(1)) + ' هزار تومان';
    } else {
      return toPersianDigits(tomanAmount.toFixed(0)) + ' تومان';
    }
  }

  /**
   * Validate currency input
   */
  static validateCurrencyInput(input: string): boolean {
    const cleaned = input.replace(/[,\s]/g, '');
    return !isNaN(parseFloat(cleaned)) && parseFloat(cleaned) >= 0;
  }

  /**
   * Parse currency input from user (handles Persian digits)
   */
  static parseCurrencyInput(input: string): number {
    // Convert Persian digits to English
    const englishInput = input
      .replace(/[۰-۹]/g, (match) => String.fromCharCode(match.charCodeAt(0) - '۰'.charCodeAt(0) + '0'.charCodeAt(0)))
      .replace(/[,\s]/g, '');
    
    return parseFloat(englishInput) || 0;
  }
}

// Legacy function exports for backward compatibility
export const formatToTomans = CurrencyFormatter.formatToTomans;
export const formatToPersianTomans = CurrencyFormatter.formatToPersianTomans;
export const convertRialsToTomans = CurrencyFormatter.convertRialsToTomans;
export const formatForCRM = CurrencyFormatter.formatForCRM;
export const formatCompact = CurrencyFormatter.formatCompact;