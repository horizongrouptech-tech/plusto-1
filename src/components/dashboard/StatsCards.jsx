import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatLargeNumber } from "@/components/utils/currencyFormatter";

export default function StatsCards({ title, value, icon: Icon, bgColor, trend, isLargeNumber = false }) {
  const formatValue = (val) => {
    // If it's already a formatted string (contains ₪), return as is
    if (typeof val === 'string' && val.includes('₪')) {
      return val;
    }
    
    // If it's a number, format it appropriately
    if (typeof val === 'number') {
      return isLargeNumber ? formatLargeNumber(val) : formatCurrency(val);
    }
    
    // Try to parse as number if it's a string number
    const numVal = parseFloat(val);
    if (!isNaN(numVal)) {
      return isLargeNumber ? formatLargeNumber(numVal) : formatCurrency(numVal);
    }
    
    // Return as is if not a currency value
    return val;
  };

  return (
    <Card className="card-horizon border-0 shadow-lg overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-horizon-accent mb-2">{title}</p>
            <div className="text-2xl font-bold text-horizon-text mb-1">{formatValue(value)}</div>
            {trend && <p className="text-xs text-horizon-accent">{trend}</p>}
          </div>
          <div className={`p-3 rounded-xl ${bgColor || 'bg-horizon-primary'} shadow-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}