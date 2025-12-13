/**
 * Utility functions for consistent currency formatting across the application
 */

/**
 * Format a number as Israeli Shekel currency
 * @param {number} amount - The amount to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, options = {}) => {
  const {
    showSymbol = true,
    showDecimals = false,
    locale = 'he-IL'
  } = options;

  if (amount === null || amount === undefined || isNaN(amount)) {
    return showSymbol ? '₪0' : '0';
  }

  const numericAmount = parseFloat(amount);
  
  const formatOptions = {
    style: 'decimal',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  };

  const formattedNumber = new Intl.NumberFormat(locale, formatOptions).format(numericAmount);
  
  return showSymbol ? `₪${formattedNumber}` : formattedNumber;
};

/**
 * Format a number as percentage
 * @param {number} value - The value to format as percentage
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} Formatted percentage string
 */
export const formatPercentage = (value, decimals = 1) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0%';
  }

  return `${parseFloat(value).toFixed(decimals)}%`;
};

/**
 * Format large numbers with K/M/B suffixes
 * @param {number} amount - The amount to format
 * @param {boolean} showCurrency - Whether to show currency symbol
 * @returns {string} Formatted string with suffix
 */
export const formatLargeNumber = (amount, showCurrency = true) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return showCurrency ? '₪0' : '0';
  }

  const numericAmount = parseFloat(amount);
  const absAmount = Math.abs(numericAmount);
  
  let formattedValue;
  
  if (absAmount >= 1000000000) {
    formattedValue = (numericAmount / 1000000000).toFixed(1) + 'B';
  } else if (absAmount >= 1000000) {
    formattedValue = (numericAmount / 1000000).toFixed(1) + 'M';
  } else if (absAmount >= 1000) {
    formattedValue = (numericAmount / 1000).toFixed(1) + 'K';
  } else {
    formattedValue = numericAmount.toLocaleString('he-IL');
  }
  
  return showCurrency ? `₪${formattedValue}` : formattedValue;
};