export const formatCurrency = (value, decimals = 0, maxDecimals) => {
  if (typeof value !== 'number' || isNaN(value)) {
    return '₪0';
  }
  
  return `₪${value.toLocaleString('he-IL', { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: maxDecimals !== undefined ? maxDecimals : decimals 
  })}`;
};

export const formatNumber = (value, decimals = 2) => {
  if (typeof value !== 'number' || isNaN(value)) {
    return '0';
  }
  
  return value.toLocaleString('he-IL', { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  });
};

export const formatPercentage = (value, decimals = 2) => {
  if (typeof value !== 'number' || isNaN(value)) {
    return '0%';
  }
  
  return `${value.toLocaleString('he-IL', { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  })}%`;
};