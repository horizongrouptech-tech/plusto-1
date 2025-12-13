import React from 'react';
import { NumericFormat } from 'react-number-format';

/**
 * קומפוננטת עזר לעיצוב מספרים עם פורמט עברית
 */
export function FormattedNumber({ value, prefix = '', suffix = '', decimalScale = 0, displayType = 'text', className = '' }) {
  return (
    <NumericFormat
      value={value}
      displayType={displayType}
      thousandSeparator=","
      decimalSeparator="."
      prefix={prefix}
      suffix={suffix}
      decimalScale={decimalScale}
      fixedDecimalScale={decimalScale > 0}
      className={className}
      renderText={(formattedValue) => <span>{formattedValue}</span>}
    />
  );
}

/**
 * קומפוננטת עזר לעיצוב מטבע
 */
export function FormattedCurrency({ value, displayType = 'text', className = '' }) {
  return (
    <NumericFormat
      value={value}
      displayType={displayType}
      thousandSeparator=","
      decimalSeparator="."
      prefix="₪"
      decimalScale={0}
      fixedDecimalScale={false}
      className={className}
      renderText={(formattedValue) => <span>{formattedValue}</span>}
    />
  );
}

/**
 * קומפוננטת עזר לעיצוב אחוזים
 */
export function FormattedPercentage({ value, displayType = 'text', className = '' }) {
  return (
    <NumericFormat
      value={value}
      displayType={displayType}
      decimalScale={1}
      fixedDecimalScale={true}
      suffix="%"
      className={className}
      renderText={(formattedValue) => <span>{formattedValue}</span>}
    />
  );
}

/**
 * פונקציה לפורמט מספרים גדולים עם K/M
 */
export function formatLargeNumber(value) {
  if (value === null || value === undefined) return '0';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(0)}K`;
  }
  return Math.round(num).toLocaleString('he-IL');
}

/**
 * פונקציה לפורמט מטבע
 */
export function formatCurrency(value) {
  if (value === null || value === undefined) return '₪0';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return `₪${Math.round(num).toLocaleString('he-IL')}`;
}